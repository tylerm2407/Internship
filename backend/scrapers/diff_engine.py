"""Diff engine for InternshipMatch scraper pipeline.

Compares freshly scraped and normalized postings against the existing
postings in the database. Produces three lists:
- to_insert: New postings not yet in the database.
- to_update: Existing postings with changed fields (description, deadline, etc.).
- to_close: IDs of postings that were previously open but no longer appear in scrape results.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Fields to compare when detecting updates. We skip 'posted_at' and 'id'
# since those are immutable, and 'closed_at' since that's managed by the
# diff engine itself.
_COMPARE_FIELDS: list[str] = [
    "title",
    "description",
    "location",
    "application_url",
    "deadline",
    "requirements",
    "role_type",
    "class_year_target",
    "estimated_effort_minutes",
]


def diff_postings(
    new_postings: list[dict],
    existing_postings: list[dict],
) -> tuple[list[dict], list[dict], list[str]]:
    """Compare new postings against existing ones to determine what changed.

    Args:
        new_postings: Normalized posting dicts from the current scrape run.
        existing_postings: Posting dicts currently in the database (open only).

    Returns:
        Tuple of (to_insert, to_update, to_close) where:
        - to_insert: List of new posting dicts to add to the database.
        - to_update: List of existing posting dicts with updated fields.
        - to_close: List of posting IDs that should be marked as closed.
    """
    existing_by_id: dict[str, dict] = {p["id"]: p for p in existing_postings}
    new_by_id: dict[str, dict] = {p["id"]: p for p in new_postings}

    to_insert: list[dict] = []
    to_update: list[dict] = []
    to_close: list[str] = []

    # Find new postings and updated postings.
    for posting_id, posting in new_by_id.items():
        if posting_id not in existing_by_id:
            to_insert.append(posting)
        else:
            existing = existing_by_id[posting_id]
            changes: dict = _detect_changes(existing, posting)
            if changes:
                updated = {**posting, **changes}
                to_update.append(updated)

    # Find postings that disappeared (should be closed).
    for posting_id in existing_by_id:
        if posting_id not in new_by_id:
            to_close.append(posting_id)

    logger.info(
        "scraper.diff.complete",
        extra={
            "new": len(to_insert),
            "updated": len(to_update),
            "closed": len(to_close),
            "unchanged": len(new_by_id) - len(to_insert) - len(to_update),
        },
    )

    return to_insert, to_update, to_close


def _detect_changes(existing: dict, new: dict) -> dict:
    """Compare two posting dicts and return changed fields.

    Args:
        existing: The posting currently in the database.
        new: The freshly scraped and normalized posting.

    Returns:
        Dict of field names to new values for fields that changed.
        Empty dict if nothing changed.
    """
    changes: dict = {}

    for field in _COMPARE_FIELDS:
        old_val = existing.get(field)
        new_val = new.get(field)

        # Normalize None vs empty string.
        if old_val is None and new_val == "":
            continue
        if old_val == "" and new_val is None:
            continue

        # Normalize list comparison (requirements).
        if isinstance(old_val, list) and isinstance(new_val, list):
            if sorted(str(v) for v in old_val) != sorted(str(v) for v in new_val):
                changes[field] = new_val
            continue

        if old_val != new_val:
            changes[field] = new_val

    return changes


def build_close_updates(posting_ids: list[str]) -> list[dict]:
    """Build update dicts to mark postings as closed.

    Args:
        posting_ids: List of posting IDs to close.

    Returns:
        List of dicts with 'id' and 'closed_at' fields for bulk update.
    """
    now: str = datetime.now(timezone.utc).isoformat()
    return [{"id": pid, "closed_at": now} for pid in posting_ids]
