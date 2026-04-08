# Instruct — Hybrid Fit Scoring Engine

**AIE:** AIE-003

## Directive
> Build the hybrid fit scoring engine in `backend/app/fit_scorer.py`. Two phases: deterministic base score (0-100) with six weighted factors, then Claude qualitative pass on top 30 matches only. Include all six scoring subfunctions: _score_gpa (graduated scale with floor comparison), _check_class_year_eligible (hard filter), _score_role_match (exact + adjacent role matching), _score_coursework (tier-aware expected courses), _score_geography (proximity groups), _score_experience (finance keyword weighting). Add score_posting_base, score_all_postings, compute_tier, and apply_qualitative_pass functions. Include domain constants for HIGH_VALUE_KEYWORDS, ADJACENT_ROLES, GEO_PROXIMITY, and EXPECTED_COURSEWORK. Claude failures must fall back gracefully. Write unit tests in test_fit_scorer.py with three test profiles per CLAUDE.md: strong, middle, weak.

## Context Provided
- ARCHITECTURE.md — fit scoring algorithm section with all six factors, weights, and tier mapping
- CLAUDE.md — "The fit scorer is the product" section, test expectations, code standards
- ADR 0003 — hybrid fit scoring design rationale
- `backend/app/models.py` — StudentProfile, Firm, Posting, FitScore models

## Scope
**In scope:** All deterministic scoring logic, domain constants, Claude qualitative pass orchestration, graceful fallback, tier mapping, unit tests with 3 profiles and 10 test cases.

**Out of scope:** The `claude_client.py` module (assumed to exist). Caching/TTL logic in Supabase. Dashboard API route wiring.
