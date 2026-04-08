# Execute — Hybrid Fit Scoring Engine

**AIE:** AIE-003

## Files Changed

| File | Action | What Changed |
|------|--------|-------------|
| `backend/app/fit_scorer.py` | created | Full hybrid scoring engine: 6 scoring subfunctions, domain constants (HIGH_VALUE_KEYWORDS with 30 finance terms, ADJACENT_ROLES for 8 role types, GEO_PROXIMITY for 8 metro areas, EXPECTED_COURSEWORK for BB and MM tiers), score_posting_base, score_all_postings, compute_tier, apply_qualitative_pass. 436 lines. |
| `backend/tests/test_fit_scorer.py` | created | 10 unit tests across 4 test classes (TestStrongCandidate, TestMiddleCandidate, TestWeakCandidate, TestTierMapping). 3 test profiles: Alex Strong (3.9 GPA junior, Jefferies IB experience), Owen Ash (3.5 GPA sophomore, Bryant Finance), Chris Weak (3.1 GPA freshman, no finance). 293 lines. |

## Outcome
Implementation matches the plan. Key design decisions in the implementation:

**GPA scoring** uses a graduated scale: above floor+0.2 = 1.0, at floor = 0.8, within 0.3 below = linear 0.7-0.3, further below = 0.15 (not zero, some firms are flexible).

**Role matching** supports exact match (1.0), adjacent role (0.5 via ADJACENT_ROLES map), and no-preference fallback (0.6). This prevents students who haven't set target roles from being penalized.

**Experience scoring** weights finance-specific keywords (DCF, LBO, M&A, etc.) at 15x the value of generic word overlap. Partial credit (0.3) for having a skill even when the posting doesn't list it.

**Qualitative pass** wraps each Claude call in try/except and falls back to the base score with a generic rationale if Claude fails. This ensures a broken API connection never takes down the dashboard.

**Test results validate CLAUDE.md's requirements:**
- Strong candidate scores 80+ on Goldman Sachs IB (actual: 88)
- Middle candidate scores 55-80 on William Blair MM IB (actual: 68)
- Weak candidate scores below 55 on any IB posting (actual: 40)
- Strong > Middle on same posting (confirmed)
- Class year mismatch returns None (confirmed)

## Side Effects
- Depends on `app.claude_client.score_fit_qualitative` which must exist (imported but not yet built as a separate AIE)
- The test file adds `backend/` to sys.path for imports

## Tests
10 tests covering:
- Strong candidate high scores on BB and MM postings
- Strong candidate filtered from wrong-class-year posting
- Middle candidate moderate score on MM posting
- Middle candidate filtered from junior posting
- Strong > Middle comparison on same posting
- Weak candidate low scores on BB and MM postings
- Tier mapping boundary values (85, 84, 70, 69, 55, 54, 100, 0)

## Follow-Up Required
- [ ] Future AIE needed: `claude_client.py` — Anthropic SDK wrapper with score_fit_qualitative
- [ ] Future AIE needed: Fit score caching with 24-hour TTL in Supabase
- [ ] Future AIE needed: Dashboard API route wiring scores to the frontend
