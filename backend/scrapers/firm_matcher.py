"""Firm matcher for InternshipMatch.

Maps scraped employer names to firms in the registry using a three-step
strategy: exact match, alias lookup, then fuzzy matching. Returns None
when no confident match is found — the posting is skipped rather than
assigned to the wrong firm.
"""

from __future__ import annotations

import logging
from difflib import SequenceMatcher
from typing import Any

logger = logging.getLogger(__name__)

# Threshold for fuzzy matching. 0.8 means 80% character similarity.
_FUZZY_THRESHOLD: float = 0.8

# Common name variations that map to the canonical firm name.
# Keys are lowercase. Values must match the firm 'name' field exactly.
ALIASES: dict[str, str] = {
    # Bulge brackets
    "goldman sachs & co": "Goldman Sachs",
    "goldman sachs & co.": "Goldman Sachs",
    "goldman sachs group": "Goldman Sachs",
    "the goldman sachs group": "Goldman Sachs",
    "goldman sachs group inc": "Goldman Sachs",
    "goldman sachs group, inc.": "Goldman Sachs",
    "gs": "Goldman Sachs",
    "jp morgan": "JPMorgan Chase",
    "jpmorgan": "JPMorgan Chase",
    "j.p. morgan": "JPMorgan Chase",
    "j.p. morgan chase": "JPMorgan Chase",
    "jpmorgan chase & co": "JPMorgan Chase",
    "jpmorgan chase & co.": "JPMorgan Chase",
    "jp morgan chase": "JPMorgan Chase",
    "morgan stanley & co": "Morgan Stanley",
    "morgan stanley & co.": "Morgan Stanley",
    "morgan stanley group": "Morgan Stanley",
    "bofa securities": "Bank of America",
    "bank of america merrill lynch": "Bank of America",
    "baml": "Bank of America",
    "bofa": "Bank of America",
    "bank of america corporation": "Bank of America",
    "merrill lynch": "Bank of America",
    "citi": "Citigroup",
    "citibank": "Citigroup",
    "citigroup inc": "Citigroup",
    "citigroup inc.": "Citigroup",
    "citi group": "Citigroup",
    # Elite boutiques
    "evercore inc": "Evercore",
    "evercore inc.": "Evercore",
    "evercore partners": "Evercore",
    "lazard ltd": "Lazard",
    "lazard freres": "Lazard",
    "lazard frères": "Lazard",
    "moelis": "Moelis & Company",
    "moelis & co": "Moelis & Company",
    "moelis and company": "Moelis & Company",
    "centerview": "Centerview Partners",
    "perella weinberg": "Perella Weinberg Partners",
    "pwp": "Perella Weinberg Partners",
    "pjt": "PJT Partners",
    "pjt partners inc": "PJT Partners",
    "guggenheim": "Guggenheim Partners",
    "guggenheim securities": "Guggenheim Partners",
    "qatalyst": "Qatalyst Partners",
    # Middle market
    "hl": "Houlihan Lokey",
    "houlihan lokey inc": "Houlihan Lokey",
    "houlihan lokey, inc.": "Houlihan Lokey",
    "william blair & company": "William Blair",
    "william blair & co": "William Blair",
    "rw baird": "Baird",
    "r.w. baird": "Baird",
    "robert w. baird": "Baird",
    "robert w baird": "Baird",
    "robert w. baird & co": "Baird",
    "jefferies financial group": "Jefferies",
    "jefferies group": "Jefferies",
    "jefferies llc": "Jefferies",
    "piper sandler companies": "Piper Sandler",
    "piper sandler & co": "Piper Sandler",
    "raymond james financial": "Raymond James",
    "raymond james & associates": "Raymond James",
    "harris williams & co": "Harris Williams",
    "harris williams & co.": "Harris Williams",
    "harris williams advisory": "Harris Williams",
    "lincoln international llc": "Lincoln International",
    "lincoln intl": "Lincoln International",
    # Buy-side / Quant
    "citadel llc": "Citadel",
    "citadel securities": "Citadel",
    "citadel advisors": "Citadel",
    "two sigma investments": "Two Sigma",
    "two sigma securities": "Two Sigma",
    "jane street capital": "Jane Street",
    "jane street group": "Jane Street",
    "aqr": "AQR Capital Management",
    "aqr capital": "AQR Capital Management",
    "aqr capital management llc": "AQR Capital Management",
}


def match_firm(
    scraped_name: str,
    firms: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Find the best matching firm from the registry for a scraped employer name.

    Uses a three-step strategy:
    1. Exact match (case-insensitive) against firm names.
    2. Alias lookup against known name variations.
    3. Fuzzy matching using SequenceMatcher with a 0.8 threshold.

    Args:
        scraped_name: The employer name from the scraped posting.
        firms: List of firm dicts from the registry, each with at least
            'id' and 'name' keys.

    Returns:
        The matching firm dict, or None if no confident match is found.
    """
    if not scraped_name or not firms:
        return None

    scraped_lower: str = scraped_name.lower().strip()

    # Build lookup structures.
    name_to_firm: dict[str, dict[str, Any]] = {}
    for firm in firms:
        name_to_firm[firm["name"].lower().strip()] = firm

    # Step 1: Exact match on canonical name.
    if scraped_lower in name_to_firm:
        return name_to_firm[scraped_lower]

    # Step 2: Alias lookup.
    if scraped_lower in ALIASES:
        canonical: str = ALIASES[scraped_lower]
        canonical_lower: str = canonical.lower().strip()
        if canonical_lower in name_to_firm:
            return name_to_firm[canonical_lower]

    # Step 3: Fuzzy match against canonical names.
    best_firm: dict[str, Any] | None = None
    best_ratio: float = 0.0

    for firm in firms:
        firm_lower: str = firm["name"].lower().strip()
        ratio: float = SequenceMatcher(None, scraped_lower, firm_lower).ratio()

        if ratio > best_ratio:
            best_ratio = ratio
            best_firm = firm

    if best_ratio >= _FUZZY_THRESHOLD and best_firm is not None:
        logger.info(
            "scraper.firm_matcher.fuzzy_match",
            extra={
                "scraped": scraped_name,
                "matched": best_firm["name"],
                "ratio": round(best_ratio, 3),
            },
        )
        return best_firm

    logger.debug(
        "scraper.firm_matcher.no_match",
        extra={
            "scraped": scraped_name,
            "best_candidate": best_firm["name"] if best_firm else None,
            "best_ratio": round(best_ratio, 3),
        },
    )
    return None


def build_firm_name_set(firms: list[dict[str, Any]]) -> set[str]:
    """Build a lowercase set of all firm names and aliases for quick lookups.

    Used by JSearch adapter to pre-filter results by employer name before
    doing full fuzzy matching.

    Args:
        firms: List of firm dicts from the registry.

    Returns:
        Set of lowercase firm names and alias keys.
    """
    names: set[str] = set()
    for firm in firms:
        names.add(firm["name"].lower().strip())

    # Add all alias keys too.
    names.update(ALIASES.keys())

    return names
