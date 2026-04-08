# Align — Alumni Scanner: Find Bryant Alumni at Any Firm via Web Search

**AIE:** AIE-008
**Date:** 2026-04-08
**Severity:** major
**Domain:** backend, frontend, ai

## Problem
The alumni database currently has only 20 manually seeded Bryant University alumni across 14 firms. When a user selects a firm with no seeded alumni, they see "No alumni found" with no way to discover connections. The whole value of the Networking Radar feature depends on having alumni data, and manual seeding doesn't scale.

## Decision
Build a "Scan for alumni" feature that uses Claude's web search tool to find Bryant University alumni at any selected firm. The flow:

1. User clicks "Scan for alumni" on the alumni page (available per-firm or for a custom firm name)
2. Backend calls Claude API with the `web_search` tool enabled, asking it to find Bryant University alumni working at that firm
3. Claude searches the web (LinkedIn profiles, company pages, university press releases, etc.) and returns structured alumni data
4. Backend returns discovered alumni as candidates for user review
5. User confirms which alumni to add to the database
6. Confirmed alumni are inserted into the `alumni` table

### Backend changes
- New function in `claude_client.py`: `scan_alumni(firm_name: str) -> list[dict]` — uses Claude with web_search tool
- New endpoint: `POST /api/alumni/scan` — takes `firm_id` (uses existing firm name) or `firm_name` (for custom firms)
- New endpoint: `POST /api/alumni/confirm` — takes a list of discovered alumni and inserts them into the DB

### Frontend changes
- Add "Scan for alumni" button on the alumni page (appears when a firm is selected)
- Show discovered alumni in a review panel with checkboxes
- "Add selected" button to confirm and save

## Why This Approach
- **Claude web search** is the most practical data source — it can find publicly available information from LinkedIn, university news, press releases without requiring a separate API key or LinkedIn partnership
- **User confirmation before save** ensures data quality and avoids inserting hallucinated or incorrect alumni
- **No new dependencies** — uses the existing Anthropic SDK, just enables the web_search tool
- **Ethical** — only uses publicly available information, user reviews before saving

## Impact
- `backend/app/claude_client.py` — new `scan_alumni()` function
- `backend/app/main.py` — 2 new endpoints (`/api/alumni/scan`, `/api/alumni/confirm`)
- `frontend/lib/api.ts` — 2 new API functions
- `frontend/lib/types.ts` — new `AlumniCandidate` type
- `frontend/app/alumni/page.tsx` — scan button, review panel, confirm flow

## Success Criteria
- User can select any firm and click "Scan for alumni"
- System returns 0-10 discovered alumni with names, roles, and graduation years
- User can review and selectively add alumni to the database
- Added alumni appear in the normal alumni grid and can be used for outreach
- Scan gracefully handles firms where no Bryant alumni are found
