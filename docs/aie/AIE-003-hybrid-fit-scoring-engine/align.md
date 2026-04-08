# Align — Hybrid Fit Scoring Engine

**AIE:** AIE-003
**Date:** 2026-04-08
**Severity:** critical
**Domain:** ai

## Problem
InternshipMatch's core value proposition is answering "where should I apply?" with honest, explainable scores. A pure LLM approach is slow (30+ seconds per firm) and non-deterministic (same profile gets different scores on different runs). A pure keyword match is too shallow to capture nuance like "this student's DCF experience is hands-on, not classroom-only." The product needs a scoring engine that is fast, consistent, honest, and explainable.

## Decision
Build a two-phase hybrid scoring engine in `backend/app/fit_scorer.py`:
1. **Deterministic base score (0-100)** — six weighted factors: GPA fit (25), class year eligibility (20, hard filter), role match (20), coursework progression (15), geographic fit (10), experience relevance (10). Runs in milliseconds against all postings.
2. **Claude qualitative pass (top 30 only)** — adjusts the base score by up to +/-15 points and generates a 2-3 sentence rationale with specific strengths and gaps.

Tier mapping: 85-100 strong_match, 70-84 reach, 55-69 long_shot, 0-54 not_recommended.

## Why This Approach
The hybrid approach gives speed (deterministic pass handles 200+ firms instantly), consistency (same inputs always produce the same base score), and nuance (Claude catches things keyword matching misses). Running Claude only on the top 30 keeps API costs under $0.60 per dashboard refresh. The hard filter on class year prevents false-positive matches that would waste students' time. Per ADR 0003 and CLAUDE.md: "If the scoring engine is wrong, users lose trust and the product is dead."

## Impact
- This is the single most important module in the codebase
- The dashboard page, opportunity ranking, and tier labels all depend on this engine
- Changes to weights or factor logic affect every user's scores
- Depends on `models.py` for data types and `claude_client.py` for the qualitative pass
- Cached results stored in the `fit_scores` table with 24-hour TTL

## Success Criteria
- Strong candidate (3.9 GPA junior, prior IB) scores 80+ on Goldman Sachs IB
- Middle candidate (3.5 GPA sophomore, general coursework) scores 55-80 on William Blair MM IB
- Weak candidate (3.1 GPA freshman, no experience) scores below 55 on any IB posting
- Class year mismatch returns None (hard filter)
- Closed postings return None
- Qualitative pass failure falls back gracefully to base score with generic rationale
- All tests pass in `test_fit_scorer.py`
