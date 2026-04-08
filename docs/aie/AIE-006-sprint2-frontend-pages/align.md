# Align — Sprint 2-3 Frontend Pages (Timeline, Applications, Alumni, Prep)

**AIE:** AIE-006
**Date:** 2026-04-08
**Severity:** major
**Domain:** frontend

## Problem
All 4 Phase 2-3 features (Timeline, Application Tracker, Networking Radar, Interview Prep) have complete backends with API routes, but the dashboard shows them as "Coming soon" with `available: false`. Users cannot access any of these features. The user explicitly asked to "make all of these features available to use."

## Decision
Build 4 new frontend pages and update supporting infrastructure:

1. **`/timeline`** — Phase view + weekly summary + event list with complete/add actions
2. **`/applications`** — Table view with stats bar, status updates, and new application form
3. **`/alumni`** — Alumni cards by firm, outreach draft generation, contact CRM tracking
4. **`/prep`** — Session starter, question loop, answer evaluation, readiness dashboard

Also:
- Add Phase 2 types to `lib/types.ts` (Application, TimelineEvent, NetworkingContact, PrepSession, ReadinessScore, etc.)
- Add Phase 2 API functions to `lib/api.ts` (timeline, applications, alumni, prep endpoints)
- Update dashboard FEATURES array to `available: true` with links to the new pages

## Why This Approach
The backend routes already exist and return JSON. The frontend just needs pages that call them and render the data. Building all 4 at once is efficient since they share the same component patterns (Card, EyebrowLabel, PrimaryButton) and design tokens.

## Impact
- Creates 4 new page files under `frontend/app/`
- Modifies `lib/types.ts`, `lib/api.ts`, `app/dashboard/page.tsx`
- May add shared components (StatusBadge, etc.)
- No backend changes needed

## Success Criteria
- All 4 features show `available: true` on the dashboard with working links
- Each page renders data from the backend API
- Pages follow the institutional editorial design system (no gradients, no rounded-full, no emojis)
- Loading, empty, and error states handled on every page
