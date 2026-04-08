"""Resume parsing module for InternshipMatch.

Takes an uploaded PDF, sends it to Claude Vision for structured extraction,
and returns a StudentProfile for the user to review and edit.

CRITICAL: The parsed profile is NEVER saved to the database automatically.
The user MUST review and confirm every field before the profile is persisted.
This is enforced at the route level — this module only returns the parsed data.
See ADR 0001 for the full rationale.
"""

from __future__ import annotations

import base64
import logging
from datetime import datetime, timezone
from uuid import UUID

from app.claude_client import parse_resume_vision, review_profile
from app.models import PriorExperience, StudentProfile

logger = logging.getLogger(__name__)


def parse_resume_pdf(pdf_bytes: bytes, user_id: UUID) -> StudentProfile:
    """Parse a resume PDF into a structured StudentProfile.

    Sends the PDF to Claude Vision with a finance-specific prompt,
    validates the response against the Pydantic schema, and returns
    the parsed profile for user review.

    THIS FUNCTION DOES NOT SAVE TO THE DATABASE. The caller (the API route)
    must present the parsed profile to the user for review and only persist
    it after explicit confirmation.

    Args:
        pdf_bytes: Raw bytes of the uploaded PDF file.
        user_id: The authenticated user's UUID.

    Returns:
        A StudentProfile populated with the parsed resume data.

    Raises:
        ValueError: If Claude returns data that doesn't match the schema.
    """
    pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

    logger.info("resume_parser.parsing", extra={"user_id": str(user_id)})
    raw_profile = parse_resume_vision(pdf_base64)

    # Build prior_experience list from raw dicts
    prior_experience = []
    for exp in raw_profile.get("prior_experience", []):
        prior_experience.append(
            PriorExperience(
                role=exp.get("role", ""),
                organization=exp.get("organization", ""),
                summary=exp.get("summary", ""),
                dates=exp.get("dates", ""),
                bullets=exp.get("bullets", []),
            )
        )

    profile = StudentProfile(
        user_id=user_id,
        name=raw_profile.get("name") or "",
        school=raw_profile.get("school") or "",
        major=raw_profile.get("major") or "",
        minor=raw_profile.get("minor"),
        gpa=raw_profile.get("gpa"),
        target_roles=raw_profile.get("target_roles") or [],
        target_geographies=raw_profile.get("target_geographies") or [],
        technical_skills=raw_profile.get("technical_skills") or [],
        coursework_completed=raw_profile.get("coursework_completed") or [],
        coursework_in_progress=raw_profile.get("coursework_in_progress") or [],
        clubs=raw_profile.get("clubs") or [],
        certifications=raw_profile.get("certifications") or [],
        prior_experience=prior_experience,
        diversity_status=raw_profile.get("diversity_status"),
        languages=raw_profile.get("languages") or [],
        last_updated=datetime.now(timezone.utc),
    )

    logger.info(
        "resume_parser.parsed",
        extra={
            "user_id": str(user_id),
            "student_name": profile.name,
            "gpa": profile.gpa,
            "experience_count": len(profile.prior_experience),
        },
    )

    return profile


def review_parsed_profile(profile: StudentProfile) -> dict:
    """Run a quality check on a parsed profile to flag potential hallucinations.

    Args:
        profile: The parsed StudentProfile to review.

    Returns:
        Dictionary with 'flags' (list of issues) and 'overall_confidence'.
    """
    return review_profile(profile)
