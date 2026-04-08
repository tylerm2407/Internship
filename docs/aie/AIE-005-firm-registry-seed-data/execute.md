# Execute — Firm Registry Seed Data (25 Firms + Postings)

**AIE:** AIE-005

## Files Changed

| File | Action | What Changed |
|------|--------|-------------|
| `backend/seed/firms.json` | created | 25 firms with complete data: 5 bulge brackets, 8 elite boutiques, 8 middle-market, 2 quant, 2 buy-side. Each with tier, GPA floor, recruiting profile, offices, roles, careers URL. 327 lines. |
| `backend/seed/postings.json` | created | Sample postings across firms covering IB, S&T, and early insights programs for junior and sophomore class years. |
| `backend/seed/load_seed.py` | created | One-time seed script that reads both JSON files and inserts into Supabase via `app.db.bulk_insert_firms()` and `app.db.bulk_insert_postings()`. 60 lines. |

## Outcome
Implementation matches the plan. Key details:

**Firm data quality:**
- All 25 firms from CLAUDE.md's explicit list are present
- GPA floors: BB = 3.7, EB = 3.7, MM = 3.5, quant/buy-side = 3.8
- Every firm has a unique, detailed recruiting profile (2-3 sentences) describing recruiting timeline, school targets, and culture
- Deterministic UUIDs (`00000000-0000-4000-a000-00000000000N`) allow test fixtures to reference firms by known ID
- `scraper_adapter` and `last_scraped_at` are null for all firms (Phase 1 = static data)

**Tier distribution is intentional:**
- BB (5): Goldman, JPM, Morgan Stanley, BofA, Citi — the obvious top tier
- EB (8): Evercore, Lazard, Moelis, Centerview, PWP, PJT, Guggenheim, Qatalyst — the prestige boutiques
- MM (8): HL, William Blair, Baird, Jefferies, Piper Sandler, Raymond James, Harris Williams, Lincoln — the accessible tier most Bryant students will target
- Quant/buy-side (4): Citadel, Two Sigma, Jane Street, AQR — for quantitative-focused students

**Loader script** uses `app.db` module functions (bulk_insert_firms, bulk_insert_postings) and provides clear console output showing count of records loaded.

## Side Effects
- Depends on `app.db` module providing `bulk_insert_firms()` and `bulk_insert_postings()` functions
- Deterministic UUIDs are referenced in `test_fit_scorer.py` fixtures — changing IDs would break tests

## Tests
No dedicated tests for the seed data. Correctness is validated by:
- The fit scorer tests using FIRM_GOLDMAN and FIRM_WILLIAM_BLAIR fixtures with matching UUIDs
- Manual inspection of the JSON for completeness

## Follow-Up Required
- [ ] Future AIE needed: `app.db` module with bulk_insert functions
- [ ] Future AIE needed: Expand from 25 to 200 firms after core flow is validated
- [ ] Future AIE needed: Alumni seed data for the Networking Radar feature
