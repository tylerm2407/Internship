"""Base scraper protocol for InternshipMatch.

All scrapers implement this protocol so the orchestrator can run them
uniformly. Each scraper returns a list of RawPosting dicts that the
normalizer converts into Posting model instances.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


@dataclass
class RawPosting:
    """Intermediate representation of a scraped posting before normalization.

    Every scraper produces these. The normalizer maps them to the Posting model.
    Fields that can't be extracted are left as None — the normalizer fills
    defaults where possible.
    """

    external_id: str
    source: str  # "jsearch", "career_page", "seed"
    firm_name: str
    title: str
    description: str
    location: str
    application_url: str
    requirements: list[str] = field(default_factory=list)
    posted_at: str | None = None  # ISO 8601 string
    deadline: str | None = None
    class_year_target: str | None = None  # "freshman", "sophomore", "junior", "senior"
    role_type: str | None = None
    estimated_effort_minutes: int = 45
    firm_id: str | None = None  # UUID if we already know the firm
    firm_tier: str | None = None
    firm_headquarters: str | None = None
    firm_careers_url: str | None = None
    firm_gpa_floor: float | None = None


@dataclass
class ScraperResult:
    """Summary of a single scraper run."""

    source: str
    started_at: datetime
    completed_at: datetime | None = None
    postings_found: int = 0
    postings_new: int = 0
    postings_updated: int = 0
    errors: list[str] = field(default_factory=list)
    success: bool = True

    def duration_seconds(self) -> float:
        """Return run duration in seconds."""
        if self.completed_at is None:
            return 0.0
        return (self.completed_at - self.started_at).total_seconds()


class BaseScraper(ABC):
    """Abstract base class for all InternshipMatch scrapers.

    Subclasses must implement `scrape()` which returns a list of RawPosting
    objects. The orchestrator calls this method and handles errors per-scraper
    so one broken source never takes down the whole pipeline.
    """

    @property
    @abstractmethod
    def source_name(self) -> str:
        """Identifier for this scraper source, e.g. 'jsearch' or 'career_page'."""
        ...

    @abstractmethod
    def scrape(self, **kwargs: object) -> list[RawPosting]:
        """Run the scraper and return raw postings.

        Args:
            **kwargs: Scraper-specific configuration (e.g., search terms, firm list).

        Returns:
            List of RawPosting objects ready for normalization.

        Raises:
            Exception: Scrapers should raise on fatal errors. Non-fatal errors
                (e.g., one firm's page failing) should be logged and skipped.
        """
        ...

    def _log_start(self) -> datetime:
        """Log scraper start and return the timestamp."""
        now = datetime.now(timezone.utc)
        logger.info("scraper.started", extra={"source": self.source_name})
        return now

    def _log_complete(self, count: int, errors: list[str]) -> None:
        """Log scraper completion."""
        logger.info(
            "scraper.completed",
            extra={
                "source": self.source_name,
                "postings_found": count,
                "errors": len(errors),
            },
        )
