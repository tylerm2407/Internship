"""Firecrawl generic career page scraper for InternshipMatch.

Scrapes firm career pages directly via the Firecrawl API, then uses
keyword filtering to extract internship/analyst postings from the
rendered markdown content. Falls back gracefully when pages can't be
scraped or don't contain relevant postings.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import time
from typing import Any

import requests

from backend.scrapers.base import BaseScraper, RawPosting

logger = logging.getLogger(__name__)

# Keywords that indicate an internship or analyst-level posting.
_POSTING_KEYWORDS: list[str] = [
    "intern",
    "summer analyst",
    "summer associate",
    "analyst program",
    "early careers",
    "campus",
    "undergraduate",
    "entry level",
    "graduate program",
]

# Sections of a career page that are NOT job postings.
_NOISE_SECTIONS: list[str] = [
    "benefits",
    "our culture",
    "diversity",
    "equal opportunity",
    "about us",
    "privacy policy",
    "cookie",
]


class FirecrawlGenericAdapter(BaseScraper):
    """Scraper that reads firm career pages via Firecrawl and extracts postings.

    Attributes:
        source_name: Identifier for this scraper source.
    """

    source_name: str = "career_page"

    def __init__(self, api_key: str | None = None) -> None:
        """Initialize the Firecrawl adapter.

        Args:
            api_key: Firecrawl API key. Falls back to FIRECRAWL_API_KEY env var.
        """
        self.api_key: str = api_key or os.getenv("FIRECRAWL_API_KEY", "")
        self.base_url: str = "https://api.firecrawl.dev/v1"

    def scrape(self, **kwargs: object) -> list[RawPosting]:
        """Scrape career pages for all provided firms.

        Args:
            **kwargs: Must include 'firms' — a list of firm dicts with at least
                'name', 'id', and 'careers_url' keys.

        Returns:
            List of RawPosting objects extracted from career pages.

        Raises:
            ValueError: If no API key is configured.
        """
        if not self.api_key:
            raise ValueError("FIRECRAWL_API_KEY is required for career page scraper")

        start = self._log_start()
        firms: list[dict[str, Any]] = kwargs.get("firms", [])  # type: ignore[assignment]
        if not firms:
            logger.warning("scraper.career_page.no_firms", extra={})
            return []

        all_postings: list[RawPosting] = []
        errors: list[str] = []

        for firm in firms:
            careers_url: str = firm.get("careers_url", "")
            firm_name: str = firm.get("name", "")

            if not careers_url:
                continue

            try:
                postings = self._scrape_firm(firm)
                all_postings.extend(postings)
                logger.info(
                    "scraper.career_page.firm_complete",
                    extra={"firm": firm_name, "results": len(postings)},
                )
            except Exception as exc:
                error_msg = f"Firm '{firm_name}' ({careers_url}) failed: {exc}"
                errors.append(error_msg)
                logger.warning(
                    "scraper.career_page.firm_failed",
                    extra={"firm": firm_name, "error": str(exc)},
                )

            # Be polite — 2 seconds between firms.
            time.sleep(2)

        self._log_complete(len(all_postings), errors)
        return all_postings

    def _scrape_firm(self, firm: dict[str, Any]) -> list[RawPosting]:
        """Scrape a single firm's career page and extract postings.

        Args:
            firm: Firm dict with 'name', 'id', and 'careers_url' keys.

        Returns:
            List of RawPosting objects found on the career page.
        """
        careers_url: str = firm["careers_url"]
        firm_name: str = firm["name"]
        firm_id: str = firm.get("id", "")

        markdown: str = self._fetch_page(careers_url)
        if not markdown:
            logger.info(
                "scraper.career_page.empty_response",
                extra={"firm": firm_name, "url": careers_url},
            )
            return []

        # Filter to only relevant sections.
        relevant_sections: list[str] = self._extract_relevant_sections(markdown)
        if not relevant_sections:
            return []

        # Extract posting blocks from the relevant content.
        postings: list[RawPosting] = self._parse_postings(
            relevant_sections, firm_name, firm_id, careers_url,
        )
        return postings

    def _fetch_page(self, url: str) -> str:
        """Fetch a URL via Firecrawl's scrape endpoint.

        Args:
            url: The career page URL to scrape.

        Returns:
            Markdown content of the page, or empty string on failure.
        """
        headers: dict[str, str] = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "url": url,
            "formats": ["markdown"],
        }

        response = requests.post(
            f"{self.base_url}/scrape",
            headers=headers,
            json=payload,
            timeout=60,
        )
        response.raise_for_status()

        data: dict[str, Any] = response.json()
        # Firecrawl v1 returns data.markdown for the rendered content.
        return data.get("data", {}).get("markdown", "")

    def _extract_relevant_sections(self, markdown: str) -> list[str]:
        """Filter career page markdown to sections containing posting keywords.

        Args:
            markdown: Full markdown content of the career page.

        Returns:
            List of text sections that likely contain job postings.
        """
        # Split by headings to isolate sections.
        sections: list[str] = re.split(r"\n#{1,3}\s+", markdown)
        relevant: list[str] = []

        for section in sections:
            section_lower: str = section[:500].lower()

            # Skip noise sections.
            if any(noise in section_lower for noise in _NOISE_SECTIONS):
                continue

            # Keep sections with posting keywords.
            if any(kw in section_lower for kw in _POSTING_KEYWORDS):
                relevant.append(section.strip())

        return relevant

    def _parse_postings(
        self,
        sections: list[str],
        firm_name: str,
        firm_id: str,
        careers_url: str,
    ) -> list[RawPosting]:
        """Parse posting blocks from relevant career page sections.

        Uses regex patterns to identify individual job listings within the
        markdown content. Each listing is converted to a RawPosting.

        Args:
            sections: List of relevant markdown text sections.
            firm_name: Name of the firm.
            firm_id: UUID of the firm in the registry.
            careers_url: The careers page URL (used as fallback application URL).

        Returns:
            List of RawPosting objects.
        """
        postings: list[RawPosting] = []
        seen_titles: set[str] = set()

        full_text: str = "\n\n".join(sections)

        # Try to find individual posting blocks.
        # Common patterns: bullet lists, bold titles, linked titles.
        posting_patterns: list[str] = [
            # Markdown links: [Title](url)
            r"\[([^\]]*(?:intern|analyst|associate)[^\]]*)\]\(([^)]+)\)",
            # Bold titles: **Title** or __Title__
            r"\*\*([^*]*(?:intern|analyst|associate)[^*]*)\*\*",
            # List items with titles
            r"[-*]\s+([^\n]*(?:intern|analyst|associate)[^\n]*)",
        ]

        for pattern in posting_patterns:
            matches = re.finditer(pattern, full_text, re.IGNORECASE)
            for match in matches:
                title: str = match.group(1).strip()
                title_key: str = title.lower()

                if title_key in seen_titles:
                    continue
                if len(title) < 5 or len(title) > 200:
                    continue
                seen_titles.add(title_key)

                # Try to extract a URL from the match (for link patterns).
                application_url: str = careers_url
                if match.lastindex and match.lastindex >= 2:
                    candidate_url: str = match.group(2).strip()
                    if candidate_url.startswith("http"):
                        application_url = candidate_url

                # Extract context around the match for the description.
                start_pos: int = max(0, match.start() - 200)
                end_pos: int = min(len(full_text), match.end() + 500)
                context: str = full_text[start_pos:end_pos].strip()

                # Extract location if visible near the title.
                location: str = self._extract_location(context)

                external_id: str = hashlib.sha256(
                    f"{firm_name}|{title}".encode()
                ).hexdigest()[:16]

                posting = RawPosting(
                    external_id=external_id,
                    source="career_page",
                    firm_name=firm_name,
                    title=title,
                    description=context[:3000],
                    location=location,
                    application_url=application_url,
                    requirements=[],
                    posted_at=None,
                    deadline=None,
                    class_year_target=None,
                    role_type=None,
                    estimated_effort_minutes=45,
                    firm_id=firm_id,
                )
                postings.append(posting)

        return postings

    @staticmethod
    def _extract_location(text: str) -> str:
        """Try to extract a location from text near a posting title.

        Args:
            text: Text context around a posting title.

        Returns:
            Extracted location string, or 'Multiple Locations' as fallback.
        """
        # Common city patterns in finance job postings.
        location_patterns: list[str] = [
            r"(New York|NYC|Manhattan),?\s*(NY|New York)?",
            r"(Chicago),?\s*(IL|Illinois)?",
            r"(San Francisco|SF),?\s*(CA|California)?",
            r"(Los Angeles|LA),?\s*(CA|California)?",
            r"(Houston),?\s*(TX|Texas)?",
            r"(Boston),?\s*(MA|Massachusetts)?",
            r"(Charlotte),?\s*(NC|North Carolina)?",
            r"(London)",
            r"(Hong Kong)",
            r"(Greenwich),?\s*(CT|Connecticut)?",
            r"(Minneapolis),?\s*(MN|Minnesota)?",
            r"(Milwaukee),?\s*(WI|Wisconsin)?",
            r"(Richmond),?\s*(VA|Virginia)?",
            r"(St\.?\s*Petersburg),?\s*(FL|Florida)?",
            r"(Nashville),?\s*(TN|Tennessee)?",
        ]

        for pattern in location_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0).strip().rstrip(",")

        return "Multiple Locations"
