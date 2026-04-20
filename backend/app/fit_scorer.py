"""Hybrid fit scoring engine for InternshipMatch.

This is the single most important piece of code in the project. If the
scores are wrong, users lose trust and the product is dead. See ADR 0003
for the full design rationale.

The scoring pipeline has two phases:
1. Deterministic base score (0-100) using six weighted factors — runs in
   milliseconds against all postings.
2. Claude qualitative pass (±15 adjustment) — runs only on the top 30
   matches to add nuance and generate explainable rationale.

The six factors and their weights:
  - GPA fit:              25
  - Class year eligibility: 20 (hard filter)
  - Role match:           20
  - Coursework progression: 15
  - Geographic fit:       10
  - Experience relevance: 10
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from app.claude_client import score_fit_qualitative
from app.models import FitScore, Firm, Posting, ScoreBreakdown, StudentProfile

logger = logging.getLogger(__name__)

# --- Weight constants ---
WEIGHT_GPA = 25
WEIGHT_CLASS_YEAR = 20
WEIGHT_ROLE_MATCH = 20
WEIGHT_COURSEWORK = 15
WEIGHT_GEOGRAPHY = 10
WEIGHT_EXPERIENCE = 10

# Finance-domain keywords weighted higher in experience relevance matching
HIGH_VALUE_KEYWORDS = {
    "dcf", "lbo", "m&a", "merger", "acquisition", "valuation",
    "financial modeling", "three-statement", "3-statement", "pitch book",
    "pitchbook", "due diligence", "deal", "transaction", "underwriting",
    "capital markets", "ipo", "equity research", "fixed income",
    "derivatives", "options", "trading", "portfolio", "risk management",
    "bloomberg", "capital iq", "factset", "comps", "comparable",
    "precedent transaction", "accretion", "dilution",
}

# Adjacent role mapping — partial credit for related roles
ADJACENT_ROLES: dict[str, set[str]] = {
    "investment_banking": {"investment_banking_mm", "capital_markets", "leveraged_finance", "restructuring"},
    "investment_banking_mm": {"investment_banking", "capital_markets"},
    "sales_and_trading": {"capital_markets", "fixed_income", "equities", "risk_management"},
    "private_equity": {"investment_banking", "investment_banking_mm", "hedge_fund"},
    "equity_research": {"asset_management", "investment_banking", "hedge_fund"},
    "asset_management": {"equity_research", "quant", "wealth_management"},
    "quant": {"asset_management", "sales_and_trading", "hedge_fund"},
    "capital_markets": {"investment_banking", "sales_and_trading"},
    "restructuring": {"investment_banking", "credit_leveraged_finance", "private_equity"},
    "wealth_management": {"asset_management", "corporate_finance"},
    "real_estate": {"private_equity", "asset_management", "investment_banking_mm"},
    "hedge_fund": {"asset_management", "quant", "equity_research"},
    "credit_leveraged_finance": {"investment_banking", "restructuring", "sales_and_trading"},
    "corporate_finance": {"investment_banking_mm", "asset_management", "wealth_management"},
    "risk_management": {"sales_and_trading", "compliance", "quant"},
    "consulting_finance": {"corporate_finance", "investment_banking"},
    "compliance": {"risk_management", "corporate_finance"},
    "insurance": {"risk_management", "asset_management", "compliance"},
}

# Geographic proximity groups
GEO_PROXIMITY: dict[str, set[str]] = {
    "NYC": {"New York", "Manhattan", "Brooklyn", "Jersey City", "Stamford", "Greenwich"},
    "Boston": {"Cambridge", "Back Bay"},
    "Chicago": {"Evanston"},
    "Providence": {"Smithfield"},
    "San Francisco": {"Palo Alto", "Menlo Park", "Mountain View"},
    "Charlotte": {"Raleigh", "Durham"},
    "Houston": {"Dallas", "Austin"},
    "Los Angeles": {"Century City", "Santa Monica"},
}

# Expected coursework by tier for IB-type roles
EXPECTED_COURSEWORK_BB = {
    "financial accounting", "corporate finance", "investments",
    "financial management", "econometrics", "derivatives",
    "financial modeling", "valuation",
}
EXPECTED_COURSEWORK_MM = {
    "financial accounting", "corporate finance", "investments",
    "financial management",
}

# Role-specific coursework expectations
EXPECTED_COURSEWORK_BY_ROLE: dict[str, set[str]] = {
    "investment_banking": EXPECTED_COURSEWORK_BB,
    "investment_banking_mm": EXPECTED_COURSEWORK_MM,
    "capital_markets": {"financial accounting", "corporate finance", "investments", "fixed income", "derivatives"},
    "restructuring": {"financial accounting", "corporate finance", "credit analysis", "bankruptcy", "financial modeling"},
    "sales_and_trading": {"derivatives", "fixed income", "statistics", "econometrics", "portfolio theory"},
    "quant": {"statistics", "probability", "linear algebra", "stochastic calculus", "programming", "machine learning"},
    "equity_research": {"financial accounting", "investments", "industry analysis", "financial modeling", "valuation"},
    "asset_management": {"portfolio theory", "investments", "economics", "statistics", "financial accounting"},
    "private_equity": EXPECTED_COURSEWORK_BB | {"private equity", "lbo modeling"},
    "hedge_fund": {"investments", "statistics", "derivatives", "portfolio theory", "financial modeling"},
    "wealth_management": {"investments", "financial planning", "economics", "portfolio theory"},
    "real_estate": {"real estate finance", "financial accounting", "corporate finance", "investments"},
    "credit_leveraged_finance": {"financial accounting", "corporate finance", "credit analysis", "fixed income", "derivatives"},
    "corporate_finance": {"financial accounting", "corporate finance", "financial management", "economics"},
    "risk_management": {"statistics", "derivatives", "financial accounting", "econometrics", "risk management"},
    "consulting_finance": {"corporate finance", "financial accounting", "economics", "strategy"},
    "compliance": {"financial accounting", "corporate finance", "business law", "economics"},
    "insurance": {"statistics", "risk management", "financial accounting", "economics", "actuarial science"},
}

# Role-specific high-value experience keywords
HIGH_VALUE_KEYWORDS_BY_ROLE: dict[str, set[str]] = {
    "sales_and_trading": {
        "options", "greeks", "delta", "volatility", "futures", "yield curve",
        "bonds", "swaps", "market making", "trading", "fixed income",
        "derivatives", "hedging", "risk", "p&l",
    },
    "quant": {
        "backtesting", "python", "machine learning", "stochastic", "optimization",
        "algorithm", "statistics", "probability", "monte carlo", "regression",
        "signal", "alpha", "factor model",
    },
    "equity_research": {
        "earnings model", "price target", "initiating coverage", "industry analysis",
        "financial modeling", "valuation", "comps", "dcf", "sector",
        "stock pitch", "buy rating", "sell rating",
    },
    "asset_management": {
        "portfolio", "sharpe ratio", "alpha", "benchmark", "asset allocation",
        "rebalancing", "risk-adjusted", "etf", "mutual fund", "aum",
    },
    "private_equity": {
        "dcf", "lbo", "m&a", "merger", "acquisition", "valuation",
        "financial modeling", "operating model", "bolt-on", "platform",
        "portfolio company", "due diligence", "deal", "irr", "moic",
    },
    "restructuring": {
        "distressed", "chapter 11", "dip financing", "covenant", "waterfall",
        "recovery rate", "creditor", "debtor", "turnaround", "bankruptcy",
        "credit analysis", "leverage",
    },
    "hedge_fund": {
        "alpha", "portfolio", "long/short", "event-driven", "catalyst",
        "risk management", "derivatives", "backtesting", "factor",
    },
    "credit_leveraged_finance": {
        "credit analysis", "leverage", "covenant", "high yield", "leveraged loan",
        "capital structure", "fixed income", "spread", "rating",
    },
    "wealth_management": {
        "financial planning", "portfolio", "client", "asset allocation",
        "estate planning", "retirement", "tax", "wealth",
    },
    "corporate_finance": {
        "budgeting", "forecasting", "variance analysis", "financial planning",
        "capital allocation", "working capital", "treasury",
    },
    "risk_management": {
        "var", "stress test", "risk model", "hedging", "derivatives",
        "regulatory", "compliance", "basel", "capital requirements",
    },
}


def _score_gpa(profile: StudentProfile, firm: Firm) -> float:
    """Score GPA fit against the firm's estimated floor.

    Args:
        profile: Student's profile.
        firm: The firm being evaluated.

    Returns:
        Score from 0.0 to 1.0.
    """
    if profile.gpa is None:
        return 0.5  # Unknown GPA gets middle score

    floor = firm.gpa_floor_estimated
    if profile.gpa >= floor + 0.2:
        return 1.0
    elif profile.gpa >= floor:
        return 0.8
    elif profile.gpa >= floor - 0.3:
        # Linear scale from 0.3 to 0.7 based on distance below floor
        distance = floor - profile.gpa
        return 0.7 - (distance / 0.3) * 0.4
    else:
        return 0.15  # Heavy penalty but not zero — some firms are flexible


def _check_class_year_eligible(profile_class_year: str, posting: Posting) -> bool:
    """Check if the student's class year matches the posting's target.

    This is a hard filter — wrong class year excludes the posting entirely.

    Args:
        profile_class_year: The student's current class year.
        posting: The job posting.

    Returns:
        True if eligible, False if not.
    """
    return profile_class_year == posting.class_year_target


def _score_role_match(profile: StudentProfile, posting: Posting) -> float:
    """Score how well the posting's role type matches the user's targets.

    Args:
        profile: Student's profile with target_roles.
        posting: The job posting with role_type.

    Returns:
        Score from 0.0 to 1.0.
    """
    role = posting.role_type.lower()

    # Check exact match against any target role
    for target in profile.target_roles:
        if target.lower() in role or role in target.lower():
            return 1.0

    # Check adjacent roles
    for target in profile.target_roles:
        adjacent = ADJACENT_ROLES.get(target.lower(), set())
        for adj_role in adjacent:
            if adj_role in role or role in adj_role:
                return 0.5

    # No match at all
    if not profile.target_roles:
        return 0.6  # No preferences set — give moderate credit

    return 0.0


def _score_coursework(profile: StudentProfile, firm: Firm, role_type: str | None = None) -> float:
    """Score coursework progression relative to role and firm tier expectations.

    Args:
        profile: Student's profile with coursework lists.
        firm: The firm (used to determine tier expectations).
        role_type: Optional role type for role-specific expectations.

    Returns:
        Score from 0.0 to 1.0.
    """
    all_courses = {c.lower() for c in profile.coursework_completed + profile.coursework_in_progress}

    # Try role-specific expectations first, fall back to tier-based
    expected = None
    if role_type:
        normalized = role_type.lower().replace(" ", "_").replace("/", "_").replace("&", "and")
        expected = EXPECTED_COURSEWORK_BY_ROLE.get(normalized)
        if expected is None:
            # Try partial match
            for key, val in EXPECTED_COURSEWORK_BY_ROLE.items():
                if key in normalized or normalized in key:
                    expected = val
                    break

    if not role_type or expected is None:
        if firm.tier in ("bulge_bracket", "elite_boutique", "quant"):
            expected = EXPECTED_COURSEWORK_BB
        else:
            expected = EXPECTED_COURSEWORK_MM

    if not expected:
        return 0.5

    matches = 0
    for expected_course in expected:
        for actual in all_courses:
            if expected_course in actual or actual in expected_course:
                matches += 1
                break

    return min(matches / max(len(expected) * 0.6, 1), 1.0)


def _score_geography(profile: StudentProfile, posting: Posting) -> float:
    """Score geographic fit between user preferences and posting location.

    Args:
        profile: Student's profile with target_geographies.
        posting: The job posting with location.

    Returns:
        Score from 0.0 to 1.0.
    """
    if not profile.target_geographies:
        return 0.7  # No preference set — moderate credit

    posting_location = posting.location.lower()

    for target_geo in profile.target_geographies:
        if target_geo.lower() in posting_location:
            return 1.0

        # Check proximity groups
        for hub, nearby in GEO_PROXIMITY.items():
            if target_geo.lower() in hub.lower() or hub.lower() in target_geo.lower():
                for place in nearby:
                    if place.lower() in posting_location:
                        return 0.7

    return 0.2


def _score_experience(profile: StudentProfile, posting: Posting) -> float:
    """Score experience relevance using keyword overlap with weighting.

    Finance-specific keywords (DCF, LBO, M&A, etc.) are worth more than
    generic business terms.

    Args:
        profile: Student's profile with prior_experience.
        posting: The job posting with requirements.

    Returns:
        Score from 0.0 to 1.0.
    """
    if not profile.prior_experience:
        return 0.1  # No experience — low but not zero

    # Collect all text from experience bullets
    experience_text = " ".join(
        " ".join(exp.bullets) + " " + exp.summary + " " + exp.role
        for exp in profile.prior_experience
    ).lower()

    # Also include skills
    experience_text += " " + " ".join(s.lower() for s in profile.technical_skills)

    requirements_text = " ".join(posting.requirements).lower()

    # Use role-specific keywords if available
    keywords_to_check = HIGH_VALUE_KEYWORDS
    if posting.role_type:
        normalized_role = posting.role_type.lower().replace(" ", "_").replace("/", "_")
        for key, val in HIGH_VALUE_KEYWORDS_BY_ROLE.items():
            if key in normalized_role or normalized_role in key:
                keywords_to_check = val
                break

    # Count high-value keyword hits
    high_value_hits = 0
    for keyword in keywords_to_check:
        if keyword in experience_text and keyword in requirements_text:
            high_value_hits += 1
        elif keyword in experience_text:
            high_value_hits += 0.3  # Partial credit for having the skill even if not required

    # Count generic requirement overlap
    requirement_words = set(requirements_text.split())
    experience_words = set(experience_text.split())
    generic_overlap = len(requirement_words & experience_words)

    # Combine: high-value hits matter much more
    score = min((high_value_hits * 0.15) + (generic_overlap * 0.01), 1.0)
    return max(score, 0.1)  # Floor at 0.1


def score_posting_base(
    profile: StudentProfile,
    posting: Posting,
    firm: Firm,
    user_class_year: str,
) -> tuple[int, ScoreBreakdown] | None:
    """Compute the deterministic base fit score for a (profile, posting) pair.

    Returns None if the posting is filtered out by hard constraints (wrong
    class year). Otherwise returns a tuple of (total_score, breakdown).

    Args:
        profile: The student's parsed profile.
        posting: The job posting to score against.
        firm: The firm that owns this posting.
        user_class_year: The student's current class year.

    Returns:
        Tuple of (integer score 0-100, ScoreBreakdown), or None if hard-filtered.
    """
    # Hard filter: class year must match
    if not _check_class_year_eligible(user_class_year, posting):
        return None

    # Skip closed postings
    if posting.closed_at is not None:
        return None

    gpa_score = _score_gpa(profile, firm) * WEIGHT_GPA
    role_score = _score_role_match(profile, posting) * WEIGHT_ROLE_MATCH
    coursework_score = _score_coursework(profile, firm, posting.role_type) * WEIGHT_COURSEWORK
    geo_score = _score_geography(profile, posting) * WEIGHT_GEOGRAPHY
    experience_score = _score_experience(profile, posting) * WEIGHT_EXPERIENCE

    # Class year weight goes to full points since we passed the hard filter
    class_year_score = WEIGHT_CLASS_YEAR

    breakdown = ScoreBreakdown(
        gpa=round(gpa_score),
        class_year=class_year_score,
        role_match=round(role_score),
        coursework=round(coursework_score),
        geography=round(geo_score),
        experience=round(experience_score),
    )

    total = gpa_score + class_year_score + role_score + coursework_score + geo_score + experience_score
    return max(0, min(100, round(total))), breakdown


def score_all_postings(
    profile: StudentProfile,
    postings: list[Posting],
    firms: dict[UUID, Firm],
    user_class_year: str,
) -> list[tuple[Posting, Firm, int, ScoreBreakdown]]:
    """Score all postings and return sorted by score descending.

    Postings that are hard-filtered (wrong class year, closed) are excluded.

    Args:
        profile: The student's parsed profile.
        postings: All available postings.
        firms: Mapping of firm_id to Firm objects.
        user_class_year: The student's current class year.

    Returns:
        List of (Posting, Firm, base_score, ScoreBreakdown) tuples, sorted by score descending.
    """
    results: list[tuple[Posting, Firm, int, ScoreBreakdown]] = []

    for posting in postings:
        firm = firms.get(posting.firm_id)
        if firm is None:
            continue

        result = score_posting_base(profile, posting, firm, user_class_year)
        if result is not None:
            score, breakdown = result
            results.append((posting, firm, score, breakdown))

    results.sort(key=lambda x: x[2], reverse=True)
    return results


def compute_tier(score: int) -> Literal["strong_match", "reach", "long_shot", "not_recommended"]:
    """Map a numeric score to a tier label.

    Args:
        score: Final fit score, 0-100.

    Returns:
        Tier string per ADR 0003.
    """
    if score >= 85:
        return "strong_match"
    elif score >= 70:
        return "reach"
    elif score >= 55:
        return "long_shot"
    else:
        return "not_recommended"


def apply_qualitative_pass(
    profile: StudentProfile,
    top_postings: list[tuple[Posting, Firm, int, ScoreBreakdown]],
    limit: int = 30,
) -> list[FitScore]:
    """Apply Claude's qualitative scoring pass to the top N deterministic matches.

    For each posting in the top N, calls Claude to get an adjustment (±15),
    tier, rationale, strengths, and gaps. Returns the final FitScore objects
    with per-factor breakdowns attached.

    Args:
        profile: The student's parsed profile.
        top_postings: List of (Posting, Firm, base_score, ScoreBreakdown) tuples, pre-sorted.
        limit: Number of top postings to run through Claude. Default 30.

    Returns:
        List of FitScore objects with Claude-enhanced scoring and breakdowns.
    """
    fit_scores: list[FitScore] = []
    postings_to_score = top_postings[:limit]

    for posting, firm, base_score, breakdown in postings_to_score:
        try:
            result = score_fit_qualitative(profile, posting, base_score)

            adjustment = max(-15, min(15, result.get("adjustment", 0)))
            final_score = max(0, min(100, base_score + adjustment))
            tier = compute_tier(final_score)

            fit_score = FitScore(
                user_id=profile.user_id,
                posting_id=posting.id,
                score=final_score,
                tier=tier,
                rationale=result.get("rationale", ""),
                strengths=result.get("strengths", []),
                gaps=result.get("gaps", []),
                breakdown=breakdown,
                computed_at=datetime.now(timezone.utc),
            )
            fit_scores.append(fit_score)

            logger.info(
                "fit_scorer.qualitative.scored",
                extra={
                    "posting_id": str(posting.id),
                    "firm": firm.name,
                    "base_score": base_score,
                    "adjustment": adjustment,
                    "final_score": final_score,
                    "tier": tier,
                },
            )

        except Exception as e:
            # Qualitative pass failure should not break the pipeline.
            # Fall back to base score with a generic rationale.
            logger.warning(
                "fit_scorer.qualitative.failed",
                extra={"posting_id": str(posting.id), "error": str(e)},
            )
            tier = compute_tier(base_score)
            fit_score = FitScore(
                user_id=profile.user_id,
                posting_id=posting.id,
                score=base_score,
                tier=tier,
                rationale=f"Base score {base_score}/100 based on GPA, coursework, and experience match. Qualitative review unavailable.",
                strengths=["Deterministic scoring completed successfully"],
                gaps=["Qualitative review could not be completed — retry later"],
                breakdown=breakdown,
                computed_at=datetime.now(timezone.utc),
            )
            fit_scores.append(fit_score)

    return fit_scores
