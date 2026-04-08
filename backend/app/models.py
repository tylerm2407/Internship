"""Pydantic data models for InternshipMatch.

Every model in this file is the single source of truth for its data shape.
TypeScript types in the frontend mirror these exactly. All API request and
response bodies are Pydantic models — never raw dicts.

Phase 1 models: User, PriorExperience, StudentProfile, Firm, Posting, FitScore.
Phase 2 models: Application, StatusChange, Alumnus, NetworkingContact,
    PrepSession, PrepAnswer, ReadinessScore, TimelineEvent.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class User(BaseModel):
    """Authenticated user account. One row per user in the `users` table.

    Created on first login via Supabase Auth. The `onboarding_complete` flag
    gates access to the dashboard — users must upload and confirm their
    resume before they can see fit scores.
    """

    id: UUID
    email: str
    created_at: datetime
    school: str = Field(description="e.g. 'Bryant University'")
    graduation_year: int = Field(description="Expected graduation year, e.g. 2029")
    current_class_year: Literal["freshman", "sophomore", "junior", "senior"]
    onboarding_complete: bool = False


class PriorExperience(BaseModel):
    """A single work experience entry extracted from the user's resume.

    Each entry preserves the original bullet points from the resume so the
    fit scorer can analyze the qualitative depth of the experience, not just
    the job title.
    """

    role: str = Field(description="Job title, e.g. 'Investment Banking Summer Analyst'")
    organization: str = Field(description="Employer or organization name")
    summary: str = Field(description="One-line summary of the role")
    dates: str = Field(description="Date range as written on resume, e.g. '2025-09 to present'")
    bullets: list[str] = Field(
        default_factory=list,
        description="Original bullet points from the resume for this experience",
    )


class StudentProfile(BaseModel):
    """Parsed resume data for a single user. One-to-one with User.

    Extracted from the uploaded PDF via Claude Vision, then reviewed and
    confirmed by the user before saving. This is the primary input to the
    fit scoring engine — every field matters.
    """

    user_id: UUID
    name: str
    school: str = Field(description="e.g. 'Bryant University'")
    major: str = Field(description="Primary major, e.g. 'Finance'")
    minor: str | None = None
    gpa: float | None = Field(default=None, description="Cumulative GPA on a 4.0 scale")
    target_roles: list[str] = Field(
        default_factory=list,
        description="Role types the user is targeting, e.g. ['investment_banking_mm', 'sales_and_trading']",
    )
    target_geographies: list[str] = Field(
        default_factory=list,
        description="Cities or regions, e.g. ['NYC', 'Boston', 'Providence']",
    )
    technical_skills: list[str] = Field(default_factory=list)
    coursework_completed: list[str] = Field(
        default_factory=list,
        description="Course codes or names already completed, e.g. ['FIN 201', 'MATH 201']",
    )
    coursework_in_progress: list[str] = Field(
        default_factory=list,
        description="Courses currently being taken this semester",
    )
    clubs: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    prior_experience: list[PriorExperience] = Field(default_factory=list)
    diversity_status: str | None = None
    languages: list[str] = Field(default_factory=list)
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Firm(BaseModel):
    """A company in the InternshipMatch target registry.

    Phase 1 seeds 25 firms across four tiers. The `gpa_floor_estimated` is
    our best estimate of the firm's GPA cutoff based on public data and
    recruiting guides — it's an input to the deterministic fit scorer.
    """

    id: UUID
    name: str = Field(description="Full firm name, e.g. 'William Blair'")
    tier: Literal[
        "bulge_bracket",
        "elite_boutique",
        "middle_market",
        "boutique",
        "regional",
        "buy_side",
        "quant",
    ]
    roles_offered: list[str] = Field(
        description="Role types this firm recruits for, e.g. ['investment_banking', 'capital_markets']",
    )
    headquarters: str = Field(description="City and state, e.g. 'Chicago, IL'")
    offices: list[str] = Field(default_factory=list)
    gpa_floor_estimated: float = Field(
        description="Estimated minimum GPA for competitive candidacy at this firm",
    )
    recruiting_profile: str = Field(
        description="Short description of how this firm recruits interns",
    )
    careers_url: str
    scraper_adapter: str | None = Field(
        default=None,
        description="Python module path for the scraper adapter. Null in Phase 1 (static seed).",
    )
    last_scraped_at: datetime | None = Field(
        default=None,
        description="Timestamp of last successful scrape. Null in Phase 1.",
    )


class Posting(BaseModel):
    """A single open role at a firm.

    In Phase 1, postings come from static seed data. In Phase 2+, they are
    refreshed nightly from the scraper pipeline. Rows are never deleted —
    closed roles are marked with a `closed_at` timestamp so historical data
    is preserved.
    """

    id: UUID
    firm_id: UUID
    title: str = Field(description="e.g. '2027 Summer Analyst - Investment Banking'")
    role_type: str = Field(description="Normalized role type, e.g. 'investment_banking_summer_analyst'")
    class_year_target: Literal["freshman", "sophomore", "junior", "senior"]
    location: str
    description: str = Field(description="Full raw text from the posting")
    requirements: list[str] = Field(description="Parsed bullet list of requirements")
    application_url: str
    posted_at: datetime
    deadline: datetime | None = None
    closed_at: datetime | None = None
    estimated_effort_minutes: int = Field(
        default=45,
        description="Estimated time to complete the application in minutes",
    )


class FitScore(BaseModel):
    """Computed fit score for a (user, posting) pair.

    The score combines a deterministic base (0-100) with a Claude qualitative
    adjustment (±15). Cached with a 24-hour TTL. The rationale, strengths,
    and gaps make the score explainable — users see WHY they scored where
    they did, not just a number.

    Tier mapping:
        85-100: strong_match
        70-84:  reach
        55-69:  long_shot
        0-54:   not_recommended
    """

    user_id: UUID
    posting_id: UUID
    score: int = Field(ge=0, le=100, description="Final fit score 0-100")
    tier: Literal["strong_match", "reach", "long_shot", "not_recommended"]
    rationale: str = Field(description="Claude-generated 2-3 sentence explanation")
    strengths: list[str] = Field(description="2-3 bullet points of what matches well")
    gaps: list[str] = Field(description="2-3 bullet points of what's missing or weak")
    computed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OpportunityResponse(BaseModel):
    """Composite response for a single ranked opportunity on the dashboard.

    Combines the posting, its parent firm, and the user's fit score into
    a single object the frontend can render directly.
    """

    posting: Posting
    firm: Firm
    fit_score: FitScore


# ============================================================
# Phase 2 Models — Application Tracker
# ============================================================

APPLICATION_STATUSES = (
    "researching", "networking", "applied", "hirevue", "phone_screen",
    "first_round", "superday", "offer", "accepted", "declined",
    "rejected", "ghosted",
)

ApplicationStatus = Literal[
    "researching", "networking", "applied", "hirevue", "phone_screen",
    "first_round", "superday", "offer", "accepted", "declined",
    "rejected", "ghosted",
]


class Application(BaseModel):
    """Tracks a single application through the finance recruiting pipeline.

    Finance-native stages: researching → networking → applied → hirevue →
    phone_screen → first_round → superday → offer → accepted/declined/rejected/ghosted.
    Supports group/division-level tracking (e.g., 'Goldman Sachs TMT' vs 'Goldman Sachs Healthcare').
    """

    id: UUID
    user_id: UUID
    posting_id: UUID
    firm_id: UUID
    status: ApplicationStatus = "researching"
    group_division: str | None = Field(
        default=None,
        description="Specific group or division, e.g. 'TMT', 'Healthcare', 'Restructuring'",
    )
    applied_at: datetime | None = None
    notes: str = ""
    next_action: str | None = Field(
        default=None,
        description="What the student needs to do next, e.g. 'Send thank-you to Sarah'",
    )
    next_action_date: datetime | None = None
    resume_version: str | None = Field(
        default=None,
        description="Which resume version was used for this application",
    )
    recruiter_name: str | None = None
    recruiter_email: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ApplicationCreate(BaseModel):
    """Request body for creating a new application."""

    posting_id: UUID
    firm_id: UUID
    status: ApplicationStatus = "researching"
    group_division: str | None = None
    notes: str = ""


class ApplicationUpdate(BaseModel):
    """Request body for updating an application's status or fields."""

    status: ApplicationStatus | None = None
    group_division: str | None = None
    notes: str | None = None
    next_action: str | None = None
    next_action_date: datetime | None = None
    resume_version: str | None = None
    recruiter_name: str | None = None
    recruiter_email: str | None = None


class StatusChange(BaseModel):
    """Audit trail entry for application status changes."""

    id: UUID
    application_id: UUID
    user_id: UUID
    from_status: str
    to_status: str
    changed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: str | None = None


# ============================================================
# Phase 2 Models — Networking Radar / Alumni
# ============================================================


class Alumnus(BaseModel):
    """A known alumni contact at a target firm.

    Privacy-safe: NO email addresses or LinkedIn URLs stored in the database.
    Only name, firm, role, graduation year, and connection hooks (shared clubs,
    major, professors, etc.). Students find actual contact methods themselves.
    """

    id: UUID
    name: str
    firm_id: UUID
    current_role: str
    division: str | None = None
    graduation_year: int
    school: str = "Bryant University"
    major: str | None = None
    connection_hooks: list[str] = Field(
        default_factory=list,
        description="Shared connections, e.g. ['SMIF member', 'Finance major', 'Prof. Johnson class']",
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NetworkingContact(BaseModel):
    """User's personal CRM entry for a networking contact.

    Tracks outreach status, follow-ups, call notes, and referral chains.
    Connected to the alumni database when the contact is a known alum.
    """

    id: UUID
    user_id: UUID
    alumni_id: UUID | None = None
    firm_id: UUID
    contact_name: str
    contact_role: str | None = None
    contact_division: str | None = None
    connection_type: Literal[
        "alumni", "career_fair", "professor_referral", "cold_outreach",
        "referral", "club_connection", "other",
    ]
    referred_by_id: UUID | None = Field(
        default=None,
        description="ID of the NetworkingContact who made the referral",
    )
    outreach_status: Literal[
        "not_contacted", "message_sent", "followed_up", "responded",
        "call_scheduled", "call_completed", "thank_you_sent",
    ] = "not_contacted"
    outreach_date: datetime | None = None
    follow_up_date: datetime | None = None
    call_date: datetime | None = None
    call_notes: str | None = None
    thank_you_sent_at: datetime | None = None
    next_action: str | None = None
    next_action_date: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NetworkingContactCreate(BaseModel):
    """Request body for adding a networking contact."""

    alumni_id: UUID | None = None
    firm_id: UUID
    contact_name: str
    contact_role: str | None = None
    contact_division: str | None = None
    connection_type: Literal[
        "alumni", "career_fair", "professor_referral", "cold_outreach",
        "referral", "club_connection", "other",
    ] = "cold_outreach"
    referred_by_id: UUID | None = None


class OutreachDraftRequest(BaseModel):
    """Request body for generating an AI-drafted outreach message."""

    contact_id: UUID
    tone: Literal["professional", "casual", "warm"] = "professional"


class OutreachDraftResponse(BaseModel):
    """Response with AI-generated outreach message variants."""

    drafts: list[str] = Field(description="2-3 outreach message variants, each under 80 words")
    contact_name: str
    firm_name: str
    connection_hooks_used: list[str]


# ============================================================
# Phase 2 Models — Interview Prep Coach
# ============================================================


class PrepSession(BaseModel):
    """A single interview prep session.

    Tracks questions asked, scores, and Claude feedback. Cross-session
    memory enables readiness scoring and spaced repetition.
    """

    id: UUID
    user_id: UUID
    firm_id: UUID
    role_type: str
    session_type: Literal[
        "technical_accounting", "technical_valuation", "technical_ma",
        "technical_lbo", "behavioral", "firm_specific", "market_awareness",
    ]
    questions_asked: int = 0
    questions_correct: int = 0
    overall_score: int | None = Field(
        default=None, ge=0, le=100,
        description="Overall session score 0-100",
    )
    claude_feedback: str | None = None
    duration_minutes: int | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PrepAnswer(BaseModel):
    """A single question-answer pair within a prep session.

    Stores the question, the student's answer, Claude's evaluation,
    and specific feedback for improvement.
    """

    id: UUID
    session_id: UUID
    user_id: UUID
    question_text: str
    question_category: Literal[
        "accounting", "valuation", "ma", "lbo", "behavioral",
        "firm_specific", "market_awareness", "brain_teaser",
    ]
    question_difficulty: Literal["easy", "medium", "hard"]
    user_answer: str
    score: int = Field(ge=0, le=100, description="Answer score 0-100")
    feedback: str
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReadinessScore(BaseModel):
    """Aggregated mastery score per topic for a user.

    Updated after each prep session. Drives spaced repetition:
    low mastery + long time since practice → needs_review = True.
    """

    user_id: UUID
    category: Literal[
        "accounting", "valuation", "ma", "lbo", "behavioral",
        "firm_specific", "market_awareness", "brain_teaser",
    ]
    mastery_score: float = Field(
        default=0.0, ge=0.0, le=5.0,
        description="Mastery on a 0-5 scale, updated via exponential moving average",
    )
    questions_attempted: int = 0
    last_practiced_at: datetime | None = None
    needs_review: bool = False


class PrepSessionStart(BaseModel):
    """Request body for starting a new prep session."""

    firm_id: UUID
    role_type: str = "investment_banking"
    session_type: Literal[
        "technical_accounting", "technical_valuation", "technical_ma",
        "technical_lbo", "behavioral", "firm_specific", "market_awareness",
    ] = "behavioral"
    question_count: int = Field(default=5, ge=1, le=20)


class PrepAnswerSubmit(BaseModel):
    """Request body for submitting an answer to a prep question."""

    session_id: UUID
    question_text: str
    question_category: Literal[
        "accounting", "valuation", "ma", "lbo", "behavioral",
        "firm_specific", "market_awareness", "brain_teaser",
    ]
    question_difficulty: Literal["easy", "medium", "hard"]
    user_answer: str


# ============================================================
# Phase 2 Models — Recruiting Timeline
# ============================================================


class TimelineEvent(BaseModel):
    """A single event on the user's personalized recruiting calendar.

    Events are generated from posting deadlines, firm app-open dates,
    networking reminders, prep milestones, and user-created custom items.
    """

    id: UUID
    user_id: UUID
    event_type: Literal[
        "application_open", "application_deadline", "diversity_program",
        "networking_task", "prep_milestone", "interview_scheduled",
        "follow_up_reminder", "custom",
    ]
    title: str
    description: str | None = None
    firm_id: UUID | None = None
    posting_id: UUID | None = None
    event_date: datetime
    priority: Literal["critical", "high", "medium", "low"] = "medium"
    completed: bool = False
    completed_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TimelineEventCreate(BaseModel):
    """Request body for creating a custom timeline event."""

    title: str
    description: str | None = None
    firm_id: UUID | None = None
    event_date: datetime
    priority: Literal["critical", "high", "medium", "low"] = "medium"
    event_type: Literal[
        "application_open", "application_deadline", "diversity_program",
        "networking_task", "prep_milestone", "interview_scheduled",
        "follow_up_reminder", "custom",
    ] = "custom"


class WeeklySummary(BaseModel):
    """The 'what to do this week' view for the timeline page."""

    week_start: datetime
    week_end: datetime
    phase_name: str = Field(description="Current recruiting phase, e.g. 'Application Wave'")
    phase_description: str
    urgent_items: list[TimelineEvent] = Field(
        default_factory=list,
        description="Critical/high priority items due this week",
    )
    upcoming_items: list[TimelineEvent] = Field(
        default_factory=list,
        description="Medium/low priority items due this week",
    )
    overdue_items: list[TimelineEvent] = Field(
        default_factory=list,
        description="Past-due items not yet completed",
    )
    networking_nudges: list[str] = Field(
        default_factory=list,
        description="Contextual nudges like 'Follow up with Sarah at Goldman — 12 days since outreach'",
    )
    stats: dict[str, int] = Field(
        default_factory=dict,
        description="Summary stats: applications_submitted, contacts_made, prep_sessions_completed",
    )
