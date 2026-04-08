# InternshipMatch — Product Backlog

> Epics, user stories, sprints, and user testing plan derived from ARCHITECTURE.md.
> Last updated: 2026-04-08

---

## Epics Overview

| # | Epic | Status | Sprint |
|---|------|--------|--------|
| E1 | Foundation & Onboarding | Done | Sprint 1 |
| E2 | Fit Scoring & Dashboard | Done | Sprint 1 |
| E3 | Recruiting Timeline | Done | Sprint 2 |
| E4 | Application Tracker | Done | Sprint 2 |
| E5 | Networking Radar | Done | Sprint 3 |
| E6 | Interview Prep Coach | Done | Sprint 3 |
| E7 | Scraping Pipeline | Not started | Sprint 4 |
| E8 | Polish & Launch Prep | Not started | Sprint 5 |

---

## Epic 1 — Foundation & Onboarding

**Goal:** User can sign up, upload a resume, review/edit their parsed profile, and save it.

### User Stories

| ID | Story | Acceptance Criteria | Status |
|----|-------|-------------------|--------|
| US-101 | As a student, I can create an account with my school email | Supabase Auth login/signup works, user row created | Done |
| US-102 | As a student, I can upload my resume as a PDF | PDF accepted, sent to Claude Vision, structured profile returned | Done |
| US-103 | As a student, I can review and edit every field Claude extracted | All fields editable, parsed data pre-filled, save button persists to Supabase | Done |
| US-104 | As a student, I see a quality check flagging potential parsing errors | Profile review highlights suspicious GPA, dates, or hallucinated data | Done |
| US-105 | As a student, my data is protected by RLS | I can only read/write my own rows in every table | Done |

### Backend Artifacts
- `models.py` — User, StudentProfile, PriorExperience
- `resume_parser.py` — parse_resume_pdf(), review_parsed_profile()
- `prompts.py` — RESUME_PARSER_PROMPT, PROFILE_REVIEW_PROMPT
- `auth.py` — get_current_user_id()
- `db.py` — get_profile(), upsert_profile()
- Migration `0001_initial_schema.sql` — users, student_profiles tables

---

## Epic 2 — Fit Scoring & Dashboard

**Goal:** User sees a ranked list of opportunities with honest, explainable fit scores.

### User Stories

| ID | Story | Acceptance Criteria | Status |
|----|-------|-------------------|--------|
| US-201 | As a student, I see opportunities ranked by fit score | Dashboard shows postings sorted by score descending | Done |
| US-202 | As a student, I see a score (0-100) with tier label for each opportunity | strong_match / reach / long_shot / not_recommended displayed | Done |
| US-203 | As a student, I can read a 2-3 sentence rationale for each score | Claude-generated rationale, strengths, and gaps visible | Done |
| US-204 | As a student, wrong class year postings are automatically filtered out | Hard filter — no junior postings shown to sophomores | Done |
| US-205 | As a student, I can filter by role type and minimum score | Query params: role_type, min_score work on /api/opportunities | Done |
| US-206 | As a student, I can click into a firm to see details and all postings | /firm/[id] page shows firm info, recruiting profile, all open postings | Done |

### Backend Artifacts
- `fit_scorer.py` — 6-factor deterministic scoring + qualitative pass
- `prompts.py` — FIT_SCORE_QUALITATIVE_PROMPT
- `test_fit_scorer.py` — 10 unit tests, 3 test profiles
- `db.py` — get_fit_scores(), upsert_fit_scores()
- Migration `0001_initial_schema.sql` — firms, postings, fit_scores tables
- Seed: `firms.json` (25 firms), `postings.json`

---

## Epic 3 — Recruiting Timeline

**Goal:** User sees a personalized calendar showing what to do and when, based on their class year and target roles.

### User Stories

| ID | Story | Acceptance Criteria | Status |
|----|-------|-------------------|--------|
| US-301 | As a student, I see a timeline of recruiting phases for my class year | Phase-based view: "Application Blitz", "Interview Season", etc. | Backend done |
| US-302 | As a student, I see posting deadlines on my timeline | Deadlines from postings table appear as events with priority | Backend done |
| US-303 | As a student, I see a "This Week" summary with my top actions | WeeklySummary with urgent items, upcoming items, overdue items | Backend done |
| US-304 | As a student, diversity programs appear earlier if I qualify | diversity_status triggers early diversity program events | Backend done |
| US-305 | As a student, I get networking nudges ("follow up with Sarah") | Stale contacts (>7 days, no response) surface as nudges | Backend done |
| US-306 | As a student, I can add custom events to my timeline | POST /api/timeline/events creates custom event | Backend done |
| US-307 | As a student, I can mark timeline items complete | PATCH /api/timeline/events/{id} with completed=true | Backend done |
| US-308 | As a student, I see my current phase with progress indicator | get_current_phase() returns phase_name, description, progress_pct | Backend done |
| US-309 | **FRONTEND:** As a student, I see the /timeline page | Phase view + weekly summary + event list rendered in Next.js | Done |

### Backend Artifacts
- `timeline_builder.py` — PHASE_TEMPLATES, generate_timeline_events(), get_current_phase(), build_weekly_summary()
- `models.py` — TimelineEvent, TimelineEventCreate, WeeklySummary
- `main.py` — 6 timeline routes
- `db.py` — get_timeline_events(), create/update/delete_timeline_event()
- Migration `0002_phase2_features.sql` — timeline_events table

---

## Epic 4 — Application Tracker

**Goal:** User tracks every application from research through offer with finance-native stages.

### User Stories

| ID | Story | Acceptance Criteria | Status |
|----|-------|-------------------|--------|
| US-401 | As a student, I can log a new application | POST /api/applications creates with status, firm, posting | Backend done |
| US-402 | As a student, I can update application status through 11 finance stages | researching → networking → applied → hirevue → phone_screen → first_round → superday → offer → accepted/declined/rejected/ghosted | Backend done |
| US-403 | As a student, status changes are audited | application_status_history table logs every transition | Backend done |
| US-404 | As a student, I can track group/division level | group_division field: "TMT", "Healthcare", "Restructuring" | Backend done |
| US-405 | As a student, I can set next actions and deadlines | next_action + next_action_date fields on each application | Backend done |
| US-406 | As a student, I can track which resume version I used | resume_version field per application | Backend done |
| US-407 | As a student, I see summary stats | GET /api/applications/stats — count by status, by firm tier | Backend done |
| US-408 | **FRONTEND:** As a student, I see the /applications page | Table view + stats bar rendered in Next.js | Done |

### Backend Artifacts
- `models.py` — Application, ApplicationCreate, ApplicationUpdate, StatusChange
- `main.py` — 4 application routes + stats endpoint
- `db.py` — get/create/update_application(), insert_status_change()
- Migration `0002_phase2_features.sql` — applications, application_status_history tables

---

## Epic 5 — Networking Radar

**Goal:** User finds alumni at target firms, gets AI-drafted outreach, and tracks the full networking workflow.

### User Stories

| ID | Story | Acceptance Criteria | Status |
|----|-------|-------------------|--------|
| US-501 | As a student, I see alumni at each target firm | GET /api/alumni/{firm_id} returns alumni sorted by relevance | Backend done |
| US-502 | As a student, alumni are prioritized by connection strength | Same school +5, same major +3, same club +4, recent grad +2 | Backend done |
| US-503 | As a student, I get 2-3 outreach draft variants under 80 words | POST /api/networking/draft-outreach returns drafts | Backend done |
| US-504 | As a student, I can track outreach status per contact | not_contacted → message_sent → followed_up → responded → call_scheduled → call_completed → thank_you_sent | Backend done |
| US-505 | As a student, I get follow-up reminders for stale contacts | GET /api/networking/nudges returns contacts >7 days without response | Backend done |
| US-506 | As a student, I get thank-you note reminders within 24 hours | Contacts with call_completed but no thank_you within 48h flagged | Backend done |
| US-507 | As a student, referral chains are tracked | referred_by_id links contacts: "Sarah suggested I talk to Mike" | Backend done |
| US-508 | As a student, no email addresses or LinkedIn URLs are stored | Privacy-safe: only name, firm, role, grad year, connection hooks | Backend done |
| US-509 | **FRONTEND:** As a student, I see the /alumni page | Alumni cards + outreach drafting + contact CRM rendered in Next.js | Done |

### Backend Artifacts
- `alumni_finder.py` — find_alumni_at_firm(), prioritize_contacts(), generate_outreach_drafts(), generate_thank_you_draft(), generate_follow_up_draft(), get_stale_contacts(), get_contacts_needing_thank_you()
- `models.py` — Alumnus, NetworkingContact, NetworkingContactCreate, OutreachDraftRequest/Response
- `main.py` — 6 networking routes
- `db.py` — get_alumni_by_firm(), get/create/update_networking_contact()
- Migration `0002_phase2_features.sql` — alumni, networking_contacts tables

---

## Epic 6 — Interview Prep Coach

**Goal:** User practices firm-specific interview questions with AI evaluation and tracks readiness over time.

### User Stories

| ID | Story | Acceptance Criteria | Status |
|----|-------|-------------------|--------|
| US-601 | As a student, I can start a prep session for a specific firm and topic | POST /api/prep/start returns questions | Backend done |
| US-602 | As a student, questions are selected based on my weak areas | Spaced repetition: low mastery categories weighted higher | Backend done |
| US-603 | As a student, I get scored feedback on each answer | POST /api/prep/answer returns score, feedback, strengths, improvements | Backend done |
| US-604 | As a student, I see readiness scores per topic (0-5 scale) | GET /api/prep/readiness returns mastery per category | Backend done |
| US-605 | As a student, weak topics are flagged for review | needs_review=True when mastery < 2.5 or >7 days since practice | Backend done |
| US-606 | As a student, I get "Why this firm?" talking points | POST /api/prep/why-firm returns 3-5 personalized talking points | Backend done |
| US-607 | As a student, my prep history is preserved across sessions | GET /api/prep/history returns past sessions with scores | Backend done |
| US-608 | As a student, I see overall readiness percentage | get_overall_readiness() returns weighted average across categories | Backend done |
| US-609 | **FRONTEND:** As a student, I see the /prep page | Session starter + question loop + evaluation panel + readiness dashboard in Next.js | Done |

### Backend Artifacts
- `prep_coach.py` — QUESTION_BANK (46 questions, 7 categories), select_questions(), evaluate_answer(), update_readiness_scores(), get_overall_readiness(), generate_why_firm_talking_points()
- `models.py` — PrepSession, PrepAnswer, ReadinessScore, PrepSessionStart, PrepAnswerSubmit
- `main.py` — 5 prep routes
- `db.py` — get/create/update_prep_session(), create_prep_answer(), get/upsert_readiness_score()
- Migration `0002_phase2_features.sql` — prep_sessions, prep_answers, readiness_scores tables

---

## Epic 7 — Scraping Pipeline

**Goal:** Postings are refreshed nightly from firm career pages with diff logic.

### User Stories

| ID | Story | Acceptance Criteria | Status |
|----|-------|-------------------|--------|
| US-701 | As the system, postings are refreshed nightly at 2AM ET | run_nightly.py iterates all firms and calls adapters | Not started |
| US-702 | As the system, new postings are inserted and alerts sent | New postings appear, users with base score >= 80 get alerted | Not started |
| US-703 | As the system, disappeared postings are marked closed | closed_at timestamp set, not deleted | Not started |
| US-704 | As the system, scraper failures are isolated per firm | One broken adapter doesn't break the pipeline | Not started |
| US-705 | Build first 5 scraper adapters | Goldman Sachs, JPMorgan, William Blair, Jefferies, Evercore | Not started |

---

## Epic 8 — Polish & Launch Prep

**Goal:** Production-ready deployment with real users.

### User Stories

| ID | Story | Acceptance Criteria | Status |
|----|-------|-------------------|--------|
| US-801 | Full design audit against CLAUDE.md design system | Institutional editorial aesthetic, no banned patterns | Not started |
| US-802 | Marketing landing page | Hero, demo, pricing, waitlist signup | Not started |
| US-803 | Deploy to production | Vercel (frontend), Railway (backend), Supabase (live) | Not started |
| US-804 | Onboard 5 beta users from Bryant Finance Society | Real feedback collected, major bugs fixed | Not started |

---

## Sprint Plan

### Sprint 1 (Complete) — Foundation + Scoring
- E1: Foundation & Onboarding
- E2: Fit Scoring & Dashboard
- **Deliverable:** User can upload resume, see ranked opportunities with fit scores

### Sprint 2 (Current) — Timeline + Tracker
- US-309: Build /timeline frontend page
- US-408: Build /applications frontend page
- Wire backend routes to frontend API client
- **Deliverable:** User can see personalized calendar and track applications

### Sprint 3 — Networking + Prep
- US-509: Build /alumni frontend page
- US-609: Build /prep frontend page
- Seed alumni data for initial 25 firms
- **Deliverable:** User can find alumni, draft outreach, practice interviews

### Sprint 4 — Scraping Pipeline
- E7: All scraping user stories
- Expand firm registry from 25 to 50
- **Deliverable:** Postings auto-refresh nightly

### Sprint 5 — Polish & Launch
- E8: All polish user stories
- Performance optimization, error handling, edge cases
- **Deliverable:** Production deployment, first 5 beta users

---

## User Testing Plan

### Test Round 1 — After Sprint 2 (Timeline + Tracker)

**Participants:** 3 Bryant Finance Society members (1 sophomore, 1 junior, 1 senior)

| Test | Scenario | Success Metric |
|------|----------|---------------|
| T-101 | Upload resume, review parsed profile | All fields correctly parsed, user edits 0-2 fields |
| T-102 | View dashboard, understand fit scores | User can explain why their top match scored highest |
| T-103 | View timeline, identify this week's actions | User correctly identifies their current phase |
| T-104 | Log an application, update status to "applied" | Application appears in tracker with correct status |
| T-105 | Mark a timeline event as complete | Event shows as completed, disappears from weekly summary |

**Exit criteria:** All 5 scenarios pass for 2 of 3 participants.

### Test Round 2 — After Sprint 3 (Networking + Prep)

**Participants:** 5 Bryant Finance Society members (mix of class years)

| Test | Scenario | Success Metric |
|------|----------|---------------|
| T-201 | Find alumni at a target firm | User sees relevant alumni with connection hooks |
| T-202 | Generate outreach draft, edit it, mark as sent | Draft is under 80 words, sounds natural after editing |
| T-203 | Start a prep session, answer 3 questions | User gets scored feedback they find useful |
| T-204 | View readiness dashboard, identify weak areas | User correctly identifies their lowest-scoring topic |
| T-205 | Get a "Why this firm?" talking point they'd actually use | At least 2 of 5 talking points rated "useful" by user |
| T-206 | Full flow: upload resume → view dashboard → log application → check timeline → find alumni → prep for interview | User completes in under 15 minutes without getting stuck |

**Exit criteria:** All 6 scenarios pass for 3 of 5 participants. T-206 under 15 min for 4 of 5.

### Test Round 3 — After Sprint 5 (Pre-Launch)

**Participants:** 10 students (5 from Bryant, 5 from Babson/Bentley)

| Test | Scenario | Success Metric |
|------|----------|---------------|
| T-301 | First-time user onboarding (no guidance) | User reaches dashboard within 5 minutes |
| T-302 | Fit score trust test: does the user agree with their top 5 scores? | Agreement rate > 70% |
| T-303 | Would you use this weekly during recruiting? (NPS) | NPS > 40 |
| T-304 | What's missing? (open-ended feedback) | Actionable items logged, top 3 prioritized for post-launch |

**Exit criteria:** NPS > 40, onboarding < 5 min for 8 of 10 participants.

---

## Definition of Done

A user story is **done** when:
1. Backend route works and returns correct data
2. Frontend page renders the data correctly
3. RLS policies prevent unauthorized access
4. No Pyright errors in the changed files
5. Edge cases handled (empty states, loading states, error states)
6. Matches the design system in CLAUDE.md (institutional editorial, no banned patterns)
