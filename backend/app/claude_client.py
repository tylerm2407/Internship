"""Anthropic SDK wrapper for InternshipMatch.

All Claude API interactions go through this module. Never call the Anthropic
SDK directly from business logic — always go through these functions so that
error handling, logging, and model selection are centralized.

Model: claude-sonnet-4-20250514 (primary), claude-haiku-4-5-20251001 (fast/cheap).
Temperature: 0.3 for scoring/evaluation, 0.7 for drafting messages.
"""

from __future__ import annotations

import json
import logging
import os
import re
from functools import lru_cache
from typing import Any

import anthropic
from dotenv import load_dotenv

from app.models import Firm, Posting, StudentProfile
from app.prompts import (
    FIT_SCORE_QUALITATIVE_PROMPT,
    PROFILE_REVIEW_PROMPT,
    RESUME_PARSER_PROMPT,
)

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-20250514"
MODEL_FAST = "claude-haiku-4-5-20251001"
_SCORE_TEMPERATURE = 0.3
_DRAFT_TEMPERATURE = 0.7


# ------------------------------------------------------------------
# Client singleton
# ------------------------------------------------------------------


@lru_cache(maxsize=1)
def _get_client() -> anthropic.Anthropic:
    """Create and cache the Anthropic client.

    Returns:
        An authenticated ``anthropic.Anthropic`` instance.

    Raises:
        RuntimeError: If ``ANTHROPIC_API_KEY`` is not set.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY environment variable is not set. "
            "Set it before calling any Claude function."
        )
    logger.info("claude_client.initialized")
    return anthropic.Anthropic(api_key=api_key)


# ------------------------------------------------------------------
# JSON extraction helpers
# ------------------------------------------------------------------


def _extract_json(text: str) -> dict[str, Any]:
    """Extract and parse the first JSON object from a Claude response.

    Handles responses that wrap JSON in markdown code fences or include
    leading/trailing prose.

    Args:
        text: Raw text from a Claude response.

    Returns:
        Parsed JSON as a dict.

    Raises:
        ValueError: If no valid JSON object can be extracted.
    """
    cleaned = text.strip()

    # Try the raw text first.
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try stripping markdown code fences.
    fence_match = re.search(r"```(?:json)?\s*\n?(.*?)```", cleaned, re.DOTALL)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Try finding the first { ... } block.
    brace_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract valid JSON from Claude response: {cleaned[:200]}")


def _extract_json_list(text: str) -> list[Any]:
    """Extract and parse the first JSON array from a Claude response.

    Args:
        text: Raw text from a Claude response.

    Returns:
        Parsed JSON as a list.

    Raises:
        ValueError: If no valid JSON array can be extracted.
    """
    cleaned = text.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    fence_match = re.search(r"```(?:json)?\s*\n?(.*?)```", cleaned, re.DOTALL)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    bracket_match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if bracket_match:
        try:
            return json.loads(bracket_match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract valid JSON array from Claude response: {cleaned[:200]}")


# ------------------------------------------------------------------
# 1. Resume parsing via Vision
# ------------------------------------------------------------------


def parse_resume_vision(pdf_base64: str) -> dict[str, Any]:
    """Parse a resume PDF using Claude Vision.

    Sends the base64-encoded PDF to Claude with the RESUME_PARSER_PROMPT.
    Returns the parsed profile as a dictionary matching the StudentProfile
    schema. Retries once on malformed JSON.

    Args:
        pdf_base64: Base64-encoded PDF file content (no data-URI prefix).

    Returns:
        Dictionary matching the StudentProfile field schema (name, school,
        major, gpa, etc.).

    Raises:
        ValueError: If Claude returns unparseable JSON after retry.
        anthropic.APIError: If the API call fails.
    """
    client = _get_client()

    for attempt in range(2):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=4096,
                temperature=_SCORE_TEMPERATURE,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "document",
                                "source": {
                                    "type": "base64",
                                    "media_type": "application/pdf",
                                    "data": pdf_base64,
                                },
                            },
                            {
                                "type": "text",
                                "text": RESUME_PARSER_PROMPT,
                            },
                        ],
                    }
                ],
            )

            raw_text = response.content[0].text
            parsed = _extract_json(raw_text)
            logger.info(
                "claude_client.parse_resume_vision.completed",
                extra={
                    "attempt": attempt + 1,
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                },
            )
            return parsed

        except ValueError:
            if attempt == 0:
                logger.warning(
                    "claude_client.parse_resume_vision.malformed_json",
                    extra={"attempt": attempt + 1},
                )
                continue
            raise ValueError("Claude returned unparseable JSON after retry")

        except anthropic.APIError as exc:
            logger.error(
                "claude_client.parse_resume_vision.api_error",
                extra={"error": str(exc)},
            )
            raise


# ------------------------------------------------------------------
# 2. Profile review (data quality check)
# ------------------------------------------------------------------


def review_profile(profile: StudentProfile) -> dict[str, Any]:
    """Check a parsed profile for obvious hallucinations or errors.

    Sends the profile to Claude with PROFILE_REVIEW_PROMPT and returns
    a quality assessment.

    Args:
        profile: The parsed student profile to review.

    Returns:
        Dict with ``flags`` (list of issues with field, issue, severity)
        and ``overall_confidence`` (``"high"``, ``"medium"``, or ``"low"``).

    Raises:
        ValueError: If Claude returns unparseable JSON after retry.
        anthropic.APIError: If the API call fails.
    """
    client = _get_client()

    prompt = PROFILE_REVIEW_PROMPT.replace(
        "{profile_json}",
        profile.model_dump_json(indent=2),
    )

    for attempt in range(2):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=2048,
                temperature=_SCORE_TEMPERATURE,
                messages=[{"role": "user", "content": prompt}],
            )

            raw_text = response.content[0].text
            parsed = _extract_json(raw_text)
            logger.info(
                "claude_client.review_profile.completed",
                extra={"user_id": str(profile.user_id), "attempt": attempt + 1},
            )
            return parsed

        except ValueError:
            if attempt == 0:
                logger.warning(
                    "claude_client.review_profile.malformed_json",
                    extra={"attempt": attempt + 1},
                )
                continue
            raise ValueError("Claude returned unparseable JSON after retry for profile review")

        except anthropic.APIError as exc:
            logger.error(
                "claude_client.review_profile.api_error",
                extra={"error": str(exc)},
            )
            raise


# ------------------------------------------------------------------
# 3. Qualitative fit scoring
# ------------------------------------------------------------------


def score_fit_qualitative(
    profile: StudentProfile,
    posting: Posting,
    base_score: int,
) -> dict[str, Any]:
    """Run the Claude qualitative pass on a (profile, posting) pair.

    Only called for the top-30 base scores per user. Adjusts the
    deterministic score by up to +/-15 points and returns an explanation.

    Args:
        profile: The student's parsed profile.
        posting: The job posting to score against.
        base_score: The deterministic base score (0-100).

    Returns:
        Dict with ``adjustment`` (int -15 to +15), ``tier`` (str),
        ``rationale`` (str), ``strengths`` (list[str]), ``gaps`` (list[str]).

    Raises:
        ValueError: If Claude returns unparseable JSON after retry.
        anthropic.APIError: If the API call fails.
    """
    client = _get_client()

    prompt = (
        FIT_SCORE_QUALITATIVE_PROMPT
        .replace("{profile_json}", profile.model_dump_json(indent=2))
        .replace("{posting_json}", posting.model_dump_json(indent=2))
        .replace("{base_score}", str(base_score))
    )

    for attempt in range(2):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=2048,
                temperature=_SCORE_TEMPERATURE,
                messages=[{"role": "user", "content": prompt}],
            )

            raw_text = response.content[0].text
            result = _extract_json(raw_text)
            logger.info(
                "claude_client.score_fit_qualitative.completed",
                extra={
                    "user_id": str(profile.user_id),
                    "posting_id": str(posting.id),
                    "adjustment": result.get("adjustment"),
                    "tier": result.get("tier"),
                    "attempt": attempt + 1,
                },
            )
            return result

        except ValueError:
            if attempt == 0:
                logger.warning(
                    "claude_client.score_fit_qualitative.malformed_json",
                    extra={"posting_id": str(posting.id), "attempt": attempt + 1},
                )
                continue
            raise ValueError("Claude returned unparseable JSON after retry for qualitative scoring")

        except anthropic.APIError as exc:
            logger.error(
                "claude_client.score_fit_qualitative.api_error",
                extra={"error": str(exc)},
            )
            raise


# ------------------------------------------------------------------
# 4. Outreach message generation
# ------------------------------------------------------------------


def generate_outreach_message(
    profile: StudentProfile,
    alumnus_name: str,
    alumnus_role: str,
    firm_name: str,
    connection_hooks: list[str],
    tone: str,
) -> list[str]:
    """Generate 2-3 cold outreach message drafts for networking.

    Each draft is under 80 words, references specific connections, makes
    one clear ask (a 15-minute call), and sounds like a student — not AI.

    Args:
        profile: The student's profile.
        alumnus_name: Name of the alumni contact.
        alumnus_role: Current role of the alumni contact.
        firm_name: The firm where the alumnus works.
        connection_hooks: Shared connections (e.g. clubs, major, professors).
        tone: One of ``"professional"``, ``"casual"``, or ``"warm"``.

    Returns:
        A list of 2-3 message draft strings.

    Raises:
        ValueError: If the response cannot be parsed.
        anthropic.APIError: If the API call fails.
    """
    client = _get_client()
    hooks_str = ", ".join(connection_hooks) if connection_hooks else "no specific shared connections"

    prompt = f"""You are a networking coach for undergraduate finance students. Write 2-3 cold outreach message drafts.

CONTEXT:
- Student: {profile.name}, {profile.school}, {profile.major}
- Contact: {alumnus_name}, {alumnus_role} at {firm_name}
- Shared connections: {hooks_str}
- Tone: {tone}

RULES:
1. Each message must be under 80 words.
2. Reference at least one specific connection hook if available.
3. Make exactly one clear ask: a 15-minute phone call or coffee chat.
4. Sound like a real student, not AI-generated. Use natural language.
5. NEVER start with "I hope this message finds you well" or similar cliches.
6. NEVER use "I'd love to pick your brain" — be specific about what you want to learn.
7. Each draft should take a different angle or opening.

Return a JSON array of 2-3 strings. Each string is one complete message draft. Return ONLY the JSON array."""

    try:
        response = client.messages.create(
            model=MODEL_FAST,
            max_tokens=2048,
            temperature=_DRAFT_TEMPERATURE,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = response.content[0].text
        drafts = _extract_json_list(raw_text)
        logger.info(
            "claude_client.generate_outreach_message.completed",
            extra={
                "user_id": str(profile.user_id),
                "firm": firm_name,
                "drafts_count": len(drafts),
            },
        )
        return drafts

    except anthropic.APIError as exc:
        logger.error(
            "claude_client.generate_outreach_message.api_error",
            extra={"error": str(exc)},
        )
        raise
    except ValueError as exc:
        logger.error(
            "claude_client.generate_outreach_message.json_parse_error",
            extra={"error": str(exc)},
        )
        raise


# ------------------------------------------------------------------
# 5. Thank-you note generation
# ------------------------------------------------------------------


def generate_thank_you(
    student_name: str,
    contact_name: str,
    firm_name: str,
    call_notes: str | None,
) -> str:
    """Generate a thank-you note after a networking call.

    Args:
        student_name: The student's name.
        contact_name: The contact who took the call.
        firm_name: The firm the contact works at.
        call_notes: Optional notes from the call to personalize the message.

    Returns:
        A thank-you note string, under 60 words.

    Raises:
        anthropic.APIError: If the API call fails.
    """
    client = _get_client()
    notes_section = f"\nCALL NOTES:\n{call_notes}" if call_notes else "\nNo specific call notes provided."

    prompt = f"""Write a short thank-you note from {student_name} to {contact_name} at {firm_name} after a networking call.

RULES:
1. Under 60 words.
2. Reference something specific from the call if notes are provided.
3. Sound genuine and concise — not performative.
4. End with a forward-looking line (e.g., looking forward to staying in touch).
5. No subject line — just the message body.
{notes_section}

Return ONLY the thank-you message text. No JSON, no quotes, no formatting."""

    try:
        response = client.messages.create(
            model=MODEL_FAST,
            max_tokens=512,
            temperature=_DRAFT_TEMPERATURE,
            messages=[{"role": "user", "content": prompt}],
        )
        result = response.content[0].text.strip()
        logger.info(
            "claude_client.generate_thank_you.completed",
            extra={"firm": firm_name},
        )
        return result

    except anthropic.APIError as exc:
        logger.error(
            "claude_client.generate_thank_you.api_error",
            extra={"error": str(exc)},
        )
        raise


# ------------------------------------------------------------------
# 6. Interview prep answer evaluation
# ------------------------------------------------------------------


def evaluate_prep_answer(
    question: str,
    answer: str,
    category: str,
    firm_name: str | None,
) -> dict[str, Any]:
    """Evaluate a student's interview prep answer.

    Scores on a 0-100 scale with specific feedback, strengths, and
    areas for improvement. Evaluation criteria vary by category:
    technical accuracy for technical questions, STAR structure for
    behavioral, firm awareness for firm-specific.

    Args:
        question: The interview question that was asked.
        answer: The student's answer text.
        category: Question category (e.g. ``"accounting"``, ``"behavioral"``).
        firm_name: Optional firm name for firm-specific context.

    Returns:
        Dict with ``score`` (int 0-100), ``feedback`` (str),
        ``strengths`` (list[str]), ``improvements`` (list[str]).

    Raises:
        ValueError: If the response cannot be parsed as JSON.
        anthropic.APIError: If the API call fails.
    """
    client = _get_client()
    firm_context = f" at {firm_name}" if firm_name else ""

    prompt = f"""You are an interview prep coach for undergraduate finance students preparing for {category} interviews{firm_context}.

QUESTION:
{question}

STUDENT'S ANSWER:
{answer}

EVALUATION CRITERIA BY CATEGORY:
- Technical (accounting, valuation, ma, lbo): Evaluate factual accuracy, depth of understanding, and ability to walk through concepts step-by-step. Penalize wrong answers heavily.
- Behavioral: Evaluate STAR structure (Situation, Task, Action, Result). Check that the answer is specific (names a real situation, not hypothetical) and concise.
- Firm-specific: Evaluate awareness of the firm's culture, recent deals, competitive position, and why the student specifically wants THIS firm. Generic answers score low.
- Market awareness: Evaluate understanding of current market conditions, ability to discuss a recent deal or trend, and analytical thinking.

Return a JSON object:
{{
  "score": <integer 0-100>,
  "feedback": "<2-3 sentences of specific, actionable feedback>",
  "strengths": ["<1-3 things the student did well>"],
  "improvements": ["<1-3 specific things to improve>"]
}}

Be honest. A mediocre answer is a 40-60. A good answer is 70-85. Only 85+ for answers that would genuinely impress an interviewer. Return ONLY the JSON object."""

    try:
        response = client.messages.create(
            model=MODEL_FAST,
            max_tokens=1024,
            temperature=_SCORE_TEMPERATURE,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = response.content[0].text
        result = _extract_json(raw_text)
        logger.info(
            "claude_client.evaluate_prep_answer.completed",
            extra={"category": category, "score": result.get("score")},
        )
        return result

    except anthropic.APIError as exc:
        logger.error(
            "claude_client.evaluate_prep_answer.api_error",
            extra={"error": str(exc)},
        )
        raise
    except ValueError as exc:
        logger.error(
            "claude_client.evaluate_prep_answer.json_parse_error",
            extra={"error": str(exc)},
        )
        raise


# ------------------------------------------------------------------
# 7. Weekly summary text generation
# ------------------------------------------------------------------


def generate_weekly_summary_text(
    phase_name: str,
    events_summary: str,
    stats: dict[str, int],
) -> str:
    """Generate a 2-3 sentence 'what to focus on this week' summary.

    Args:
        phase_name: Current recruiting phase (e.g. ``"Application Wave"``).
        events_summary: Plain-text summary of upcoming events and deadlines.
        stats: Dict of activity stats (e.g. applications_submitted, contacts_made).

    Returns:
        A 2-3 sentence summary string.

    Raises:
        anthropic.APIError: If the API call fails.
    """
    client = _get_client()
    stats_str = ", ".join(f"{k}: {v}" for k, v in stats.items())

    prompt = f"""You are a recruiting advisor for an undergraduate finance student. Write a 2-3 sentence summary of what they should focus on this week.

CURRENT PHASE: {phase_name}

THIS WEEK'S EVENTS AND DEADLINES:
{events_summary}

ACTIVITY STATS:
{stats_str}

RULES:
1. Exactly 2-3 sentences. No bullet points.
2. Be specific — reference actual deadlines or tasks from the events summary.
3. Prioritize the most time-sensitive items.
4. Use a direct, coaching tone. Not cheerful, not harsh — just clear.

Return ONLY the summary text. No JSON, no formatting."""

    try:
        response = client.messages.create(
            model=MODEL_FAST,
            max_tokens=512,
            temperature=_DRAFT_TEMPERATURE,
            messages=[{"role": "user", "content": prompt}],
        )
        result = response.content[0].text.strip()
        logger.info(
            "claude_client.generate_weekly_summary_text.completed",
            extra={"phase": phase_name},
        )
        return result

    except anthropic.APIError as exc:
        logger.error(
            "claude_client.generate_weekly_summary_text.api_error",
            extra={"error": str(exc)},
        )
        raise


# ------------------------------------------------------------------
# 8. Follow-up message generation
# ------------------------------------------------------------------


def generate_follow_up_message(
    student_name: str,
    contact_name: str,
    firm_name: str,
    days_since_outreach: int,
) -> str:
    """Generate a follow-up message for an unresponsive networking contact.

    Args:
        student_name: The student's name.
        contact_name: The contact who hasn't responded.
        firm_name: The firm the contact works at.
        days_since_outreach: Number of days since the initial outreach.

    Returns:
        A follow-up message string, under 50 words.

    Raises:
        anthropic.APIError: If the API call fails.
    """
    client = _get_client()
    first_name = contact_name.split()[0]

    prompt = f"""Write a short follow-up message from {student_name} to {first_name} at {firm_name}. It has been {days_since_outreach} days since the initial outreach with no response.

RULES:
1. Under 50 words.
2. Acknowledge they are busy without being passive-aggressive.
3. Restate the specific ask (a 15-minute call about {firm_name}).
4. Sound like a real student — polite, direct, not desperate.
5. No subject line — just the message body.

Return ONLY the follow-up message text. No JSON, no quotes, no formatting."""

    try:
        response = client.messages.create(
            model=MODEL_FAST,
            max_tokens=512,
            temperature=_DRAFT_TEMPERATURE,
            messages=[{"role": "user", "content": prompt}],
        )
        result = response.content[0].text.strip()
        logger.info(
            "claude_client.generate_follow_up_message.completed",
            extra={"firm": firm_name, "days_since": days_since_outreach},
        )
        return result

    except anthropic.APIError as exc:
        logger.error(
            "claude_client.generate_follow_up_message.api_error",
            extra={"error": str(exc)},
        )
        raise


# ------------------------------------------------------------------
# 9. "Why {Firm}?" talking points generation
# ------------------------------------------------------------------


def generate_why_firm_talking_points(
    profile: StudentProfile,
    firm: Firm,
) -> list[str]:
    """Generate personalized 'Why {firm}?' talking points via Claude.

    Args:
        profile: The student's parsed profile.
        firm: The target firm.

    Returns:
        A list of 3-5 talking-point strings.

    Raises:
        ValueError: If the response cannot be parsed as a JSON array.
        anthropic.APIError: If the API call fails.
    """
    client = _get_client()

    roles_str = ", ".join(firm.roles_offered[:3]) if firm.roles_offered else "various roles"
    experience_str = "; ".join(
        f"{exp.role} at {exp.organization}" for exp in profile.prior_experience[:3]
    ) if profile.prior_experience else "no prior finance experience"

    prompt = f"""You are an interview prep coach for undergraduate finance students. Generate 3-5 personalized "Why {firm.name}?" talking points.

STUDENT PROFILE:
- Name: {profile.name}
- School: {profile.school}
- Major: {profile.major}
- GPA: {profile.gpa}
- Target roles: {', '.join(profile.target_roles[:3])}
- Prior experience: {experience_str}
- Clubs: {', '.join(profile.clubs[:4])}
- Technical skills: {', '.join(profile.technical_skills[:4])}

FIRM PROFILE:
- Name: {firm.name}
- Tier: {firm.tier}
- Headquarters: {firm.headquarters}
- Roles offered: {roles_str}
- Recruiting profile: {firm.recruiting_profile[:200]}

RULES:
1. Return 3-5 talking points.
2. Each point should be 1-2 sentences.
3. Be specific — reference the student's actual background and the firm's actual attributes.
4. Never use generic filler like "great culture" or "learning opportunity" without specifics.
5. At least one point should connect the student's experience to the firm's focus.
6. At least one point should reference the firm's tier, deal type, or competitive position.

Return a JSON array of 3-5 strings. Each string is one talking point. Return ONLY the JSON array."""

    try:
        response = client.messages.create(
            model=MODEL_FAST,
            max_tokens=1024,
            temperature=_DRAFT_TEMPERATURE,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = response.content[0].text
        result = _extract_json_list(raw_text)
        logger.info(
            "claude_client.generate_why_firm_talking_points.completed",
            extra={"firm": firm.name, "points_count": len(result)},
        )
        return result

    except anthropic.APIError as exc:
        logger.error(
            "claude_client.generate_why_firm_talking_points.api_error",
            extra={"error": str(exc)},
        )
        raise
    except ValueError as exc:
        logger.error(
            "claude_client.generate_why_firm_talking_points.json_parse_error",
            extra={"error": str(exc)},
        )
        raise
