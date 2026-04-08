# Instruct — Sprint 2-3 Frontend Pages (Timeline, Applications, Alumni, Prep)

**AIE:** AIE-006

## Directive

> Build 4 frontend pages (/timeline, /applications, /alumni, /prep) to make all Phase 2-3 features available. Update lib/types.ts with Phase 2 types, lib/api.ts with Phase 2 API functions, and dashboard FEATURES to available: true with links. Follow the institutional editorial design system from CLAUDE.md.

## Context Provided

- `frontend/app/dashboard/page.tsx` — existing dashboard with FEATURES array showing "Coming soon"
- `frontend/lib/types.ts` — Phase 1 types only
- `frontend/lib/api.ts` — Phase 1 API functions only
- `frontend/components/` — Card, PrimaryButton, SecondaryButton, EyebrowLabel, OpportunityCard
- `frontend/app/globals.css` — design tokens
- `backend/app/main.py` — all 28 API routes (timeline, applications, alumni, prep)
- `backend/app/models.py` — all Pydantic models including Phase 2
- `CLAUDE.md` — design system rules, banned patterns

## Scope

**IN scope:**
- `/timeline` page with phase view, weekly summary, event list, complete/add actions
- `/applications` page with table view, stats bar, status updates, new application modal
- `/alumni` page with alumni cards by firm, outreach drafting, contact CRM
- `/prep` page with session starter, question loop, evaluation panel, readiness dashboard
- Phase 2 types in `lib/types.ts`
- Phase 2 API functions in `lib/api.ts`
- Dashboard FEATURES update to available: true with navigation links

**OUT of scope:**
- Backend changes
- New shared component library beyond what's needed
- Mobile responsiveness beyond basic Tailwind breakpoints
- Real-time updates / WebSocket
