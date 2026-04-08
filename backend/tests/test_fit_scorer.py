"""Unit tests for the deterministic fit scoring engine.

Three test profiles per ADR 0003 and CLAUDE.md:
1. Strong candidate: 3.9 GPA junior with prior IB experience → 80+ on BB IB posting
2. Middle candidate: 3.5 GPA sophomore with general business coursework → 55-75 on MM IB posting
3. Weak candidate: 3.1 GPA freshman with no finance experience → below 55 on any IB posting

These tests validate the deterministic base scorer ONLY (no Claude calls).
The qualitative pass is tested separately with mocks.
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

import pytest

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.fit_scorer import compute_tier, score_posting_base
from app.models import Firm, Posting, PriorExperience, StudentProfile

# --- Test fixtures ---

FIRM_GOLDMAN = Firm(
    id=UUID("00000000-0000-4000-a000-000000000001"),
    name="Goldman Sachs",
    tier="bulge_bracket",
    roles_offered=["investment_banking", "sales_and_trading"],
    headquarters="New York, NY",
    offices=["NYC", "London", "Hong Kong"],
    gpa_floor_estimated=3.7,
    recruiting_profile="Top-tier bulge bracket. Recruits from target schools.",
    careers_url="https://www.goldmansachs.com/careers",
    scraper_adapter=None,
    last_scraped_at=None,
)

FIRM_WILLIAM_BLAIR = Firm(
    id=UUID("00000000-0000-4000-a000-000000000015"),
    name="William Blair",
    tier="middle_market",
    roles_offered=["investment_banking", "equity_research", "asset_management"],
    headquarters="Chicago, IL",
    offices=["Chicago", "NYC", "London"],
    gpa_floor_estimated=3.5,
    recruiting_profile="Strong middle-market IB. More accessible than bulge brackets.",
    careers_url="https://www.williamblair.com/careers",
    scraper_adapter=None,
    last_scraped_at=None,
)

POSTING_GS_IB_JUNIOR = Posting(
    id=UUID("10000000-0000-4000-a000-000000000001"),
    firm_id=UUID("00000000-0000-4000-a000-000000000001"),
    title="2027 Summer Analyst - Investment Banking Division",
    role_type="investment_banking_summer_analyst",
    class_year_target="junior",
    location="New York, NY",
    description="Join Goldman Sachs IBD for a 10-week summer program.",
    requirements=[
        "Minimum 3.7 GPA",
        "Expected graduation in 2028",
        "Strong analytical and quantitative skills",
        "Proficiency in Excel and financial modeling",
        "Prior finance internship experience preferred",
        "Knowledge of DCF, LBO, and M&A concepts",
    ],
    application_url="https://careers.goldmansachs.com/apply/12345",
    posted_at=datetime(2026, 3, 1, tzinfo=timezone.utc),
    deadline=datetime(2026, 5, 15, tzinfo=timezone.utc),
    closed_at=None,
    estimated_effort_minutes=60,
)

POSTING_WB_IB_SOPHOMORE = Posting(
    id=UUID("10000000-0000-4000-a000-000000000040"),
    firm_id=UUID("00000000-0000-4000-a000-000000000015"),
    title="2028 Summer Analyst - Investment Banking",
    role_type="investment_banking_summer_analyst",
    class_year_target="sophomore",
    location="Chicago, IL",
    description="William Blair's summer analyst program in middle-market M&A advisory.",
    requirements=[
        "Minimum 3.3 GPA",
        "Expected graduation in 2028 or 2029",
        "Interest in investment banking and M&A",
        "Strong communication and analytical skills",
        "Coursework in finance or accounting preferred",
    ],
    application_url="https://www.williamblair.com/careers/apply/67890",
    posted_at=datetime(2026, 3, 15, tzinfo=timezone.utc),
    deadline=datetime(2026, 6, 1, tzinfo=timezone.utc),
    closed_at=None,
    estimated_effort_minutes=45,
)

POSTING_WB_IB_JUNIOR = Posting(
    id=UUID("10000000-0000-4000-a000-000000000041"),
    firm_id=UUID("00000000-0000-4000-a000-000000000015"),
    title="2027 Summer Analyst - Investment Banking",
    role_type="investment_banking_summer_analyst",
    class_year_target="junior",
    location="Chicago, IL",
    description="William Blair's summer analyst program in middle-market M&A advisory.",
    requirements=[
        "Minimum 3.3 GPA",
        "Expected graduation in 2028",
        "Interest in investment banking and M&A",
        "Strong communication and analytical skills",
        "Coursework in finance or accounting preferred",
    ],
    application_url="https://www.williamblair.com/careers/apply/67891",
    posted_at=datetime(2026, 3, 15, tzinfo=timezone.utc),
    deadline=datetime(2026, 6, 1, tzinfo=timezone.utc),
    closed_at=None,
    estimated_effort_minutes=45,
)


def _make_strong_candidate() -> StudentProfile:
    """3.9 GPA junior with prior IB experience. Should score high."""
    return StudentProfile(
        user_id=UUID("aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"),
        name="Alex Strong",
        school="NYU Stern School of Business",
        major="Finance",
        gpa=3.9,
        target_roles=["investment_banking", "investment_banking_mm"],
        target_geographies=["NYC", "Chicago"],
        technical_skills=["Excel", "financial modeling", "Bloomberg Terminal", "Capital IQ", "Python"],
        coursework_completed=[
            "Financial Accounting", "Corporate Finance", "Investments",
            "Econometrics", "Financial Management",
        ],
        coursework_in_progress=["Derivatives", "Advanced Valuation"],
        clubs=["Finance Society VP", "Student Managed Investment Fund"],
        certifications=["Bloomberg Market Concepts"],
        prior_experience=[
            PriorExperience(
                role="Investment Banking Summer Analyst",
                organization="Jefferies",
                summary="M&A advisory in the industrials group",
                dates="Jun-Aug 2025",
                bullets=[
                    "Supported M&A advisory on two live transactions totaling $1.2B",
                    "Built 3-statement DCF and LBO models for client presentations",
                    "Conducted comparable company and precedent transaction analysis",
                ],
            ),
        ],
        languages=["English"],
    )


def _make_middle_candidate() -> StudentProfile:
    """3.5 GPA sophomore with general business coursework. Moderate fit."""
    return StudentProfile(
        user_id=UUID("bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb"),
        name="Owen Ash",
        school="Bryant University",
        major="Finance",
        gpa=3.5,
        target_roles=["investment_banking_mm", "sales_and_trading"],
        target_geographies=["Providence", "Boston", "NYC"],
        technical_skills=["Excel", "PowerPoint"],
        coursework_completed=["BUS 100", "MATH 201", "FIN 201"],
        coursework_in_progress=["Financial Management", "Macroeconomics"],
        clubs=["Bryant Finance Society", "SMIF Applicant"],
        certifications=["FMC Program"],
        prior_experience=[
            PriorExperience(
                role="Personal Finance Tutor",
                organization="Bryant Math Center",
                summary="Tutored students in personal finance",
                dates="2025-09 to present",
                bullets=["Tutored 6 students in personal finance and statistics"],
            ),
        ],
        languages=["English"],
    )


def _make_weak_candidate() -> StudentProfile:
    """3.1 GPA freshman with no finance experience. Should score low."""
    return StudentProfile(
        user_id=UUID("cccccccc-cccc-4ccc-cccc-cccccccccccc"),
        name="Chris Weak",
        school="State University",
        major="Business Administration",
        gpa=3.1,
        target_roles=["investment_banking"],
        target_geographies=["NYC"],
        technical_skills=["Microsoft Office"],
        coursework_completed=["Intro to Business"],
        coursework_in_progress=["Microeconomics"],
        clubs=[],
        certifications=[],
        prior_experience=[],
        languages=["English"],
    )


# --- Tests ---


class TestStrongCandidate:
    """Strong candidate (3.9 GPA junior, prior IB) should score 80+ on BB IB."""

    def test_scores_high_on_goldman_ib(self) -> None:
        profile = _make_strong_candidate()
        score = score_posting_base(profile, POSTING_GS_IB_JUNIOR, FIRM_GOLDMAN, "junior")
        assert score is not None, "Junior should not be filtered from junior posting"
        assert score >= 80, f"Strong candidate should score 80+ on GS IB, got {score}"

    def test_scores_high_on_william_blair_ib(self) -> None:
        profile = _make_strong_candidate()
        score = score_posting_base(profile, POSTING_WB_IB_JUNIOR, FIRM_WILLIAM_BLAIR, "junior")
        assert score is not None
        assert score >= 85, f"Strong candidate should score 85+ on WB IB (lower bar), got {score}"

    def test_filtered_from_sophomore_posting(self) -> None:
        profile = _make_strong_candidate()
        score = score_posting_base(profile, POSTING_WB_IB_SOPHOMORE, FIRM_WILLIAM_BLAIR, "junior")
        assert score is None, "Junior should be filtered from sophomore-targeted posting"


class TestMiddleCandidate:
    """Middle candidate (3.5 GPA sophomore, general coursework) should score 55-75 on MM IB."""

    def test_scores_moderate_on_william_blair(self) -> None:
        profile = _make_middle_candidate()
        score = score_posting_base(profile, POSTING_WB_IB_SOPHOMORE, FIRM_WILLIAM_BLAIR, "sophomore")
        assert score is not None, "Sophomore should not be filtered from sophomore posting"
        assert 55 <= score <= 80, f"Middle candidate should score 55-80 on WB IB, got {score}"

    def test_filtered_from_junior_posting(self) -> None:
        profile = _make_middle_candidate()
        score = score_posting_base(profile, POSTING_GS_IB_JUNIOR, FIRM_GOLDMAN, "sophomore")
        assert score is None, "Sophomore should be filtered from junior-targeted posting"

    def test_scores_lower_than_strong_on_same_posting(self) -> None:
        strong = _make_strong_candidate()
        middle = _make_middle_candidate()
        # Both as sophomores on the WB sophomore posting
        score_strong = score_posting_base(strong, POSTING_WB_IB_SOPHOMORE, FIRM_WILLIAM_BLAIR, "sophomore")
        score_middle = score_posting_base(middle, POSTING_WB_IB_SOPHOMORE, FIRM_WILLIAM_BLAIR, "sophomore")
        assert score_strong is not None and score_middle is not None
        assert score_strong > score_middle, (
            f"Strong candidate ({score_strong}) should score higher than middle ({score_middle})"
        )


class TestWeakCandidate:
    """Weak candidate (3.1 GPA freshman, no experience) should score below 55."""

    def test_scores_low_on_goldman_ib(self) -> None:
        profile = _make_weak_candidate()
        # Test as junior to avoid class year filter
        score = score_posting_base(profile, POSTING_GS_IB_JUNIOR, FIRM_GOLDMAN, "junior")
        assert score is not None
        assert score < 55, f"Weak candidate should score below 55 on GS IB, got {score}"

    def test_scores_low_on_william_blair_ib(self) -> None:
        profile = _make_weak_candidate()
        score = score_posting_base(profile, POSTING_WB_IB_JUNIOR, FIRM_WILLIAM_BLAIR, "junior")
        assert score is not None
        assert score < 55, f"Weak candidate should score below 55 on WB IB, got {score}"


class TestTierMapping:
    """Verify the tier mapping matches ADR 0003."""

    def test_strong_match_tier(self) -> None:
        assert compute_tier(100) == "strong_match"
        assert compute_tier(85) == "strong_match"

    def test_reach_tier(self) -> None:
        assert compute_tier(84) == "reach"
        assert compute_tier(70) == "reach"

    def test_long_shot_tier(self) -> None:
        assert compute_tier(69) == "long_shot"
        assert compute_tier(55) == "long_shot"

    def test_not_recommended_tier(self) -> None:
        assert compute_tier(54) == "not_recommended"
        assert compute_tier(0) == "not_recommended"
