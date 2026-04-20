"""JSearch API adapter for InternshipMatch.

Queries the JSearch API on RapidAPI to find finance internship postings
aggregated from LinkedIn, Indeed, Glassdoor, and other job boards.

Free tier: 100 requests/month. Each search query consumes 1 request.
We run 8 queries x 3 pages = ~24 requests per nightly run.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any

import requests

from backend.scrapers.base import BaseScraper, RawPosting

logger = logging.getLogger(__name__)

# Finance-related keywords used to filter results from generic job boards.
_FINANCE_KEYWORDS: set[str] = {
    "investment banking",
    "sales and trading",
    "equity research",
    "asset management",
    "private equity",
    "quantitative",
    "quant",
    "capital markets",
    "financial advisory",
    "m&a",
    "restructuring",
    "hedge fund",
    "fixed income",
    "wealth management",
}


class JSearchAdapter(BaseScraper):
    """Scraper that pulls finance internship postings from the JSearch API.

    Attributes:
        source_name: Identifier for this scraper source.
        SEARCH_QUERIES: List of search terms targeting finance internship roles.
    """

    source_name: str = "jsearch"

    SEARCH_QUERIES: list[str] = [
        "investment banking intern",
        "investment banking summer analyst",
        "sales and trading intern",
        "equity research intern",
        "asset management intern",
        "private equity intern",
        "quantitative analyst intern",
        "financial advisory intern",
    ]

    def __init__(self, api_key: str | None = None) -> None:
        """Initialize the JSearch adapter.

        Args:
            api_key: RapidAPI key. Falls back to RAPIDAPI_KEY env var.
        """
        self.api_key: str = api_key or os.getenv("RAPIDAPI_KEY", "")
        self.base_url: str = "https://jsearch-cheaper-version.p.rapidapi.com/search"

    def scrape(self, **kwargs: object) -> list[RawPosting]:
        """Run all search queries against JSearch and return raw postings.

        Args:
            **kwargs: Optional overrides. Accepts 'queries' (list[str]) to
                override SEARCH_QUERIES and 'firm_names' (set[str]) to filter
                results against a known firm registry.

        Returns:
            List of RawPosting objects from matching search results.

        Raises:
            ValueError: If no API key is configured.
        """
        if not self.api_key:
            raise ValueError("RAPIDAPI_KEY is required for JSearch adapter")

        start = self._log_start()
        queries: list[str] = kwargs.get("queries", self.SEARCH_QUERIES)  # type: ignore[assignment]
        firm_names: set[str] = kwargs.get("firm_names", set())  # type: ignore[assignment]

        all_postings: list[RawPosting] = []
        errors: list[str] = []
        seen_ids: set[str] = set()

        for query in queries:
            try:
                postings = self._run_query(query, firm_names, seen_ids)
                all_postings.extend(postings)
                logger.info(
                    "scraper.jsearch.query_complete",
                    extra={"query": query, "results": len(postings)},
                )
            except Exception as exc:
                error_msg = f"Query '{query}' failed: {exc}"
                errors.append(error_msg)
                logger.warning(
                    "scraper.jsearch.query_failed",
                    extra={"query": query, "error": str(exc)},
                )

            # Respect rate limits — 1 second between queries.
            time.sleep(1)

        self._log_complete(len(all_postings), errors)
        return all_postings

    def _run_query(
        self,
        query: str,
        firm_names: set[str],
        seen_ids: set[str],
    ) -> list[RawPosting]:
        """Execute a single search query against JSearch.

        Args:
            query: The search string to send to JSearch.
            firm_names: Set of known firm names (lowercase) for filtering.
            seen_ids: Set of already-seen job IDs for deduplication.

        Returns:
            List of RawPosting objects from this query.
        """
        headers: dict[str, str] = {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": "jsearch-cheaper-version.p.rapidapi.com",
        }
        params: dict[str, str] = {
            "query": query,
            "page": "1",
            "num_pages": "3",
            "date_posted": "month",
        }

        response = requests.get(
            self.base_url,
            headers=headers,
            params=params,
            timeout=30,
        )
        response.raise_for_status()

        data: dict[str, Any] = response.json()
        results: list[dict[str, Any]] = data.get("data", [])

        postings: list[RawPosting] = []
        for job in results:
            job_id: str = job.get("job_id", "")
            if not job_id or job_id in seen_ids:
                continue

            employer: str = job.get("employer_name", "")
            title: str = job.get("job_title", "")
            description: str = job.get("job_description", "")

            if not self._is_finance_relevant(employer, title, description, firm_names):
                continue

            seen_ids.add(job_id)

            city: str = job.get("job_city", "")
            state: str = job.get("job_state", "")
            location: str = f"{city}, {state}" if city and state else city or state or "Remote"

            requirements_raw: list[str] = job.get("job_required_skills", []) or []
            experience: dict[str, Any] = job.get("job_required_experience", {}) or {}
            if experience.get("required_skills_string"):
                requirements_raw.append(experience["required_skills_string"])

            posting = RawPosting(
                external_id=job_id,
                source="jsearch",
                firm_name=employer,
                title=title,
                description=description[:5000],  # Truncate very long descriptions
                location=location,
                application_url=job.get("job_apply_link", ""),
                requirements=requirements_raw,
                posted_at=job.get("job_posted_at_datetime_utc"),
                deadline=None,  # JSearch doesn't reliably provide deadlines
                class_year_target=None,  # Will be detected by normalizer
                role_type=None,  # Will be classified by normalizer
                estimated_effort_minutes=45,
            )
            postings.append(posting)

        return postings

    @staticmethod
    def _is_finance_relevant(
        employer: str,
        title: str,
        description: str,
        firm_names: set[str],
    ) -> bool:
        """Check if a job posting is relevant to finance recruiting.

        Args:
            employer: The employer/company name from the posting.
            title: The job title.
            description: The job description text.
            firm_names: Known firm names (lowercase) to match against.

        Returns:
            True if the posting is finance-relevant, False otherwise.
        """
        employer_lower: str = employer.lower().strip()
        title_lower: str = title.lower()
        desc_lower: str = description[:2000].lower()

        # Direct firm match — employer is in our registry.
        if firm_names and employer_lower in firm_names:
            return True

        # Partial firm name match.
        if firm_names:
            for name in firm_names:
                if name in employer_lower or employer_lower in name:
                    return True

        # Keyword match in title or description.
        combined: str = f"{title_lower} {desc_lower}"
        for keyword in _FINANCE_KEYWORDS:
            if keyword in combined:
                return True

        return False
