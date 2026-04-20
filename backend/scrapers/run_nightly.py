"""Nightly scraper orchestration for InternshipMatch.

Run via Railway cron: python -m backend.scrapers.run_nightly

Executes all scraper adapters, normalizes results, matches firm names,
diffs against existing postings, and applies inserts/updates/closes.
Each adapter runs in its own try/except so one failure never breaks
the pipeline.
"""

from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone
from typing import Any

from backend.app.db import (
    bulk_insert_postings,
    get_all_firms,
    get_open_postings,
    get_service_client,
)
from backend.scrapers.adapters.firecrawl_generic import FirecrawlGenericAdapter
from backend.scrapers.adapters.jsearch_adapter import JSearchAdapter
from backend.scrapers.base import RawPosting, ScraperResult
from backend.scrapers.diff_engine import build_close_updates, diff_postings
from backend.scrapers.firm_matcher import build_firm_name_set, match_firm
from backend.scrapers.normalizer import normalize_posting

# Configure structured logging.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def run_nightly() -> list[ScraperResult]:
    """Execute the full nightly scraper pipeline.

    Steps:
    1. Load all firms from the database.
    2. Run JSearch adapter for aggregated job board postings.
    3. Run Firecrawl adapter for direct career page scraping.
    4. Normalize all raw postings.
    5. Match firm names to firm IDs.
    6. Diff against existing postings.
    7. Insert new, update changed, close disappeared.
    8. Update last_scraped_at on firms.

    Returns:
        List of ScraperResult objects summarizing each adapter's run.
    """
    logger.info("nightly.pipeline.started", extra={})
    pipeline_start: datetime = datetime.now(timezone.utc)
    results: list[ScraperResult] = []

    # ── Step 1: Load firms ──────────────────────────────────────────
    try:
        firms: list[dict[str, Any]] = get_all_firms()
        logger.info("nightly.firms.loaded", extra={"count": len(firms)})
    except Exception as exc:
        logger.error("nightly.firms.load_failed", extra={"error": str(exc)})
        return results

    firm_names: set[str] = build_firm_name_set(firms)

    # ── Step 2: Run JSearch adapter ─────────────────────────────────
    jsearch_result = _run_jsearch(firm_names)
    results.append(jsearch_result)

    # ── Step 3: Run Firecrawl adapter ───────────────────────────────
    firecrawl_result = _run_firecrawl(firms)
    results.append(firecrawl_result)

    # ── Step 4-5: Normalize and match ───────────────────────────────
    all_raw: list[RawPosting] = []
    for result in results:
        if hasattr(result, "_raw_postings"):
            all_raw.extend(result._raw_postings)  # type: ignore[attr-defined]

    normalized: list[dict] = []
    unmatched_count: int = 0

    for raw in all_raw:
        # Use pre-assigned firm_id if available, otherwise match.
        firm_id: str | None = raw.firm_id
        if not firm_id:
            matched_firm = match_firm(raw.firm_name, firms)
            if matched_firm:
                firm_id = matched_firm["id"]
            else:
                unmatched_count += 1
                continue

        posting = normalize_posting(raw, firm_id)
        normalized.append(posting)

    logger.info(
        "nightly.normalize.complete",
        extra={
            "normalized": len(normalized),
            "unmatched": unmatched_count,
        },
    )

    if not normalized:
        logger.info("nightly.pipeline.no_postings", extra={})
        _log_pipeline_complete(pipeline_start, results)
        return results

    # ── Step 6: Diff against existing ───────────────────────────────
    try:
        existing: list[dict] = get_open_postings()
    except Exception as exc:
        logger.error("nightly.existing.load_failed", extra={"error": str(exc)})
        existing = []

    to_insert, to_update, to_close = diff_postings(normalized, existing)

    # ── Step 7: Apply changes ───────────────────────────────────────
    if to_insert:
        try:
            bulk_insert_postings(to_insert)
            logger.info("nightly.insert.complete", extra={"count": len(to_insert)})
        except Exception as exc:
            logger.error("nightly.insert.failed", extra={"error": str(exc)})

    if to_update:
        try:
            bulk_insert_postings(to_update)  # upsert handles updates
            logger.info("nightly.update.complete", extra={"count": len(to_update)})
        except Exception as exc:
            logger.error("nightly.update.failed", extra={"error": str(exc)})

    if to_close:
        try:
            close_updates = build_close_updates(to_close)
            client = get_service_client()
            for update in close_updates:
                client.table("postings").update(
                    {"closed_at": update["closed_at"]}
                ).eq("id", update["id"]).execute()
            logger.info("nightly.close.complete", extra={"count": len(to_close)})
        except Exception as exc:
            logger.error("nightly.close.failed", extra={"error": str(exc)})

    # ── Step 8: Update last_scraped_at on firms ─────────────────────
    _update_firms_scraped_at(firms)

    # ── Done ────────────────────────────────────────────────────────
    _log_pipeline_complete(pipeline_start, results)
    return results


def _run_jsearch(firm_names: set[str]) -> ScraperResult:
    """Run the JSearch adapter and return a ScraperResult.

    Args:
        firm_names: Set of lowercase firm names for filtering.

    Returns:
        ScraperResult summarizing the JSearch run.
    """
    start: datetime = datetime.now(timezone.utc)
    result = ScraperResult(source="jsearch", started_at=start)

    try:
        adapter = JSearchAdapter()
        raw_postings: list[RawPosting] = adapter.scrape(firm_names=firm_names)
        result.postings_found = len(raw_postings)
        result.completed_at = datetime.now(timezone.utc)
        result._raw_postings = raw_postings  # type: ignore[attr-defined]
        logger.info(
            "nightly.jsearch.complete",
            extra={"postings": len(raw_postings)},
        )
    except Exception as exc:
        result.success = False
        result.errors.append(str(exc))
        result.completed_at = datetime.now(timezone.utc)
        result._raw_postings = []  # type: ignore[attr-defined]
        logger.error("nightly.jsearch.failed", extra={"error": str(exc)})

    return result


def _run_firecrawl(firms: list[dict[str, Any]]) -> ScraperResult:
    """Run the Firecrawl adapter and return a ScraperResult.

    Args:
        firms: List of firm dicts from the registry.

    Returns:
        ScraperResult summarizing the Firecrawl run.
    """
    start: datetime = datetime.now(timezone.utc)
    result = ScraperResult(source="career_page", started_at=start)

    # Only scrape firms that have a careers_url.
    firms_with_url = [f for f in firms if f.get("careers_url")]

    try:
        adapter = FirecrawlGenericAdapter()
        raw_postings: list[RawPosting] = adapter.scrape(firms=firms_with_url)
        result.postings_found = len(raw_postings)
        result.completed_at = datetime.now(timezone.utc)
        result._raw_postings = raw_postings  # type: ignore[attr-defined]
        logger.info(
            "nightly.firecrawl.complete",
            extra={"postings": len(raw_postings), "firms_scraped": len(firms_with_url)},
        )
    except Exception as exc:
        result.success = False
        result.errors.append(str(exc))
        result.completed_at = datetime.now(timezone.utc)
        result._raw_postings = []  # type: ignore[attr-defined]
        logger.error("nightly.firecrawl.failed", extra={"error": str(exc)})

    return result


def _update_firms_scraped_at(firms: list[dict[str, Any]]) -> None:
    """Update last_scraped_at timestamp on all firms.

    Args:
        firms: List of firm dicts from the registry.
    """
    now: str = datetime.now(timezone.utc).isoformat()
    try:
        client = get_service_client()
        for firm in firms:
            client.table("firms").update(
                {"last_scraped_at": now}
            ).eq("id", firm["id"]).execute()
        logger.info("nightly.firms.updated_scraped_at", extra={"count": len(firms)})
    except Exception as exc:
        logger.error("nightly.firms.update_scraped_at_failed", extra={"error": str(exc)})


def _log_pipeline_complete(
    start: datetime,
    results: list[ScraperResult],
) -> None:
    """Log a summary of the full pipeline run.

    Args:
        start: Pipeline start timestamp.
        results: List of ScraperResult objects from all adapters.
    """
    end: datetime = datetime.now(timezone.utc)
    duration: float = (end - start).total_seconds()
    total_found: int = sum(r.postings_found for r in results)
    total_errors: int = sum(len(r.errors) for r in results)
    all_success: bool = all(r.success for r in results)

    logger.info(
        "nightly.pipeline.complete",
        extra={
            "duration_seconds": round(duration, 1),
            "total_postings_found": total_found,
            "total_errors": total_errors,
            "all_adapters_success": all_success,
            "adapters_run": len(results),
        },
    )


if __name__ == "__main__":
    run_nightly()
