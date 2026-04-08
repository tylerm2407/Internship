"""Personalized recruiting timeline builder for InternshipMatch.

Generates calendar events based on the student's class year, target roles,
and diversity status. Produces weekly summaries with urgent items, overdue
tasks, networking nudges, and progress stats.

The timeline is the connective tissue between the firm database, the
application tracker, and the networking radar -- it tells students what
to do and when to do it.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID

from app.models import (
    Application,
    FitScore,
    NetworkingContact,
    Posting,
    PrepSession,
    TimelineEvent,
    WeeklySummary,
)

logger = logging.getLogger(__name__)

ClassYear = Literal["freshman", "sophomore", "junior", "senior"]


# ============================================================
# Phase Templates
# ============================================================
# Maps (class_year, role_type) to recruiting phases.
# Each phase: (name, description, start_month, end_month).
# Months are 1-indexed. Phases that cross year boundaries
# (e.g., Jul-Sep for juniors) use the academic year convention:
# the year starts in August/September.

_IB_PHASES: dict[ClassYear, list[tuple[str, str, int, int]]] = {
    "freshman": [
        (
            "Explore",
            "Attend info sessions, join finance clubs, start learning what IB actually is.",
            9, 12,
        ),
        (
            "Diversity/Early Insight Apps",
            "Apply to diversity and early insight programs at bulge brackets. These have January-March deadlines.",
            1, 3,
        ),
        (
            "Spring Networking",
            "Build relationships with upperclassmen and alumni. Attend career fairs and club events.",
            4, 5,
        ),
    ],
    "sophomore": [
        (
            "Diversity Programs Open",
            "Diversity sophomore programs at GS, JPM, MS open early. Apply immediately.",
            9, 10,
        ),
        (
            "Early Insight Programs",
            "Early insight and sophomore leadership programs. Deadlines cluster in November-January.",
            11, 1,
        ),
        (
            "Sophomore Programs",
            "Main wave of sophomore-specific programs. Network heavily with bankers.",
            2, 4,
        ),
        (
            "Summer Prep",
            "Technical prep for recruiting season. Master accounting, valuation, and M&A concepts.",
            5, 6,
        ),
        (
            "Main Wave Opens",
            "Junior summer analyst applications open. Submit early -- many firms review on a rolling basis.",
            7, 8,
        ),
    ],
    "junior": [
        (
            "Application Blitz",
            "Applications are open. Submit to all target firms. Quality over quantity but don't miss deadlines.",
            7, 9,
        ),
        (
            "HireVue/First Rounds",
            "HireVue video interviews and first-round phone screens. Practice behavioral and technical questions daily.",
            9, 11,
        ),
        (
            "Superdays",
            "On-site final rounds. Dress sharp, know your story, have 3 deals ready to discuss.",
            10, 12,
        ),
        (
            "Offer Decisions",
            "Offers come in. Evaluate comp, culture, and group placement. Decide before exploding deadlines.",
            12, 2,
        ),
    ],
    "senior": [
        (
            "Full-Time Apps",
            "Full-time analyst applications for those without return offers. Leverage junior summer experience.",
            8, 11,
        ),
        (
            "Interviews",
            "Full-time interview cycles. Similar structure to summer but fewer spots.",
            10, 1,
        ),
        (
            "Offers",
            "Full-time offers and decisions. Negotiate start dates and signing bonuses where possible.",
            1, 4,
        ),
    ],
}

# Default role type. Expand this dict as more role types are added.
PHASE_TEMPLATES: dict[tuple[ClassYear, str], list[tuple[str, str, int, int]]] = {}

for _cy, _phases in _IB_PHASES.items():
    PHASE_TEMPLATES[(_cy, "investment_banking")] = _phases
    # Alias common role type variants to the same phases for now.
    PHASE_TEMPLATES[(_cy, "investment_banking_mm")] = _phases
    PHASE_TEMPLATES[(_cy, "investment_banking_eb")] = _phases
    PHASE_TEMPLATES[(_cy, "investment_banking_bb")] = _phases

# Sales & trading and other roles reuse the same rough calendar in Phase 1.
# Differentiated timelines will be added in Phase 2.
for _cy in ("freshman", "sophomore", "junior", "senior"):
    for _rt in ("sales_and_trading", "equity_research", "asset_management", "private_equity", "quant"):
        PHASE_TEMPLATES[(_cy, _rt)] = _IB_PHASES[_cy]  # type: ignore[index]


def _academic_year_for_date(dt: datetime) -> int:
    """Return the academic year for a given date.

    Academic year starts in August. A date in Sep 2026 is academic year 2026.
    A date in May 2027 is still academic year 2026.

    Args:
        dt: The date to evaluate.

    Returns:
        The academic year as an integer.
    """
    if dt.month >= 8:
        return dt.year
    return dt.year - 1


def _phase_date_range(
    start_month: int,
    end_month: int,
    reference_year: int,
) -> tuple[datetime, datetime]:
    """Compute start and end datetimes for a phase given month boundaries.

    Handles phases that wrap around the calendar year (e.g., Dec-Feb).

    Args:
        start_month: Starting month (1-12).
        end_month: Ending month (1-12).
        reference_year: The academic year to anchor to.

    Returns:
        Tuple of (phase_start, phase_end) as timezone-aware datetimes.
    """
    if start_month >= 8:
        start_year = reference_year
    else:
        start_year = reference_year + 1

    if end_month >= 8:
        end_year = reference_year
    else:
        end_year = reference_year + 1

    phase_start = datetime(start_year, start_month, 1, tzinfo=timezone.utc)
    # End on the last day of the end month (approximate with 28th for simplicity,
    # but use the 1st of the next month minus 1 day for accuracy).
    if end_month == 12:
        phase_end = datetime(end_year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
    else:
        next_month = end_month + 1
        phase_end = datetime(end_year, next_month, 1, tzinfo=timezone.utc) - timedelta(seconds=1)

    return phase_start, phase_end


# ============================================================
# Core Functions
# ============================================================


def generate_timeline_events(
    user_id: UUID,
    class_year: ClassYear,
    target_roles: list[str],
    diversity_status: str | None,
    postings: list[Posting],
    fit_scores: dict[UUID, FitScore] | None = None,
) -> list[TimelineEvent]:
    """Generate personalized recruiting timeline events for a student.

    Combines phase-based milestones, posting deadlines, diversity program
    events, networking reminders, and prep milestones into a single
    chronological event list.

    Args:
        user_id: The student's user ID.
        class_year: Current class year (freshman/sophomore/junior/senior).
        target_roles: List of role types the student is targeting.
        diversity_status: Diversity program eligibility (e.g., 'african_american',
            'hispanic', 'first_gen'). None if not applicable or not disclosed.
        postings: List of open postings relevant to this student.
        fit_scores: Optional mapping of posting_id -> FitScore for priority
            assignment. If a posting's fit score > 70, its deadline gets
            critical priority.

    Returns:
        List of TimelineEvent objects sorted by event_date ascending.
    """
    if fit_scores is None:
        fit_scores = {}

    events: list[TimelineEvent] = []
    now = datetime.now(timezone.utc)
    academic_year = _academic_year_for_date(now)

    # --- Phase-based milestone events ---
    roles_processed: set[str] = set()
    for role in target_roles:
        key = (class_year, role)
        if key not in PHASE_TEMPLATES:
            logger.warning(
                "No phase template found",
                extra={"class_year": class_year, "role": role},
            )
            continue
        if role in roles_processed:
            continue
        roles_processed.add(role)

        for phase_name, phase_desc, start_month, end_month in PHASE_TEMPLATES[key]:
            phase_start, _ = _phase_date_range(start_month, end_month, academic_year)
            events.append(
                TimelineEvent(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    event_type="application_open",
                    title=phase_name,
                    description=phase_desc,
                    event_date=phase_start,
                    priority="high",
                )
            )

    # --- Posting deadline events ---
    for posting in postings:
        if posting.deadline is None:
            continue
        if posting.closed_at is not None:
            continue

        score = fit_scores.get(posting.id)
        priority: Literal["critical", "high", "medium", "low"] = "medium"
        if score is not None and score.score > 70:
            priority = "critical"
        elif score is not None and score.score > 50:
            priority = "high"

        events.append(
            TimelineEvent(
                id=uuid.uuid4(),
                user_id=user_id,
                event_type="application_deadline",
                title=f"Deadline: {posting.title}",
                description=f"Application deadline for {posting.title} in {posting.location}.",
                firm_id=posting.firm_id,
                posting_id=posting.id,
                event_date=posting.deadline,
                priority=priority,
            )
        )

    # --- Diversity program events ---
    if diversity_status:
        _add_diversity_events(events, user_id, class_year, academic_year)

    # --- Networking milestones ---
    _add_networking_milestones(events, user_id, class_year, target_roles, academic_year)

    # --- Prep milestones ---
    _add_prep_milestones(events, user_id, class_year, target_roles, academic_year)

    events.sort(key=lambda e: e.event_date)

    logger.info(
        "timeline.generated",
        extra={
            "user_id": str(user_id),
            "class_year": class_year,
            "target_roles": target_roles,
            "events_count": len(events),
        },
    )

    return events


def _add_diversity_events(
    events: list[TimelineEvent],
    user_id: UUID,
    class_year: ClassYear,
    academic_year: int,
) -> None:
    """Append diversity-specific program events to the event list.

    Diversity programs typically have earlier deadlines than the main
    recruiting wave. This adds reminders for the major programs.

    Args:
        events: Mutable list to append events to.
        user_id: The student's user ID.
        class_year: Current class year.
        academic_year: The current academic year.
    """
    diversity_events: dict[ClassYear, list[tuple[str, str, int, int]]] = {
        "freshman": [
            ("Freshman Diversity Programs", "GS Possibilities Summit, JPM Launching Leaders -- apply early.", 10, 15),
            ("Diversity App Follow-up", "Follow up on diversity program applications. Check email daily.", 2, 1),
        ],
        "sophomore": [
            ("Sophomore Diversity Programs Open", "GS, MS, JPM diversity sophomore programs. Earliest deadlines in the cycle.", 8, 15),
            ("Diversity Program Interviews", "Phone screens and interviews for diversity programs.", 10, 1),
        ],
        "junior": [
            ("Diversity Recruiting Events", "Attend SEO, MLT, Sponsors for Educational Opportunity events.", 7, 1),
            ("Diversity Early Offers", "Some diversity programs extend early offers. Be ready to decide.", 9, 15),
        ],
        "senior": [
            ("Full-Time Diversity Programs", "Diversity full-time pipelines for those without return offers.", 8, 1),
        ],
    }

    for title, desc, month, day in diversity_events.get(class_year, []):
        if month >= 8:
            year = academic_year
        else:
            year = academic_year + 1
        events.append(
            TimelineEvent(
                id=uuid.uuid4(),
                user_id=user_id,
                event_type="diversity_program",
                title=title,
                description=desc,
                event_date=datetime(year, month, day, tzinfo=timezone.utc),
                priority="high",
            )
        )


def _add_networking_milestones(
    events: list[TimelineEvent],
    user_id: UUID,
    class_year: ClassYear,
    _target_roles: list[str],
    academic_year: int,
) -> None:
    """Append networking milestone events.

    Adds "Start networking at target firms" 3 months before the application
    wave opens for the student's class year.

    Args:
        events: Mutable list to append events to.
        user_id: The student's user ID.
        class_year: Current class year.
        target_roles: Target role types.
        academic_year: The current academic year.
    """
    # Determine when apps open for this class year, then subtract 3 months.
    app_open_months: dict[ClassYear, int] = {
        "freshman": 1,   # Diversity/early insight apps open ~Jan
        "sophomore": 7,  # Main wave opens ~Jul
        "junior": 7,     # Application blitz ~Jul
        "senior": 8,     # Full-time apps ~Aug
    }

    app_month = app_open_months[class_year]
    # Networking should start 3 months before apps open.
    net_month = app_month - 3
    if net_month <= 0:
        net_month += 12

    if net_month >= 8:
        net_year = academic_year
    else:
        net_year = academic_year + 1

    events.append(
        TimelineEvent(
            id=uuid.uuid4(),
            user_id=user_id,
            event_type="networking_task",
            title="Start networking at target firms",
            description=(
                "Begin reaching out to alumni and contacts at your target firms. "
                "Aim for 2-3 coffee chats per week. Use the Networking Radar to find connections."
            ),
            event_date=datetime(net_year, net_month, 1, tzinfo=timezone.utc),
            priority="high",
        )
    )

    # Add a follow-up networking push 1 month before apps open.
    push_month = app_month - 1
    if push_month <= 0:
        push_month += 12
    if push_month >= 8:
        push_year = academic_year
    else:
        push_year = academic_year + 1

    events.append(
        TimelineEvent(
            id=uuid.uuid4(),
            user_id=user_id,
            event_type="networking_task",
            title="Networking push before applications open",
            description=(
                "Applications open soon. Intensify networking. Ask contacts for referrals "
                "and insider tips on the application process."
            ),
            event_date=datetime(push_year, push_month, 1, tzinfo=timezone.utc),
            priority="high",
        )
    )


def _add_prep_milestones(
    events: list[TimelineEvent],
    user_id: UUID,
    class_year: ClassYear,
    _target_roles: list[str],
    academic_year: int,
) -> None:
    """Append interview prep milestone events.

    Adds "Begin technical prep" 6 weeks before interview season starts
    for the student's class year.

    Args:
        events: Mutable list to append events to.
        user_id: The student's user ID.
        class_year: Current class year.
        target_roles: Target role types.
        academic_year: The current academic year.
    """
    # Interview season start months by class year.
    interview_start: dict[ClassYear, int] = {
        "freshman": 3,   # Spring -- mostly informational
        "sophomore": 9,  # Fall of junior year (prep starts summer before)
        "junior": 9,     # HireVue/first rounds
        "senior": 10,    # Full-time interviews
    }

    interview_month = interview_start[class_year]
    # 6 weeks before = ~1.5 months before. Round to 2 months for cleaner dates.
    prep_month = interview_month - 2
    if prep_month <= 0:
        prep_month += 12

    if prep_month >= 8:
        prep_year = academic_year
    else:
        prep_year = academic_year + 1

    events.append(
        TimelineEvent(
            id=uuid.uuid4(),
            user_id=user_id,
            event_type="prep_milestone",
            title="Begin technical prep",
            description=(
                "Start daily technical interview prep. Focus on accounting, valuation, "
                "and M&A concepts. Use the Prep Coach for structured practice sessions."
            ),
            event_date=datetime(prep_year, prep_month, 1, tzinfo=timezone.utc),
            priority="high",
        )
    )

    # Add a "Mock interview week" reminder 2 weeks before interview season.
    mock_date = datetime(
        academic_year if interview_month >= 8 else academic_year + 1,
        interview_month,
        1,
        tzinfo=timezone.utc,
    ) - timedelta(weeks=2)

    events.append(
        TimelineEvent(
            id=uuid.uuid4(),
            user_id=user_id,
            event_type="prep_milestone",
            title="Mock interview week",
            description=(
                "Schedule mock interviews with peers and career services. "
                "Practice your story, 3 deal discussions, and firm-specific 'why us' answers."
            ),
            event_date=mock_date,
            priority="high",
        )
    )


def get_current_phase(
    class_year: ClassYear,
    target_roles: list[str],
    current_date: datetime | None = None,
) -> dict[str, str | float]:
    """Determine the student's current recruiting phase and progress.

    Args:
        class_year: Current class year.
        target_roles: List of target role types. Uses the first role
            with a matching template.
        current_date: Override for testing. Defaults to now (UTC).

    Returns:
        Dict with keys:
            - phase_name: Name of the current phase.
            - phase_description: Description of what to focus on.
            - progress_pct: Float 0.0-100.0 indicating progress through the phase.

        If no phase matches, returns a generic "Off-Cycle" phase.
    """
    if current_date is None:
        current_date = datetime.now(timezone.utc)

    academic_year = _academic_year_for_date(current_date)

    for role in target_roles:
        key = (class_year, role)
        if key not in PHASE_TEMPLATES:
            continue

        for phase_name, phase_desc, start_month, end_month in PHASE_TEMPLATES[key]:
            phase_start, phase_end = _phase_date_range(start_month, end_month, academic_year)

            if phase_start <= current_date <= phase_end:
                total_duration = (phase_end - phase_start).total_seconds()
                elapsed = (current_date - phase_start).total_seconds()
                progress = (elapsed / total_duration) * 100.0 if total_duration > 0 else 0.0

                logger.info(
                    "timeline.current_phase",
                    extra={
                        "class_year": class_year,
                        "phase_name": phase_name,
                        "progress_pct": round(progress, 1),
                    },
                )

                return {
                    "phase_name": phase_name,
                    "phase_description": phase_desc,
                    "progress_pct": round(progress, 1),
                }

    return {
        "phase_name": "Off-Cycle",
        "phase_description": (
            "No active recruiting phase right now. Use this time to build skills, "
            "network, and prepare for the next wave."
        ),
        "progress_pct": 0.0,
    }


def build_weekly_summary(
    user_id: UUID,
    events: list[TimelineEvent],
    contacts: list[NetworkingContact],
    applications: list[Application],
    prep_sessions: list[PrepSession] | None = None,
    current_date: datetime | None = None,
    class_year: ClassYear = "sophomore",
    target_roles: list[str] | None = None,
) -> WeeklySummary:
    """Build the 'what to do this week' summary for the timeline page.

    Filters events to the current week, separates by priority, identifies
    overdue items, generates networking nudges, and computes progress stats.

    Args:
        user_id: The student's user ID.
        events: All timeline events for this user.
        contacts: User's networking contacts for nudge generation.
        applications: User's applications for stats.
        prep_sessions: User's prep sessions for stats. Defaults to empty list.
        current_date: Override for testing. Defaults to now (UTC).
        class_year: Student's class year for phase lookup.
        target_roles: Target roles for phase lookup. Defaults to
            ["investment_banking"].

    Returns:
        A WeeklySummary with urgent items, upcoming items, overdue items,
        networking nudges, and summary stats.
    """
    if current_date is None:
        current_date = datetime.now(timezone.utc)
    if prep_sessions is None:
        prep_sessions = []
    if target_roles is None:
        target_roles = ["investment_banking"]

    # Compute week boundaries (Monday to Sunday).
    days_since_monday = current_date.weekday()
    week_start = current_date.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days_since_monday)
    week_end = week_start + timedelta(days=7) - timedelta(seconds=1)

    # Get current phase.
    phase = get_current_phase(class_year, target_roles, current_date)

    # Categorize events.
    urgent: list[TimelineEvent] = []
    upcoming: list[TimelineEvent] = []
    overdue: list[TimelineEvent] = []

    for event in events:
        if not event.completed and event.event_date < week_start:
            # Past due and not completed.
            overdue.append(event)
        elif week_start <= event.event_date <= week_end:
            if event.priority in ("critical", "high"):
                urgent.append(event)
            else:
                upcoming.append(event)

    # Sort sublists by date.
    urgent.sort(key=lambda e: e.event_date)
    upcoming.sort(key=lambda e: e.event_date)
    overdue.sort(key=lambda e: e.event_date)

    # Generate networking nudges.
    nudges = _generate_networking_nudges(contacts, current_date)

    # Compute stats.
    stats = _compute_weekly_stats(applications, contacts, prep_sessions, week_start, week_end)

    summary = WeeklySummary(
        week_start=week_start,
        week_end=week_end,
        phase_name=str(phase["phase_name"]),
        phase_description=str(phase["phase_description"]),
        urgent_items=urgent,
        upcoming_items=upcoming,
        overdue_items=overdue,
        networking_nudges=nudges,
        stats=stats,
    )

    logger.info(
        "timeline.weekly_summary",
        extra={
            "user_id": str(user_id),
            "urgent_count": len(urgent),
            "upcoming_count": len(upcoming),
            "overdue_count": len(overdue),
            "nudge_count": len(nudges),
        },
    )

    return summary


def _generate_networking_nudges(
    contacts: list[NetworkingContact],
    current_date: datetime,
) -> list[str]:
    """Generate nudges for stale networking contacts.

    A contact is considered stale if outreach was sent more than 7 days ago
    and no response has been recorded.

    Args:
        contacts: All networking contacts for the user.
        current_date: The current date for staleness calculation.

    Returns:
        List of human-readable nudge strings.
    """
    nudges: list[str] = []

    for contact in contacts:
        if contact.outreach_status in ("not_contacted", "responded", "call_completed", "thank_you_sent"):
            continue

        if contact.outreach_date is None:
            continue

        days_since = (current_date - contact.outreach_date).days
        if days_since < 7:
            continue

        if contact.outreach_status == "message_sent":
            nudges.append(
                f"Follow up with {contact.contact_name}"
                f"{' at ' + (contact.contact_role or 'their firm') if contact.contact_role else ''}"
                f" -- {days_since} days since initial outreach with no response."
            )
        elif contact.outreach_status == "followed_up":
            nudges.append(
                f"No response from {contact.contact_name} after follow-up"
                f" ({days_since} days). Consider a different contact at the same firm."
            )
        elif contact.outreach_status == "call_scheduled" and contact.call_date:
            if contact.call_date < current_date:
                nudges.append(
                    f"Call with {contact.contact_name} was scheduled for"
                    f" {contact.call_date.strftime('%b %d')}. Did it happen? Update your tracker."
                )

    return nudges


def _compute_weekly_stats(
    applications: list[Application],
    contacts: list[NetworkingContact],
    prep_sessions: list[PrepSession],
    week_start: datetime,
    week_end: datetime,
) -> dict[str, int]:
    """Compute summary stats for the current week.

    Args:
        applications: All user applications.
        contacts: All user networking contacts.
        prep_sessions: All user prep sessions.
        week_start: Start of the current week.
        week_end: End of the current week.

    Returns:
        Dict with keys: applications_submitted, contacts_made,
        prep_sessions_completed.
    """
    apps_this_week = sum(
        1 for app in applications
        if app.applied_at is not None and week_start <= app.applied_at <= week_end
    )

    contacts_this_week = sum(
        1 for c in contacts
        if c.outreach_date is not None and week_start <= c.outreach_date <= week_end
    )

    prep_this_week = sum(
        1 for s in prep_sessions
        if week_start <= s.created_at <= week_end
    )

    return {
        "applications_submitted": apps_this_week,
        "contacts_made": contacts_this_week,
        "prep_sessions_completed": prep_this_week,
    }
