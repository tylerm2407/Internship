# Execute — Supabase Initial Schema (5 Tables with RLS)

**AIE:** AIE-001

## Files Changed

| File | Action | What Changed |
|------|--------|-------------|
| `infra/supabase/migrations/0001_initial_schema.sql` | created | 5 tables (users, student_profiles, firms, postings, fit_scores), RLS enabled on all, 9 RLS policies, 4 indexes, uuid-ossp extension |

## Outcome
Implementation matches the plan exactly. All 5 tables created with column types matching ARCHITECTURE.md. RLS policies follow the intended pattern:
- `users`, `student_profiles`, `fit_scores`: user can SELECT/INSERT/UPDATE their own rows via `auth.uid()` check
- `firms`, `postings`: authenticated users can SELECT; service_role can do ALL operations
- `fit_scores` has a composite primary key `(user_id, posting_id)` enforcing one score per pair

Indexes created: `idx_postings_firm_id`, `idx_postings_open` (partial on closed_at IS NULL), `idx_fit_scores_user_id`, `idx_fit_scores_score` (composite for sorted dashboard queries).

## Side Effects
None. This is the first migration — no existing data or schema to conflict with.

## Tests
No automated tests for the migration itself. Schema correctness is validated implicitly by the seed script (`load_seed.py`) successfully inserting data, and by the fit scorer tests which construct objects matching these column definitions.

## Follow-Up Required
- [x] AIE-005: Seed script to populate firms and postings tables
- [ ] Future AIE needed: Phase 2 tables (applications, alumni, prep_sessions)
- [ ] Future AIE needed: Supabase Storage bucket configuration for resume PDFs
