"""Resume Coach — Claude-powered critique of a student's resume.

Takes an already-parsed StudentProfile, sends it to Claude along with a
finance-specific rubric, and returns a structured ResumeCritique. Does not
read the original PDF again — it works off the parsed fields, which include
the original bullets preserved in `prior_experience[*].bullets`.
"""

from __future__ import annotations

import json
import logging
import re
from uuid import UUID, uuid4

from app.claude_client import MODEL, _get_client
from app.models import (
    BulletFeedback,
    ResumeCategoryScores,
    ResumeCritique,
    StudentProfile,
)
from app.prompts import RESUME_COACH_PROMPT, sanitize_for_prompt

logger = logging.getLogger(__name__)


def _extract_json(text: str) -> dict:
    """Strip optional ```json fences and parse the first JSON object."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return json.loads(cleaned)


def _serialize_profile_for_prompt(profile: StudentProfile) -> str:
    """Produce a compact JSON blob of the profile fields Claude needs.

    All free-text fields are sanitized to neutralize prompt-injection attempts
    in names, bullets, clubs, etc.
    """
    data = {
        "name": sanitize_for_prompt(profile.name, 120),
        "school": sanitize_for_prompt(profile.school, 80),
        "major": sanitize_for_prompt(profile.major, 80),
        "minor": sanitize_for_prompt(profile.minor, 60) or None,
        "gpa": profile.gpa,
        "target_roles": [sanitize_for_prompt(r, 60) for r in profile.target_roles],
        "target_geographies": [
            sanitize_for_prompt(g, 60) for g in profile.target_geographies
        ],
        "technical_skills": [sanitize_for_prompt(s, 80) for s in profile.technical_skills],
        "coursework_completed": [
            sanitize_for_prompt(c, 80) for c in profile.coursework_completed
        ],
        "coursework_in_progress": [
            sanitize_for_prompt(c, 80) for c in profile.coursework_in_progress
        ],
        "clubs": [sanitize_for_prompt(c, 80) for c in profile.clubs],
        "certifications": [sanitize_for_prompt(c, 80) for c in profile.certifications],
        "prior_experience": [
            {
                "role": sanitize_for_prompt(e.role, 120),
                "organization": sanitize_for_prompt(e.organization, 120),
                "summary": sanitize_for_prompt(e.summary, 200),
                "dates": sanitize_for_prompt(e.dates, 60),
                "bullets": [sanitize_for_prompt(b, 400) for b in e.bullets],
            }
            for e in profile.prior_experience
        ],
    }
    return json.dumps(data, indent=2)


def critique_resume(profile: StudentProfile) -> ResumeCritique:
    """Run the Claude resume critique against a parsed profile.

    Args:
        profile: The student's current parsed profile.

    Returns:
        A ResumeCritique with scores, priorities, and per-bullet feedback.

    Raises:
        RuntimeError: If Claude's response cannot be parsed as the expected schema.
    """
    client = _get_client()
    profile_json = _serialize_profile_for_prompt(profile)
    target_roles = (
        ", ".join(profile.target_roles)
        if profile.target_roles
        else "generalist finance recruiting"
    )

    prompt = RESUME_COACH_PROMPT.format(
        profile_json=profile_json,
        target_roles=sanitize_for_prompt(target_roles, 200),
    )

    logger.info("resume_coach.critique.start", extra={"user_id": str(profile.user_id)})

    response = client.messages.create(
        model=MODEL,
        max_tokens=3000,
        temperature=0.3,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text  # type: ignore[union-attr]
    try:
        parsed = _extract_json(text)
    except json.JSONDecodeError as exc:
        logger.error(
            "resume_coach.parse_failed",
            extra={"user_id": str(profile.user_id), "error": str(exc)},
        )
        raise RuntimeError("Resume critique response was not valid JSON") from exc

    try:
        critique = ResumeCritique(
            id=uuid4(),
            user_id=profile.user_id,
            overall_score=int(parsed["overall_score"]),
            tier=parsed["tier"],
            headline=parsed["headline"],
            category_scores=ResumeCategoryScores(**parsed["category_scores"]),
            priorities=list(parsed.get("priorities", [])),
            bullet_feedback=[
                BulletFeedback(**b) for b in parsed.get("bullet_feedback", [])
            ],
            strengths=list(parsed.get("strengths", [])),
        )
    except (KeyError, TypeError, ValueError) as exc:
        logger.error(
            "resume_coach.schema_mismatch",
            extra={"user_id": str(profile.user_id), "error": str(exc)},
        )
        raise RuntimeError("Resume critique did not match expected schema") from exc

    logger.info(
        "resume_coach.critique.done",
        extra={
            "user_id": str(profile.user_id),
            "score": critique.overall_score,
            "tier": critique.tier,
            "bullets_reviewed": len(critique.bullet_feedback),
        },
    )
    return critique


def _critique_to_row(critique: ResumeCritique) -> dict:
    """Serialize a ResumeCritique to a row dict for the resume_critiques table."""
    return {
        "id": str(critique.id),
        "user_id": str(critique.user_id),
        "overall_score": critique.overall_score,
        "tier": critique.tier,
        "headline": critique.headline,
        "category_scores": critique.category_scores.model_dump(),
        "priorities": critique.priorities,
        "bullet_feedback": [b.model_dump() for b in critique.bullet_feedback],
        "strengths": critique.strengths,
        "created_at": critique.created_at.isoformat(),
    }
