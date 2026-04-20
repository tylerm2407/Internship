"""Posting normalizer for InternshipMatch.

Converts RawPosting objects from any scraper adapter into dicts matching
the postings table schema. Handles role classification, class year
detection, location normalization, and deterministic ID generation for
deduplication.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import NAMESPACE_URL, uuid5

from backend.scrapers.base import RawPosting

# ============================================================
# Role type classification
# ============================================================

_ROLE_KEYWORDS: dict[str, list[str]] = {
    "investment_banking": [
        "investment banking",
        "ib analyst",
        "ib intern",
        "m&a",
        "mergers and acquisitions",
        "restructuring",
        "advisory",
        "leveraged finance",
        "dcm",
        "ecm",
    ],
    "sales_and_trading": [
        "sales and trading",
        "s&t",
        "trading",
        "trader",
        "fixed income",
        "equities trading",
        "derivatives",
        "market making",
    ],
    "equity_research": [
        "equity research",
        "research analyst",
        "er analyst",
        "securities research",
    ],
    "asset_management": [
        "asset management",
        "portfolio management",
        "wealth management",
        "investment management",
        "fund management",
    ],
    "private_equity": [
        "private equity",
        "pe analyst",
        "buyout",
        "growth equity",
        "pe intern",
    ],
    "quant": [
        "quantitative",
        "quant analyst",
        "quant researcher",
        "quant trading",
        "algorithmic",
        "systematic",
        "data science",
    ],
    "capital_markets": [
        "capital markets",
        "debt capital",
        "equity capital",
        "syndicate",
        "origination",
    ],
}

# ============================================================
# Class year detection
# ============================================================

_CLASS_YEAR_PATTERNS: dict[str, list[str]] = {
    "freshman": ["freshman", "first.year", "1st.year", "first year"],
    "sophomore": ["sophomore", "second.year", "2nd.year", "second year", "early insights", "early identification"],
    "junior": ["junior", "third.year", "3rd.year", "third year", "summer analyst", "summer 20"],
    "senior": ["senior", "fourth.year", "4th.year", "fourth year", "full.time", "ft analyst"],
}

# ============================================================
# Location normalization
# ============================================================

_STATE_ABBREVIATIONS: dict[str, str] = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
    "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
    "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
    "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
    "wisconsin": "WI", "wyoming": "WY",
}

_CITY_ALIASES: dict[str, str] = {
    "nyc": "New York, NY",
    "manhattan": "New York, NY",
    "new york city": "New York, NY",
    "new york, new york": "New York, NY",
    "sf": "San Francisco, CA",
    "san fran": "San Francisco, CA",
    "la": "Los Angeles, CA",
    "chi": "Chicago, IL",
    "st. petersburg": "St. Petersburg, FL",
    "st petersburg": "St. Petersburg, FL",
}


def normalize_posting(raw: RawPosting, firm_id: str) -> dict:
    """Convert a RawPosting into a dict matching the postings table schema.

    Generates a deterministic UUID from a dedup key so repeated scrapes
    of the same posting produce the same ID (enabling upsert logic).

    Args:
        raw: The raw posting from a scraper adapter.
        firm_id: UUID of the matched firm in the registry.

    Returns:
        Dict matching the postings table schema, ready for insert/upsert.
    """
    dedup_key: str = (
        f"{raw.firm_name.lower().strip()}"
        f"|{raw.title.lower().strip()}"
        f"|{raw.location.lower().strip()}"
    )
    posting_id: str = str(uuid5(NAMESPACE_URL, dedup_key))

    return {
        "id": posting_id,
        "firm_id": firm_id,
        "title": raw.title.strip(),
        "role_type": classify_role_type(raw.title, raw.description),
        "class_year_target": detect_class_year(
            raw.title, raw.description, raw.class_year_target,
        ),
        "location": normalize_location(raw.location),
        "description": raw.description.strip()[:5000],
        "requirements": raw.requirements,
        "application_url": raw.application_url,
        "posted_at": raw.posted_at or datetime.now(timezone.utc).isoformat(),
        "deadline": raw.deadline,
        "closed_at": None,
        "estimated_effort_minutes": raw.estimated_effort_minutes,
    }


def classify_role_type(title: str, description: str) -> str:
    """Classify the role type from title and description keywords.

    Checks title first (stronger signal), then description. Returns the
    role type with the most keyword matches, or 'investment_banking' as
    the default since it's the most common internship type.

    Args:
        title: The posting title.
        description: The posting description.

    Returns:
        One of: investment_banking, sales_and_trading, equity_research,
        asset_management, private_equity, quant, capital_markets.
    """
    title_lower: str = title.lower()
    desc_lower: str = description[:3000].lower()

    best_role: str = "investment_banking"
    best_score: int = 0

    for role, keywords in _ROLE_KEYWORDS.items():
        score: int = 0
        for kw in keywords:
            # Title matches are worth more.
            if kw in title_lower:
                score += 3
            if kw in desc_lower:
                score += 1

        if score > best_score:
            best_score = score
            best_role = role

    return best_role


def detect_class_year(
    title: str,
    description: str,
    explicit: str | None,
) -> str:
    """Detect the target class year from posting text.

    Uses an explicit value if provided, otherwise scans title and
    description for class year keywords. Defaults to 'junior' since
    most summer analyst programs target rising seniors (current juniors).

    Args:
        title: The posting title.
        description: The posting description.
        explicit: Explicitly provided class year, if any.

    Returns:
        One of: freshman, sophomore, junior, senior.
    """
    if explicit and explicit in ("freshman", "sophomore", "junior", "senior"):
        return explicit

    combined: str = f"{title} {description[:2000]}".lower()

    # Check each class year in order of specificity.
    # Freshman/sophomore programs are rarer so check those first.
    for year in ("freshman", "sophomore", "senior", "junior"):
        patterns = _CLASS_YEAR_PATTERNS[year]
        for pattern in patterns:
            if re.search(pattern, combined, re.IGNORECASE):
                return year

    # Check for graduation year patterns (e.g., "Class of 2028").
    grad_match = re.search(r"class\s+of\s+20(\d{2})", combined)
    if grad_match:
        grad_year: int = int(f"20{grad_match.group(1)}")
        current_year: int = datetime.now().year
        years_until_grad: int = grad_year - current_year
        if years_until_grad >= 3:
            return "freshman"
        elif years_until_grad == 2:
            return "sophomore"
        elif years_until_grad == 1:
            return "junior"
        else:
            return "senior"

    return "junior"


def normalize_location(location: str) -> str:
    """Normalize location strings to a consistent 'City, ST' format.

    Handles common aliases (NYC -> New York, NY), full state names
    (New York, New York -> New York, NY), and passthrough for
    locations that are already well-formatted or international.

    Args:
        location: Raw location string from a posting.

    Returns:
        Normalized location string.
    """
    if not location or not location.strip():
        return "Multiple Locations"

    location = location.strip()
    location_lower: str = location.lower()

    # Check city aliases first.
    if location_lower in _CITY_ALIASES:
        return _CITY_ALIASES[location_lower]

    # Try to normalize "City, Full State Name" to "City, ST".
    parts: list[str] = [p.strip() for p in location.split(",")]
    if len(parts) == 2:
        city: str = parts[0].strip()
        state_raw: str = parts[1].strip().lower()

        # Already abbreviated (2 chars).
        if len(state_raw) == 2:
            return f"{city}, {state_raw.upper()}"

        # Full state name.
        if state_raw in _STATE_ABBREVIATIONS:
            return f"{city}, {_STATE_ABBREVIATIONS[state_raw]}"

    # International locations or already formatted — pass through.
    return location
