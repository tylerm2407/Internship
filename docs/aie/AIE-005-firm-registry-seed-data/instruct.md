# Instruct — Firm Registry Seed Data (25 Firms + Postings)

**AIE:** AIE-005

## Directive
> Seed the firm registry with the 25 firms listed in CLAUDE.md Build Order Phase 1, step 3. Create firms.json with all fields matching the Firm Pydantic model. Set GPA floors at 3.7 for bulge brackets and elite boutiques, 3.5 for middle-market, 3.8 for quant/buy-side. Write detailed recruiting_profile strings (2-3 sentences each) based on public recruiting knowledge. Create postings.json with sample postings. Write load_seed.py to insert both into Supabase. Use deterministic UUIDs so the test fixtures can reference specific firms by ID.

## Context Provided
- CLAUDE.md — explicit list of 25 firms by tier, Build Order Phase 1 step 3
- ARCHITECTURE.md — Firm and Posting data models
- `backend/app/models.py` — Firm and Posting Pydantic schemas
- `infra/supabase/migrations/0001_initial_schema.sql` — table definitions

## Scope
**In scope:** firms.json (25 firms), postings.json (sample postings), load_seed.py (one-time loader).

**Out of scope:** Scraper adapters. Real-time posting data. Alumni seed data. The 175 additional firms for Phase 2.
