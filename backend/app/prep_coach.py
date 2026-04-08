"""Interview Prep Coach module for InternshipMatch.

Provides question selection with spaced repetition, rules-based answer
evaluation, readiness scoring, and personalized "Why {firm}?" talking
points. Designed as a self-contained module consumed by the FastAPI routes.

TODO: Replace the rules-based evaluator with Claude API calls once the
prompt templates are finalized and tested against real student answers.
"""

from __future__ import annotations

import logging
import random
from datetime import datetime, timezone, timedelta
from typing import Literal
from uuid import UUID

from app.models import (
    Firm,
    PrepAnswer,
    ReadinessScore,
    StudentProfile,
)

logger = logging.getLogger(__name__)

# ============================================================
# Question Bank
# ============================================================

QuestionCategory = Literal[
    "accounting", "valuation", "ma", "lbo",
    "behavioral", "firm_specific", "market_awareness",
]

QuestionDifficulty = Literal["easy", "medium", "hard"]


def _q(
    text: str,
    category: QuestionCategory,
    difficulty: QuestionDifficulty,
    tags: list[str] | None = None,
) -> dict:
    """Build a question dict with consistent shape."""
    return {
        "text": text,
        "category": category,
        "difficulty": difficulty,
        "tags": tags or [],
    }


QUESTION_BANK: dict[str, list[dict]] = {
    "accounting": [
        _q("Walk me through the three financial statements.", "accounting", "easy", ["fundamentals"]),
        _q(
            "What happens to each statement if depreciation increases by $10?",
            "accounting", "medium", ["depreciation", "linking"],
        ),
        _q("How do you calculate enterprise value?", "accounting", "medium", ["enterprise_value"]),
        _q(
            "What's the difference between EBITDA and free cash flow?",
            "accounting", "medium", ["ebitda", "fcf"],
        ),
        _q(
            "If a company prepays $100 of rent, walk me through the impact on all three statements.",
            "accounting", "hard", ["prepaid", "linking"],
        ),
        _q(
            "A company issues $50 of stock to purchase $50 of PP&E. Walk me through the three statements.",
            "accounting", "hard", ["stock_issuance", "linking"],
        ),
        _q(
            "What is the difference between accounts payable and accrued expenses?",
            "accounting", "easy", ["working_capital"],
        ),
        _q(
            "How does an inventory write-down affect the three statements?",
            "accounting", "hard", ["inventory", "write_down", "linking"],
        ),
        _q(
            "If depreciation increases by $10, what happens to each of the three financial statements? Walk through the full impact assuming a 40% tax rate.",
            "accounting", "medium", ["depreciation", "linking", "tax_rate"],
        ),
        _q(
            "A company collects $100 cash from a customer for a service it has not yet performed. Walk me through the three financial statements.",
            "accounting", "medium", ["deferred_revenue", "linking"],
        ),
    ],
    "valuation": [
        _q("Walk me through a DCF.", "valuation", "medium", ["dcf"]),
        _q("What are the main valuation methodologies?", "valuation", "easy", ["overview"]),
        _q("When would you use a DCF vs comps?", "valuation", "medium", ["dcf", "comps"]),
        _q("How do you calculate WACC?", "valuation", "medium", ["wacc", "dcf"]),
        _q("What drives terminal value?", "valuation", "medium", ["terminal_value", "dcf"]),
        _q(
            "What are the advantages and disadvantages of precedent transactions vs comparable companies?",
            "valuation", "hard", ["comps", "precedent_transactions"],
        ),
        _q(
            "How would you value a company with negative earnings?",
            "valuation", "hard", ["special_situations"],
        ),
        _q(
            "Walk me through a DCF step by step. How do you get from revenue to unlevered free cash flow, and how do you discount it back?",
            "valuation", "hard", ["dcf", "ufcf", "discount_rate"],
        ),
        _q(
            "If you could only use one valuation methodology, which would you choose and why?",
            "valuation", "medium", ["overview", "comps", "dcf"],
        ),
    ],
    "ma": [
        _q("Walk me through a basic merger model.", "ma", "medium", ["merger_model"]),
        _q("What is accretion/dilution?", "ma", "medium", ["accretion_dilution"]),
        _q("Why would a company want to acquire another company?", "ma", "easy", ["rationale"]),
        _q(
            "What are synergies and how do you estimate them?",
            "ma", "medium", ["synergies"],
        ),
        _q(
            "What's the difference between a stock deal and a cash deal?",
            "ma", "easy", ["deal_structure"],
        ),
        _q(
            "How do you determine the purchase price in an acquisition?",
            "ma", "hard", ["valuation", "purchase_price"],
        ),
        _q(
            "Walk me through how goodwill is created in an acquisition and what happens if it becomes impaired.",
            "ma", "hard", ["goodwill", "impairment", "purchase_price"],
        ),
    ],
    "lbo": [
        _q("Walk me through a basic LBO model.", "lbo", "medium", ["lbo_model"]),
        _q("What makes a good LBO candidate?", "lbo", "medium", ["candidate_screening"]),
        _q("How do you calculate returns in an LBO?", "lbo", "medium", ["irr", "moic"]),
        _q("What are the key drivers of returns in an LBO?", "lbo", "medium", ["return_drivers"]),
        _q(
            "How does leverage affect returns in an LBO?",
            "lbo", "easy", ["leverage"],
        ),
        _q(
            "Walk me through the sources and uses in an LBO.",
            "lbo", "hard", ["sources_uses", "lbo_model"],
        ),
        _q(
            "A PE firm buys a company for $500M using 60% debt. EBITDA is $50M. Walk me through the key assumptions and how you would model returns over a 5-year hold.",
            "lbo", "hard", ["lbo_model", "returns", "leverage", "case_study"],
        ),
    ],
    "behavioral": [
        _q("Why investment banking?", "behavioral", "easy", ["motivation"]),
        _q("Walk me through your resume.", "behavioral", "easy", ["resume_walkthrough"]),
        _q("Tell me about a time you worked on a team.", "behavioral", "medium", ["teamwork"]),
        _q("What's your biggest weakness?", "behavioral", "medium", ["self_awareness"]),
        _q("Why should we hire you?", "behavioral", "medium", ["value_proposition"]),
        _q(
            "Tell me about a time you failed and what you learned.",
            "behavioral", "medium", ["failure", "growth"],
        ),
        _q(
            "Describe a time you had to persuade someone who disagreed with you.",
            "behavioral", "hard", ["persuasion", "conflict"],
        ),
        _q(
            "Tell me about a time you had to work under a tight deadline. How did you prioritize and deliver?",
            "behavioral", "medium", ["time_management", "pressure"],
        ),
        _q(
            "Where do you see yourself in five years, and how does investment banking fit into that plan?",
            "behavioral", "medium", ["career_goals", "motivation"],
        ),
    ],
    "firm_specific": [
        _q("Why {firm_name}?", "firm_specific", "medium", ["why_firm"]),
        _q("What do you know about our recent deals?", "firm_specific", "hard", ["deal_knowledge"]),
        _q("Why {division}?", "firm_specific", "medium", ["division_fit"]),
        _q(
            "What differentiates {firm_name} from other firms in this space?",
            "firm_specific", "hard", ["differentiation"],
        ),
        _q(
            "Where do you see {firm_name} in five years?",
            "firm_specific", "hard", ["industry_knowledge"],
        ),
    ],
    "market_awareness": [
        _q("What's happening in the markets right now?", "market_awareness", "medium", ["current_events"]),
        _q("Tell me about a deal in the news.", "market_awareness", "medium", ["deal_awareness"]),
        _q("Where do you think interest rates are headed?", "market_awareness", "hard", ["macro"]),
        _q("What sector would you invest in right now and why?", "market_awareness", "hard", ["sector_thesis"]),
        _q(
            "Tell me about an IPO or M&A deal from the last six months.",
            "market_awareness", "medium", ["deal_awareness", "ipo"],
        ),
    ],
}

# Key terms the rules-based evaluator checks for in technical answers.
_KEY_TERMS: dict[str, list[str]] = {
    "accounting": [
        "income statement", "balance sheet", "cash flow", "revenue",
        "net income", "assets", "liabilities", "equity",
    ],
    "valuation": [
        "dcf", "discount", "cash flow", "terminal value", "present value",
        "comparable", "precedent", "wacc", "multiple",
    ],
    "ma": [
        "synergies", "accretion", "dilution", "premium", "eps",
        "purchase price", "goodwill",
    ],
    "lbo": [
        "leverage", "debt", "equity", "irr", "cash flow",
        "exit", "multiple", "sponsor",
    ],
    "market_awareness": [
        "interest rate", "fed", "gdp", "inflation", "sector",
        "valuation", "deal",
    ],
}

_STAR_MARKERS: list[str] = ["situation", "task", "action", "result"]

# Maps session_type prefix to category key in QUESTION_BANK.
_SESSION_TYPE_TO_CATEGORY: dict[str, str] = {
    "technical_accounting": "accounting",
    "technical_valuation": "valuation",
    "technical_ma": "ma",
    "technical_lbo": "lbo",
    "behavioral": "behavioral",
    "firm_specific": "firm_specific",
    "market_awareness": "market_awareness",
}


# ============================================================
# 1. Question Selection
# ============================================================


def select_questions(
    session_type: str,
    firm: Firm | None,
    _role_type: str,
    readiness_scores: list[ReadinessScore],
    count: int = 5,
) -> list[dict]:
    """Select questions for a prep session using spaced-repetition weighting.

    Args:
        session_type: One of the PrepSession.session_type literals, e.g.
            ``"technical_accounting"`` or ``"behavioral"``.
        firm: The firm the student is prepping for. Used to inject the firm
            name into ``firm_specific`` template questions. May be ``None``.
        role_type: The role the student is targeting, e.g.
            ``"investment_banking"``. Currently unused but reserved for
            future role-specific question filtering.
        readiness_scores: The student's current mastery scores per category.
        count: Number of questions to return.

    Returns:
        A list of question dicts, each containing ``text``, ``category``,
        ``difficulty``, and ``tags``.
    """
    category = _SESSION_TYPE_TO_CATEGORY.get(session_type)
    if category is None:
        logger.warning("prep_coach.unknown_session_type", extra={"session_type": session_type})
        category = "behavioral"

    pool = list(QUESTION_BANK.get(category, []))
    if not pool:
        logger.error("prep_coach.empty_pool", extra={"category": category})
        return []

    # Build a mastery lookup for weighting.
    mastery_by_cat: dict[str, float] = {
        rs.category: rs.mastery_score for rs in readiness_scores
    }
    cat_mastery = mastery_by_cat.get(category, 0.0)

    # --- Difficulty distribution based on current mastery ---
    # 40% at current level, 30% harder, 30% easier.
    if cat_mastery < 2.0:
        current_level: QuestionDifficulty = "easy"
    elif cat_mastery < 3.5:
        current_level = "medium"
    else:
        current_level = "hard"

    difficulty_order: list[QuestionDifficulty] = ["easy", "medium", "hard"]
    current_idx = difficulty_order.index(current_level)
    harder: QuestionDifficulty = difficulty_order[min(current_idx + 1, 2)]
    easier: QuestionDifficulty = difficulty_order[max(current_idx - 1, 0)]

    # Assign weights per difficulty.
    diff_weights: dict[QuestionDifficulty, float] = {
        current_level: 0.4,
        harder: 0.3,
        easier: 0.3,
    }
    # If current == easier or current == harder the overlapping bucket just
    # accumulates, which is fine (e.g., 0.7 for "easy" when mastery is low).

    # Weight each question.
    weighted: list[tuple[dict, float]] = []
    for q in pool:
        w = diff_weights.get(q["difficulty"], 0.1)

        # Boost categories flagged as needs_review.
        for rs in readiness_scores:
            if rs.category == category and rs.needs_review:
                w *= 1.5
                break
        weighted.append((q, w))

    # Weighted sample without replacement.
    selected: list[dict] = []
    remaining = list(weighted)
    for _ in range(min(count, len(remaining))):
        total = sum(w for _, w in remaining)
        if total <= 0:
            break
        r = random.random() * total
        cumulative = 0.0
        for idx, (q, w) in enumerate(remaining):
            cumulative += w
            if cumulative >= r:
                selected.append(q)
                remaining.pop(idx)
                break

    # Inject firm name into firm_specific template questions.
    if firm is not None:
        firm_name = firm.name
        division = firm.roles_offered[0] if firm.roles_offered else "your division"
        for q in selected:
            q["text"] = q["text"].replace("{firm_name}", firm_name).replace("{division}", division)

    logger.info(
        "prep_coach.questions_selected",
        extra={
            "category": category,
            "count": len(selected),
            "difficulties": [q["difficulty"] for q in selected],
        },
    )
    return selected


# ============================================================
# 2. Answer Evaluation (rules-based placeholder)
# ============================================================


def evaluate_answer(
    question: dict,
    user_answer: str,
    _profile: StudentProfile | None = None,
    firm: Firm | None = None,
) -> dict:
    """Evaluate a student's answer to an interview question.

    Uses a rules-based heuristic as a placeholder. Returns a score and
    structured feedback.

    TODO: Replace with Claude API call for nuanced, context-aware evaluation
    once prompt templates are tested against real student answers.

    Args:
        question: Question dict from the question bank (must have ``text``,
            ``category``, ``difficulty``).
        user_answer: The student's free-text answer.
        profile: Optional student profile for context-aware evaluation.
        firm: Optional firm for firm-specific context.

    Returns:
        A dict with keys ``score`` (0-100), ``feedback`` (str),
        ``strengths`` (list[str]), ``improvements`` (list[str]).
    """
    category: str = question.get("category", "behavioral")
    answer_lower = user_answer.lower().strip()
    word_count = len(user_answer.split())

    score = 50  # Base score.
    strengths: list[str] = []
    improvements: list[str] = []

    # --- Length checks ---
    if word_count < 20:
        score -= 20
        improvements.append("Answer is too short. Aim for at least a few sentences with specific detail.")
    elif word_count > 300:
        score -= 10
        improvements.append("Answer is too long. In an interview, keep answers concise and structured.")
    else:
        score += 5
        strengths.append("Answer length is appropriate for an interview setting.")

    # --- Technical question evaluation ---
    if category in _KEY_TERMS:
        key_terms = _KEY_TERMS[category]
        hits = [term for term in key_terms if term in answer_lower]
        hit_ratio = len(hits) / max(len(key_terms), 1)

        if hit_ratio >= 0.5:
            score += 25
            strengths.append(f"Covers key concepts: {', '.join(hits[:4])}.")
        elif hit_ratio >= 0.25:
            score += 10
            strengths.append(f"Mentions some key terms: {', '.join(hits[:3])}.")
            missed = [t for t in key_terms if t not in answer_lower][:3]
            improvements.append(f"Consider also covering: {', '.join(missed)}.")
        else:
            score -= 10
            missed = [t for t in key_terms if t not in answer_lower][:4]
            improvements.append(f"Missing critical concepts: {', '.join(missed)}.")

    # --- Behavioral question evaluation (STAR framework) ---
    if category == "behavioral":
        star_hits = [m for m in _STAR_MARKERS if m in answer_lower]
        if len(star_hits) >= 3:
            score += 20
            strengths.append("Good use of the STAR framework structure.")
        elif len(star_hits) >= 2:
            score += 10
            strengths.append(f"Partially uses STAR structure ({', '.join(star_hits)}).")
            missing = [m for m in _STAR_MARKERS if m not in answer_lower]
            improvements.append(f"Strengthen your answer by adding: {', '.join(missing)}.")
        else:
            improvements.append(
                "Structure your answer using the STAR framework: "
                "Situation, Task, Action, Result."
            )

    # --- Firm-specific evaluation ---
    if category == "firm_specific" and firm is not None:
        firm_lower = firm.name.lower()
        if firm_lower in answer_lower:
            score += 10
            strengths.append(f"Directly references {firm.name} by name.")
        else:
            improvements.append(f"Make sure to specifically reference {firm.name} in your answer.")

    # --- Difficulty adjustment ---
    difficulty = question.get("difficulty", "medium")
    if difficulty == "hard" and score >= 60:
        score += 5  # Bonus for adequate hard-question answers.
    elif difficulty == "easy" and score < 50:
        score -= 5  # Extra penalty for failing an easy question.

    # Clamp score.
    score = max(0, min(100, score))

    # Build feedback string.
    if score >= 80:
        feedback = "Strong answer. You hit the key points and structured your response well."
    elif score >= 60:
        feedback = "Decent answer, but there is room to tighten your structure and cover more key concepts."
    elif score >= 40:
        feedback = "Your answer needs more depth. Review the core frameworks and practice hitting all the key terms."
    else:
        feedback = "This answer needs significant improvement. Study the underlying concepts and practice delivering a structured response."

    logger.info(
        "prep_coach.answer_evaluated",
        extra={
            "category": category,
            "difficulty": difficulty,
            "score": score,
            "word_count": word_count,
        },
    )

    return {
        "score": score,
        "feedback": feedback,
        "strengths": strengths,
        "improvements": improvements,
    }


# ============================================================
# 3. Readiness Score Updates
# ============================================================


def update_readiness_scores(
    user_id: UUID,
    answers: list[PrepAnswer],
    current_scores: list[ReadinessScore],
) -> list[ReadinessScore]:
    """Update mastery scores using exponential moving average.

    For each category represented in ``answers``, computes the session
    average score (normalized to 0-5) and blends it with the existing
    mastery via ``0.7 * old + 0.3 * session_avg``.

    Args:
        user_id: The student's user ID.
        answers: All ``PrepAnswer`` objects from the just-completed session.
        current_scores: The student's existing ``ReadinessScore`` rows.

    Returns:
        Updated ``ReadinessScore`` list (one per category touched). Callers
        are responsible for persisting these back to the database.
    """
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    # Group answers by category.
    by_category: dict[str, list[PrepAnswer]] = {}
    for ans in answers:
        by_category.setdefault(ans.question_category, []).append(ans)

    # Index existing scores.
    score_map: dict[str, ReadinessScore] = {rs.category: rs for rs in current_scores}

    updated: list[ReadinessScore] = []
    for category, cat_answers in by_category.items():
        session_avg_pct = sum(a.score for a in cat_answers) / len(cat_answers)
        session_avg_normalized = session_avg_pct / 100.0 * 5.0  # Map 0-100 to 0-5.

        existing = score_map.get(category)
        if existing is not None:
            old_mastery = existing.mastery_score
            old_attempted = existing.questions_attempted
        else:
            old_mastery = 0.0
            old_attempted = 0

        new_mastery = round(0.7 * old_mastery + 0.3 * session_avg_normalized, 2)
        new_mastery = max(0.0, min(5.0, new_mastery))
        new_attempted = old_attempted + len(cat_answers)

        needs_review = new_mastery < 2.5 or (
            existing is not None
            and existing.last_practiced_at is not None
            and existing.last_practiced_at < seven_days_ago
        )

        rs = ReadinessScore(
            user_id=user_id,
            category=category,  # type: ignore[arg-type]
            mastery_score=new_mastery,
            questions_attempted=new_attempted,
            last_practiced_at=now,
            needs_review=needs_review,
        )
        updated.append(rs)

        logger.info(
            "prep_coach.readiness_updated",
            extra={
                "user_id": str(user_id),
                "category": category,
                "old_mastery": old_mastery,
                "new_mastery": new_mastery,
                "questions_in_session": len(cat_answers),
                "needs_review": needs_review,
            },
        )

    return updated


# ============================================================
# 4. Overall Readiness
# ============================================================

# Weights for computing the overall readiness percentage.
_CATEGORY_WEIGHTS: dict[str, float] = {
    "accounting": 0.20,
    "valuation": 0.20,
    "ma": 0.15,
    "lbo": 0.15,
    "behavioral": 0.15,
    "firm_specific": 0.05,
    "market_awareness": 0.10,
}


def get_overall_readiness(scores: list[ReadinessScore]) -> dict:
    """Compute an overall readiness summary from per-category mastery scores.

    Args:
        scores: All ``ReadinessScore`` rows for a student.

    Returns:
        A dict with ``overall_pct`` (0-100), ``weakest_category``,
        ``strongest_category``, and ``recommendation`` (str).
    """
    if not scores:
        return {
            "overall_pct": 0,
            "weakest_category": None,
            "strongest_category": None,
            "recommendation": "You haven't started any prep sessions yet. Begin with accounting fundamentals.",
        }

    score_map: dict[str, float] = {rs.category: rs.mastery_score for rs in scores}

    # Weighted average, treating missing categories as 0.
    weighted_sum = 0.0
    weight_total = 0.0
    for cat, weight in _CATEGORY_WEIGHTS.items():
        weighted_sum += score_map.get(cat, 0.0) * weight
        weight_total += weight

    overall_raw = weighted_sum / weight_total if weight_total > 0 else 0.0
    overall_pct = int(round(overall_raw / 5.0 * 100))
    overall_pct = max(0, min(100, overall_pct))

    weakest = min(scores, key=lambda rs: rs.mastery_score)
    strongest = max(scores, key=lambda rs: rs.mastery_score)

    # Build recommendation.
    if overall_pct >= 80:
        recommendation = (
            f"You are in strong shape overall. Keep sharpening {weakest.category} "
            f"where your mastery is {weakest.mastery_score:.1f}/5."
        )
    elif overall_pct >= 50:
        recommendation = (
            f"Solid progress. Focus your next sessions on {weakest.category} "
            f"(mastery {weakest.mastery_score:.1f}/5) to bring up your overall readiness."
        )
    else:
        recommendation = (
            f"You are still early in your prep. Prioritize {weakest.category} "
            f"and aim for at least one session per category this week."
        )

    logger.info(
        "prep_coach.readiness_summary",
        extra={
            "overall_pct": overall_pct,
            "weakest": weakest.category,
            "strongest": strongest.category,
        },
    )

    return {
        "overall_pct": overall_pct,
        "weakest_category": weakest.category,
        "strongest_category": strongest.category,
        "recommendation": recommendation,
    }


# ============================================================
# 5. "Why {Firm}?" Talking Points
# ============================================================


def generate_why_firm_talking_points(
    profile: StudentProfile,
    firm: Firm,
) -> list[str]:
    """Generate personalized "Why {firm}?" talking points.

    Matches the student's profile against the firm's attributes to produce
    3-5 concrete, non-generic talking points the student can use in a
    "Why {firm_name}?" interview answer.

    Args:
        profile: The student's parsed resume profile.
        firm: The target firm.

    Returns:
        A list of 3-5 talking-point strings.
    """
    points: list[str] = []

    # --- Role alignment ---
    matching_roles = [
        role for role in profile.target_roles
        if any(role.lower() in offered.lower() or offered.lower() in role.lower()
               for offered in firm.roles_offered)
    ]
    if matching_roles:
        roles_str = ", ".join(matching_roles[:2])
        points.append(
            f"Your interest in {roles_str} directly aligns with "
            f"{firm.name}'s offerings in {', '.join(firm.roles_offered[:2])}."
        )

    # --- Geographic alignment ---
    matching_geos = [
        geo for geo in profile.target_geographies
        if any(geo.lower() in office.lower() for office in firm.offices)
        or geo.lower() in firm.headquarters.lower()
    ]
    if matching_geos:
        points.append(
            f"You are targeting {', '.join(matching_geos[:2])}, and "
            f"{firm.name} has a presence there ({firm.headquarters})."
        )

    # --- Club / experience keyword matching ---
    profile_keywords = set()
    for club in profile.clubs:
        profile_keywords.update(club.lower().split())
    for exp in profile.prior_experience:
        profile_keywords.update(exp.role.lower().split())
        profile_keywords.update(exp.organization.lower().split())
    for skill in profile.technical_skills:
        profile_keywords.add(skill.lower())

    recruiting_lower = firm.recruiting_profile.lower()
    overlap = [kw for kw in profile_keywords if kw in recruiting_lower and len(kw) > 3]
    if overlap:
        points.append(
            f"Your background touches on themes {firm.name} values in recruiting: "
            f"{', '.join(sorted(set(overlap))[:3])}."
        )

    # --- Tier / culture talking point ---
    tier_descriptions: dict[str, str] = {
        "bulge_bracket": (
            f"{firm.name} offers unmatched deal flow and global reach, "
            f"which aligns with your ambition to work on large-scale transactions."
        ),
        "elite_boutique": (
            f"{firm.name}'s lean deal teams mean more responsibility earlier, "
            f"which fits your goal of getting hands-on experience quickly."
        ),
        "middle_market": (
            f"{firm.name}'s middle-market focus gives analysts exposure to "
            f"the full deal lifecycle, from sourcing to close."
        ),
        "boutique": (
            f"{firm.name}'s boutique model means you would work directly with "
            f"senior bankers from day one."
        ),
        "regional": (
            f"{firm.name}'s regional strength in {firm.headquarters} gives you "
            f"access to a strong local deal pipeline and close-knit team."
        ),
        "buy_side": (
            f"{firm.name}'s buy-side perspective lets you develop investing "
            f"judgment alongside analytical skills."
        ),
        "quant": (
            f"{firm.name}'s quantitative approach aligns with your technical "
            f"skill set and interest in systematic strategies."
        ),
    }
    tier_point = tier_descriptions.get(firm.tier)
    if tier_point:
        points.append(tier_point)

    # --- Prior experience at related firms ---
    for exp in profile.prior_experience:
        org_lower = exp.organization.lower()
        firm_lower = firm.name.lower()
        # If they have experience at a firm in the same tier or related space,
        # that's a talking point.
        if org_lower != firm_lower and any(
            keyword in org_lower
            for keyword in ["bank", "capital", "partners", "advisors", "securities"]
        ):
            points.append(
                f"Your experience at {exp.organization} as {exp.role} shows "
                f"you understand the demands of this environment."
            )
            break

    # Deduplicate and cap at 5.
    seen: set[str] = set()
    unique: list[str] = []
    for p in points:
        if p not in seen:
            seen.add(p)
            unique.append(p)
    points = unique[:5]

    # Ensure at least 3 points.
    if len(points) < 3:
        fallbacks = [
            f"{firm.name}'s reputation for developing strong analysts would "
            f"accelerate your growth in the industry.",
            f"The caliber of deals {firm.name} advises on aligns with the "
            f"type of work you want to do early in your career.",
            f"Joining {firm.name} would position you well for your long-term "
            f"career goals in finance.",
        ]
        for fb in fallbacks:
            if len(points) >= 3:
                break
            if fb not in seen:
                points.append(fb)

    logger.info(
        "prep_coach.talking_points_generated",
        extra={
            "firm": firm.name,
            "profile_name": profile.name,
            "points_count": len(points),
        },
    )

    return points
