# Execute — Pydantic Data Models (Phase 1)

**AIE:** AIE-002

## Files Changed

| File | Action | What Changed |
|------|--------|-------------|
| `backend/app/models.py` | created | 7 Pydantic v2 models: User, PriorExperience, StudentProfile, Firm, Posting, FitScore, OpportunityResponse. 197 lines. |

## Outcome
Implementation matches the plan. All models defined with:
- Complete type annotations using `Literal` for tier, class_year, status enums
- `Field()` descriptions on every non-obvious field
- `default_factory=list` for all list fields to avoid mutable default pitfalls
- `ge=0, le=100` validation on FitScore.score
- UTC timezone-aware datetime defaults via `datetime.now(timezone.utc)`
- Docstrings on every class explaining purpose and usage context
- `scraper_adapter` and `last_scraped_at` on Firm are Optional (null in Phase 1)

One addition beyond the original ARCHITECTURE.md spec: `OpportunityResponse` was added as a composite model combining Posting + Firm + FitScore, which the dashboard API endpoint returns directly.

## Side Effects
None. This is a new file with no external dependencies beyond Pydantic and stdlib.

## Tests
Models are tested implicitly by `test_fit_scorer.py` which constructs StudentProfile, Firm, Posting, and FitScore objects extensively. No dedicated model validation tests yet.

## Follow-Up Required
- [ ] Future AIE needed: Application, Alumnus, PrepSession models for Phase 2
- [ ] Future AIE needed: Frontend `lib/types.ts` mirroring these models
