"""Networking Radar module for InternshipMatch.

Surfaces alumni at target firms, scores connection strength against the
student's profile, generates outreach/follow-up/thank-you drafts, and
identifies stale contacts that need attention.

Phase 1: All outreach drafts are template-based. Phase 2 will replace
the template engine with Claude API calls for higher-quality personalization.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.models import (
    Alumnus,
    Firm,
    NetworkingContact,
    OutreachDraftResponse,
    StudentProfile,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 1. Alumni discovery
# ---------------------------------------------------------------------------


def find_alumni_at_firm(
    firm_id: UUID,
    alumni_list: list[Alumnus],
    school: str | None = None,
) -> list[Alumnus]:
    """Filter an alumni list by firm and optionally by school.

    Returns alumni sorted by graduation_year descending so the most recent
    graduates (who are most likely to respond to cold outreach) appear first.

    Args:
        firm_id: The UUID of the target firm.
        alumni_list: The full alumni roster to search through.
        school: Optional school name to narrow results (case-insensitive).

    Returns:
        A list of matching Alumnus objects, newest graduates first.
    """
    matches: list[Alumnus] = []
    for alum in alumni_list:
        if alum.firm_id != firm_id:
            continue
        if school and alum.school.lower() != school.lower():
            continue
        matches.append(alum)

    matches.sort(key=lambda a: a.graduation_year, reverse=True)

    logger.info(
        "alumni_finder.find_alumni_at_firm",
        extra={
            "firm_id": str(firm_id),
            "school_filter": school,
            "results": len(matches),
        },
    )
    return matches


# ---------------------------------------------------------------------------
# 2. Contact prioritization
# ---------------------------------------------------------------------------

_CURRENT_YEAR = datetime.now(timezone.utc).year


def _shared_items(a: list[str], b: list[str]) -> list[str]:
    """Return items present in both lists (case-insensitive)."""
    lower_b = {item.lower() for item in b}
    return [item for item in a if item.lower() in lower_b]


def prioritize_contacts(
    alumni: list[Alumnus],
    profile: StudentProfile,
) -> list[tuple[Alumnus, float, list[str]]]:
    """Score and rank alumni by connection strength to the student.

    Scoring factors:
        - Same school:              +5
        - Same major:               +3
        - Shared club/organization: +4 (per shared club)
        - Same graduation decade:   +2
        - Recent grad (<3 years):   +2

    Args:
        alumni: List of alumni to evaluate.
        profile: The student's parsed profile.

    Returns:
        A list of (alumnus, priority_score, matching_hooks) tuples sorted
        by priority_score descending.
    """
    scored: list[tuple[Alumnus, float, list[str]]] = []

    for alum in alumni:
        score: float = 0.0
        hooks: list[str] = []

        # Same school (+5)
        if alum.school.lower() == profile.school.lower():
            score += 5
            hooks.append(f"Same school: {profile.school}")

        # Same major (+3)
        if alum.major and alum.major.lower() == profile.major.lower():
            score += 3
            hooks.append(f"Same major: {profile.major}")

        # Shared clubs (+4 each)
        shared_clubs = _shared_items(alum.connection_hooks, profile.clubs)
        for club in shared_clubs:
            score += 4
            hooks.append(f"Shared club: {club}")

        # Same graduation decade (+2)
        alum_decade = alum.graduation_year // 10
        current_decade = _CURRENT_YEAR // 10
        if alum_decade == current_decade:
            score += 2
            hooks.append("Same graduation decade")

        # Recent grad — graduated within the last 3 years (+2)
        years_since_grad = _CURRENT_YEAR - alum.graduation_year
        if 0 <= years_since_grad < 3:
            score += 2
            hooks.append(f"Recent grad ({alum.graduation_year})")

        scored.append((alum, score, hooks))

    scored.sort(key=lambda t: t[1], reverse=True)

    logger.info(
        "alumni_finder.prioritize_contacts",
        extra={
            "alumni_count": len(alumni),
            "top_score": scored[0][1] if scored else 0,
        },
    )
    return scored


# ---------------------------------------------------------------------------
# 3. Outreach draft generation
# ---------------------------------------------------------------------------

_OUTREACH_TEMPLATES: dict[str, list[str]] = {
    "professional": [
        (
            "Hi {alum_name}, I'm {student_name}, a {major} student at "
            "{school}. {hook_sentence} I'm very interested in {firm_name}'s "
            "{division_or_work} and would love to hear about your experience. "
            "Would you have 15 minutes for a quick phone call?"
        ),
        (
            "{alum_name} -- my name is {student_name} and I'm studying "
            "{major} at {school}. {hook_sentence} I've been researching "
            "{firm_name} and your path from {school} really stood out. "
            "Could I ask you a few questions over a 15-minute call?"
        ),
        (
            "Hi {alum_name}, I'm {student_name} ({school}, {major}). "
            "{hook_sentence} I'm exploring opportunities at {firm_name} "
            "and would appreciate any insight you could share. Would a "
            "brief 15-minute call work for you sometime this week?"
        ),
    ],
    "casual": [
        (
            "Hey {alum_name}, I'm {student_name} -- {major} at {school}. "
            "{hook_sentence} I've been looking into {firm_name} and your "
            "background really caught my eye. Any chance you'd have 15 "
            "minutes to chat?"
        ),
        (
            "Hi {alum_name}! I'm {student_name}, currently studying "
            "{major} at {school}. {hook_sentence} I'd love to pick your "
            "brain about {firm_name} -- could we hop on a quick call?"
        ),
    ],
    "warm": [
        (
            "Hi {alum_name}, I'm {student_name} from {school}. "
            "{hook_sentence} As a fellow {major} graduate, I was excited "
            "to see your career at {firm_name}. I'd be grateful for 15 "
            "minutes of your time to learn about your experience."
        ),
        (
            "{alum_name}, I'm {student_name} -- a {major} student at "
            "{school}. {hook_sentence} Your path to {firm_name} is exactly "
            "the kind of career I'm working toward. Would you be open to "
            "a short call sometime?"
        ),
    ],
}


def _build_hook_sentence(profile: StudentProfile, alumnus: Alumnus) -> str:
    """Build a single connecting sentence from shared attributes."""
    hooks: list[str] = []
    if alumnus.school.lower() == profile.school.lower():
        hooks.append(f"fellow {profile.school} student")
    if alumnus.major and alumnus.major.lower() == profile.major.lower():
        hooks.append(f"{profile.major} major")
    shared_clubs = _shared_items(alumnus.connection_hooks, profile.clubs)
    if shared_clubs:
        hooks.append(f"{shared_clubs[0]} member")

    if hooks:
        return f"As a {' and '.join(hooks)}, I noticed your profile."
    return f"I came across your background at {alumnus.school} and wanted to reach out."


def generate_outreach_drafts(
    profile: StudentProfile,
    alumnus: Alumnus,
    firm: Firm,
    tone: str = "professional",
) -> OutreachDraftResponse:
    """Generate 2-3 outreach message variants for a networking contact.

    Each draft is under 80 words, references specific connections, mentions
    the firm, and makes one clear ask (15-minute phone call).

    TODO: Replace template engine with Claude API calls via claude_client.py
    for higher-quality, context-aware personalization.

    Args:
        profile: The student's parsed profile.
        alumnus: The alumni contact to reach out to.
        firm: The target firm.
        tone: One of 'professional', 'casual', 'warm'.

    Returns:
        An OutreachDraftResponse with 2-3 message variants.

    Raises:
        ValueError: If tone is not one of the supported values.
    """
    templates = _OUTREACH_TEMPLATES.get(tone)
    if templates is None:
        raise ValueError(
            f"Unsupported tone '{tone}'. Must be one of: professional, casual, warm."
        )

    hook_sentence = _build_hook_sentence(profile, alumnus)
    division_or_work = alumnus.division or "work"

    drafts: list[str] = []
    connection_hooks_used: list[str] = []

    if alumnus.school.lower() == profile.school.lower():
        connection_hooks_used.append(f"Same school: {profile.school}")
    if alumnus.major and alumnus.major.lower() == profile.major.lower():
        connection_hooks_used.append(f"Same major: {profile.major}")
    shared_clubs = _shared_items(alumnus.connection_hooks, profile.clubs)
    for club in shared_clubs:
        connection_hooks_used.append(f"Shared club: {club}")

    for template in templates:
        draft = template.format(
            alum_name=alumnus.name.split()[0],  # first name only
            student_name=profile.name,
            major=profile.major,
            school=profile.school,
            firm_name=firm.name,
            hook_sentence=hook_sentence,
            division_or_work=division_or_work,
        )
        drafts.append(draft)

    logger.info(
        "alumni_finder.generate_outreach_drafts",
        extra={
            "alumnus_id": str(alumnus.id),
            "firm_id": str(firm.id),
            "tone": tone,
            "drafts_generated": len(drafts),
        },
    )

    return OutreachDraftResponse(
        drafts=drafts,
        contact_name=alumnus.name,
        firm_name=firm.name,
        connection_hooks_used=connection_hooks_used,
    )


# ---------------------------------------------------------------------------
# 4. Thank-you draft generation
# ---------------------------------------------------------------------------


def generate_thank_you_draft(
    profile: StudentProfile,
    contact: NetworkingContact,
    firm: Firm,
) -> str:
    """Generate a thank-you note draft (under 60 words) after a call.

    References call notes when available so the message feels personal
    rather than generic.

    TODO: Replace with Claude API call for higher-quality personalization.

    Args:
        profile: The student's parsed profile.
        contact: The networking contact who completed a call.
        firm: The firm the contact works at.

    Returns:
        A thank-you message string under 60 words.
    """
    first_name = contact.contact_name.split()[0]

    if contact.call_notes:
        # Reference something specific from the call
        draft = (
            f"Hi {first_name}, thank you so much for taking the time to "
            f"speak with me about {firm.name}. Your insight on "
            f"{contact.call_notes[:80].rstrip()} was incredibly helpful. "
            f"I really appreciate your generosity. Best, {profile.name}"
        )
    else:
        draft = (
            f"Hi {first_name}, thank you for taking the time to chat about "
            f"your experience at {firm.name}. I learned a lot and your "
            f"perspective was really valuable. I appreciate it. "
            f"Best, {profile.name}"
        )

    logger.info(
        "alumni_finder.generate_thank_you_draft",
        extra={
            "contact_id": str(contact.id),
            "firm_id": str(firm.id),
            "has_call_notes": contact.call_notes is not None,
        },
    )
    return draft


# ---------------------------------------------------------------------------
# 5. Follow-up draft generation
# ---------------------------------------------------------------------------


def generate_follow_up_draft(
    profile: StudentProfile,
    contact: NetworkingContact,
    firm: Firm,
    days_since_outreach: int,
) -> str:
    """Generate a follow-up message (under 50 words) for unresponsive contacts.

    TODO: Replace with Claude API call for higher-quality personalization.

    Args:
        profile: The student's parsed profile.
        contact: The networking contact who hasn't responded.
        firm: The firm the contact works at.
        days_since_outreach: Number of days since the initial outreach.

    Returns:
        A follow-up message string under 50 words.
    """
    first_name = contact.contact_name.split()[0]

    draft = (
        f"Hi {first_name}, I wanted to follow up on my earlier message. "
        f"I understand you're busy -- I'm genuinely interested in learning "
        f"about {firm.name} and would appreciate even a brief conversation. "
        f"Thanks, {profile.name}"
    )

    logger.info(
        "alumni_finder.generate_follow_up_draft",
        extra={
            "contact_id": str(contact.id),
            "firm_id": str(firm.id),
            "days_since_outreach": days_since_outreach,
        },
    )
    return draft


# ---------------------------------------------------------------------------
# 6. Stale contact detection
# ---------------------------------------------------------------------------


def get_stale_contacts(
    contacts: list[NetworkingContact],
    days_threshold: int = 7,
) -> list[NetworkingContact]:
    """Return contacts where outreach was sent but no response received.

    A contact is considered stale when:
    - outreach_status is 'message_sent' or 'followed_up'
    - outreach_date is more than `days_threshold` days ago

    Args:
        contacts: List of networking contacts to evaluate.
        days_threshold: Number of days after which an unanswered outreach
            is considered stale. Defaults to 7.

    Returns:
        List of stale NetworkingContact objects, oldest outreach first.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days_threshold)
    stale_statuses = {"message_sent", "followed_up"}

    stale: list[NetworkingContact] = []
    for contact in contacts:
        if contact.outreach_status not in stale_statuses:
            continue
        if contact.outreach_date is None:
            continue
        if contact.outreach_date <= cutoff:
            stale.append(contact)

    # Sort oldest outreach first so the most overdue contacts surface first
    stale.sort(key=lambda c: c.outreach_date or now)

    logger.info(
        "alumni_finder.get_stale_contacts",
        extra={
            "total_contacts": len(contacts),
            "stale_count": len(stale),
            "days_threshold": days_threshold,
        },
    )
    return stale


# ---------------------------------------------------------------------------
# 7. Thank-you reminders
# ---------------------------------------------------------------------------


def get_contacts_needing_thank_you(
    contacts: list[NetworkingContact],
) -> list[NetworkingContact]:
    """Return contacts where a call was completed but no thank-you was sent.

    Only returns contacts where the call happened less than 48 hours ago
    so the thank-you is still timely.

    Args:
        contacts: List of networking contacts to evaluate.

    Returns:
        List of NetworkingContact objects that need a thank-you note,
        sorted by call_date ascending (oldest call first -- most urgent).
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=48)

    needs_thanks: list[NetworkingContact] = []
    for contact in contacts:
        if contact.outreach_status != "call_completed":
            continue
        if contact.thank_you_sent_at is not None:
            continue
        if contact.call_date is None:
            continue
        if contact.call_date >= cutoff:
            needs_thanks.append(contact)

    # Most urgent first (oldest call without thank-you)
    needs_thanks.sort(key=lambda c: c.call_date or now)

    logger.info(
        "alumni_finder.get_contacts_needing_thank_you",
        extra={
            "total_contacts": len(contacts),
            "needing_thank_you": len(needs_thanks),
        },
    )
    return needs_thanks
