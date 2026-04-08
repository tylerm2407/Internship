# Align — Backend Performance: Client Caching & N+1 Elimination

**AIE:** AIE-007
**Date:** 2026-04-08
**Severity:** moderate
**Domain:** backend

## Problem
Every API request creates 2-4 fresh Supabase client instances via `create_client()`:
1. `auth.py:get_current_user_id()` creates one to validate the JWT
2. `db.py` functions create another (or more) for actual data operations
3. Routes like `/api/applications/stats` and `/api/timeline/weekly` have N+1 query patterns — looping through results and calling `get_firm_by_id()` per row, each creating yet another client

Additionally, `os.getenv()` is called on every client creation instead of being read once at startup.

This adds ~50-200ms of unnecessary overhead per request from client instantiation alone.

## Decision
1. **Cache Supabase clients at module level** — create singleton service and anon clients on first use via `functools.lru_cache`. User-authenticated clients still need per-request creation but will reuse cached env vars.
2. **Cache env vars at module load** in `db.py` and `auth.py` — read once, fail fast at import time if missing.
3. **Add in-memory TTL cache for firms** — firms change rarely; cache the full list for 5 minutes to eliminate repeated fetches.
4. **Fix N+1 in `get_application_stats`** — batch-fetch all firms once, then look up from the map.
5. **Fix N+1 in cached opportunities path** — batch-fetch postings and firms instead of per-row queries.
6. **Fix N+1 in `generate_timeline`** — batch-fetch postings instead of per-ID service client creation.

## Why This Approach
- Client caching is the highest-impact, lowest-risk change — `create_client()` is pure overhead
- In-memory caching for firms is safe because the firm registry is seed data that changes infrequently
- Fixing N+1s eliminates the most egregious scaling bottlenecks
- No architectural changes, no new dependencies, no behavior changes

## Impact
- `backend/app/db.py` — cached clients, cached env vars, new batch helper, firms cache
- `backend/app/auth.py` — cached client for token validation
- `backend/app/main.py` — refactored stats/opportunities/timeline routes to use batch fetches
- No frontend changes. No schema changes. No API contract changes.

## Success Criteria
- Same API responses as before (no behavior change)
- Each request creates at most 1 Supabase client (the user-auth one), not 2-4
- N+1 routes (`/stats`, `/opportunities` cache path, `/timeline/weekly`, `/timeline/generate`) make a fixed number of DB calls regardless of result count
