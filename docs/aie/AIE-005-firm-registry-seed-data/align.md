# Align — Firm Registry Seed Data (25 Firms + Postings)

**AIE:** AIE-005
**Date:** 2026-04-08
**Severity:** major
**Domain:** database

## Problem
The fit scoring engine and dashboard need real firm data to operate against. Without a curated set of firms with accurate GPA floors, tier classifications, and recruiting profiles, the scorer has nothing to score and the product can't be demoed or tested. Per CLAUDE.md: "The first 25 firms matter more than the next 175."

## Decision
Create seed data files and a loader script:
1. `backend/seed/firms.json` — 25 firms across 4 tiers: 5 bulge brackets (GS, JPM, MS, BofA, Citi), 8 elite boutiques (Evercore, Lazard, Moelis, Centerview, PWP, PJT, Guggenheim, Qatalyst), 8 middle-market (HL, William Blair, Baird, Jefferies, Piper Sandler, Raymond James, Harris Williams, Lincoln), 4 quant/buy-side (Citadel, Two Sigma, Jane Street, AQR). Each with tier, GPA floor, recruiting profile, offices, and roles offered.
2. `backend/seed/postings.json` — sample postings for the initial firms.
3. `backend/seed/load_seed.py` — script that reads both JSON files and inserts into Supabase via the db module.

## Why This Approach
Static JSON seed data is the right Phase 1 approach because the scraper pipeline doesn't exist yet. The 25-firm selection follows CLAUDE.md's explicit list and covers the full tier spectrum that a finance student would target. Each firm's `recruiting_profile` is a 2-3 sentence description based on public recruiting data — useful for both the scoring engine and eventual display on firm detail pages. The loader script is a one-time run, not an ongoing process.

## Impact
- Populates the `firms` and `postings` tables that every other feature depends on
- The fit scorer tests reference these exact firms (Goldman Sachs, William Blair) by UUID
- The seed data quality directly affects whether the demo is convincing
- GPA floor estimates affect every user's scores — wrong estimates = wrong product

## Success Criteria
- 25 firms with complete data across all 4 tiers
- GPA floors: 3.7 for BB/EB, 3.5 for MM, 3.8 for quant/buy-side
- Every firm has a careers_url, recruiting_profile, headquarters, offices list, and roles_offered
- Sample postings cover IB, S&T, and quant roles across multiple class year targets
- Loader script runs cleanly and is idempotent
