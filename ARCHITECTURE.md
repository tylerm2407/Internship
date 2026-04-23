# InternshipMatch — Architecture

> This document describes the full system design, data models, API contracts, and the architectural decisions that shape the codebase. If you're trying to understand how InternshipMatch works end-to-end, start here.

---

## System Overview

InternshipMatch is a three-tier application with a clean separation between language work (handled by Claude) and structured work (handled by deterministic Python with Supabase as the source of truth). Unlike BryantPathfinder, which runs off static JSON because it's a hackathon build, InternshipMatch is a real product that needs to persist user data, refresh firm data nightly, and track application state over months of recruiting.

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend — Next.js 16 (browser)                                │
│                                                                 │
│  /                    Homepage                                  │
│  /signup /login       Supabase Auth (email-restricted pilot)    │
│  /upload              Resume upload + review                    │
│  /onboarding          Profile confirmation                      │
│  /dashboard           Ranked opportunity list                   │
│  /opportunity/[id]    Single posting deep dive + apply button   │
│  /applications        Application tracker                       │
│  /timeline            Personalized recruiting calendar          │
│  /alumni              Alumni network + outreach drafts          │
│  /prep                Interview prep coach                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST (Supabase Auth JWT in Authorization header)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend — FastAPI (Python 3.12)                                │
│                                                                 │
│  Users                                                          │
│  DELETE /api/users/me          Delete account + cascade data    │
│                                                                 │
│  Resume                                                         │
│  POST /api/resume/upload       Parse PDF → structured profile   │
│  POST /api/resume/confirm      Persist confirmed profile        │
│  GET  /api/resume              Get the user's current profile   │
│                                                                 │
│  Opportunities                                                  │
│  GET  /api/opportunities       Ranked postings with fit scores  │
│  GET  /api/firms               All firms                        │
│  GET  /api/firms/{id}          Single firm + its postings       │
│                                                                 │
│  Applications                                                   │
│  GET   /api/applications       List user applications           │
│  POST  /api/applications       Log a new application            │
│  PATCH /api/applications/{id}  Update status                    │
│  GET   /api/applications/stats Counts + funnel                  │
│  GET   /api/applications/upcoming                               │
│                                                                 │
│  Alumni + Networking                                            │
│  GET  /api/alumni/search                    Search alumni       │
│  GET  /api/alumni/{firm_id}                 Alumni at a firm    │
│  POST /api/alumni                           Add one alumnus     │
│  POST /api/alumni/import-csv                Bulk CSV import     │
│  GET  /api/networking/contacts              User's contacts     │
│  POST /api/networking/contacts              Log a contact       │
│  PATCH /api/networking/contacts/{id}        Update contact      │
│  POST /api/networking/draft-outreach        AI-drafted messages │
│  GET  /api/networking/nudges                Follow-up reminders │
│                                                                 │
│  Prep                                                           │
│  POST /api/prep/start                       Start prep session  │
│  POST /api/prep/answer                      Evaluate an answer  │
│  POST /api/prep/why-firm                    Firm-specific prep  │
│  GET  /api/prep/readiness                   Mastery scores      │
│  GET  /api/prep/history                     Past sessions       │
│  GET  /api/prep/session/{id}/answers                            │
│                                                                 │
│  Timeline                                                       │
│  GET    /api/timeline                       Personalized cal    │
│  GET    /api/timeline/weekly                Weekly summary      │
│  POST   /api/timeline/events                Create event        │
│  PATCH  /api/timeline/events/{id}           Update event        │
│  DELETE /api/timeline/events/{id}           Delete event        │
│  POST   /api/timeline/generate              Regenerate from     │
│                                             profile             │
│                                                                 │
│  Admin (requires institution_admin role)                        │
│  GET /api/admin/users                       Institution users   │
│  GET /api/admin/stats                       Institution usage   │
│  GET /api/admin/export                      Anonymized CSV      │
│                                                                 │
│  Infrastructure                                                 │
│  GET /api/health                            Health check        │
│  GET /api/notifications                     User notifications  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
             ┌─────────────────┼─────────────────┬──────────────────┐
             ▼                 ▼                 ▼                  ▼
┌─────────────────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────┐
│  Anthropic API          │ │  Supabase    │ │  Firecrawl   │ │  JSearch       │
│  claude-sonnet-4        │ │              │ │              │ │                │
│                         │ │  Postgres    │ │  Generic     │ │  Aggregator    │
│  - Resume parsing       │ │  Auth        │ │  scraping    │ │  adapter       │
│  - Qualitative fit      │ │  Storage     │ │  of firm     │ │                │
│  - Outreach drafts      │ │  RLS         │ │  careers     │ │                │
│  - Prep evaluation      │ │              │ │  pages       │ │                │
└─────────────────────────┘ └──────────────┘ └──────────────┘ └────────────────┘
```

---

## Core Design Principles

### 1. Supabase as the single source of truth

Every piece of user-facing state lives in Supabase. The resume, the parsed profile, the application tracker, the prep history — all of it. The backend is stateless; it reads from Supabase on every request and writes back on every mutation. This means users can come back to InternshipMatch in a week or a month and find exactly where they left off, which is the whole point for a product that supports a 12-month recruiting cycle. It also means the backend can restart, crash, or scale horizontally without losing anyone's data.

Documented in `docs/adr/0001-supabase-as-source-of-truth.md`.

### 2. Scrape don't integrate

There is no "official API" for the top 200 finance firms' job postings. Adventis and Trackr solve this by manually curating their lists and scraping the underlying firm career pages. InternshipMatch does the same thing. A nightly job runs the scraper against every firm in the registry, diffs the results against the previous run, and updates the `postings` table with new, updated, and closed roles. When a new posting appears, users whose profile matches it get an alert the next morning.

This is reliable enough for a vertical product because the firm list is small and stable. If J.P. Morgan redesigns their careers page, I can fix the scraper for that one firm in 15 minutes. Building a real integration with every firm's ATS (iCIMS, Workday, Greenhouse, Taleo) would be months of work for no practical benefit.

Documented in `docs/adr/0002-scrape-vs-api-integration.md`.

### 3. Hybrid fit scoring over pure LLM or pure keywords

Fit scoring is the core feature and it has to be fast, consistent, and explainable. A pure LLM approach is slow and non-deterministic. A pure keyword match is dumb and untrustworthy. InternshipMatch uses a deterministic base score (handling GPA cutoffs, class year eligibility, geography, coursework progression, and experience-relevance weighting) layered with a Claude-generated qualitative adjustment and rationale. The deterministic layer runs in milliseconds against all 200 firms; Claude only runs against the top 30 matches and generates the human-readable explanation.

Documented in `docs/adr/0003-hybrid-fit-scoring.md`.

### 4. Vertical focus over horizontal breadth

InternshipMatch will never support marketing internships, software engineering internships, or any other category outside undergraduate finance. This is a deliberate product decision. Competitors like Handshake and Simplify try to cover every job; InternshipMatch goes 10x deeper on the one audience it serves. The firm registry, the scoring model, the timeline logic, and the interview prep corpus are all finance-specific.

Documented in `docs/adr/0004-vertical-focus-over-breadth.md`.

### 5. Honest scoring with explanations

Every fit score comes with a Claude-generated rationale: what went well, what didn't, and whether the application is worth your time. Scores are never inflated to make users feel good. A 54 is a 54. This honesty is the product's defensive moat — once a student trusts that the scores mean something, they'll come back to InternshipMatch every time they need to make a real recruiting decision.

Documented in `docs/adr/0005-honest-scoring-with-explanations.md`.

---

## The Data Model

### User

Authenticated via Supabase Auth. One row per user in the `users` table.

```python
class User(BaseModel):
    id: UUID
    email: str
    created_at: datetime
    school: str                          # "Bryant University"
    graduation_year: int                 # 2029
    current_class_year: Literal["freshman", "sophomore", "junior", "senior"]
    onboarding_complete: bool
```

### StudentProfile

Extracted from the uploaded resume, editable by the user. One-to-one with User.

```python
class PriorExperience(BaseModel):
    role: str
    organization: str
    summary: str
    dates: str                           # "2025-09 to present"
    bullets: list[str]

class StudentProfile(BaseModel):
    user_id: UUID
    name: str
    school: str
    major: str                           # "Finance"
    minor: str | None
    gpa: float | None
    target_roles: list[str]              # ["investment_banking_mm", "sales_and_trading"]
    target_geographies: list[str]        # ["NYC", "Boston", "Providence"]
    technical_skills: list[str]
    coursework_completed: list[str]      # ["FIN 201", "MATH 201"]
    coursework_in_progress: list[str]
    clubs: list[str]
    certifications: list[str]
    prior_experience: list[PriorExperience]
    diversity_status: str | None
    languages: list[str]
    last_updated: datetime
```

### Firm

A company in the target registry. ~200 rows, curated manually and refreshed nightly.

```python
class Firm(BaseModel):
    id: UUID
    name: str                            # "William Blair"
    tier: Literal["bulge_bracket", "elite_boutique", "middle_market", "boutique", "regional", "buy_side", "quant"]
    roles_offered: list[str]             # ["investment_banking", "capital_markets"]
    headquarters: str                    # "Chicago, IL"
    offices: list[str]
    gpa_floor_estimated: float           # 3.5 — our best estimate of their GPA cutoff
    recruiting_profile: str              # short description of how they recruit
    careers_url: str
    scraper_adapter: str                 # which scraper module handles this firm
    last_scraped_at: datetime
```

### Posting

A single open role at a firm. Refreshed nightly from the scraper. Rows are never deleted — closed roles are marked with a `closed_at` timestamp so historical data is preserved.

```python
class Posting(BaseModel):
    id: UUID
    firm_id: UUID
    title: str                           # "2027 Summer Analyst - Investment Banking"
    role_type: str                       # "investment_banking_summer_analyst"
    class_year_target: Literal["freshman", "sophomore", "junior", "senior"]
    location: str
    description: str                     # full raw text scraped from the posting
    requirements: list[str]              # parsed bullet list of requirements
    application_url: str
    posted_at: datetime
    deadline: datetime | None
    closed_at: datetime | None
    estimated_effort_minutes: int        # how long the application takes
```

### FitScore

Computed when a user loads the dashboard. One row per (user, posting) pair, cached with a 24-hour TTL.

```python
class FitScore(BaseModel):
    user_id: UUID
    posting_id: UUID
    score: int                           # 0-100
    tier: Literal["strong_match", "reach", "long_shot", "not_recommended"]
    rationale: str                       # Claude-generated 2-3 sentence explanation
    strengths: list[str]                 # bullet list of what matches
    gaps: list[str]                      # bullet list of what doesn't
    computed_at: datetime
```

### Application

Tracks what the user has actually applied to. Manual or auto-logged when the user clicks through to apply.

```python
class Application(BaseModel):
    id: UUID
    user_id: UUID
    posting_id: UUID
    status: Literal["planned", "applied", "screen", "first_round", "superday", "offer", "rejected", "withdrew"]
    applied_at: datetime | None
    notes: str
    next_action: str | None
    next_action_date: datetime | None
```

### Alumni

Bryant alumni at target firms. Phase 1 is a static JSON seed; Phase 2 adds LinkedIn scraping with user consent.

```python
class Alumnus(BaseModel):
    id: UUID
    name: str
    graduation_year: int
    major: str
    firm_id: UUID
    current_role: str
    linkedin_url: str
    connection_notes: str | None         # "met at SMIF dinner Spring 2026"
```

### PrepSession

A single interview prep session the user runs.

```python
class PrepQuestion(BaseModel):
    question: str
    category: Literal["technical", "behavioral", "firm_specific", "fit"]
    difficulty: Literal["easy", "medium", "hard"]
    source: str                          # "WSO Goldman Sachs TMT report, posted 2024-11"

class PrepEvaluation(BaseModel):
    answer_transcript: str
    score: int                           # 0-100
    feedback: str                        # Claude's critique
    suggested_improvements: list[str]

class PrepSession(BaseModel):
    id: UUID
    user_id: UUID
    firm_id: UUID
    role_type: str
    questions: list[PrepQuestion]
    evaluations: list[PrepEvaluation]
    overall_readiness_score: int
    created_at: datetime
```

---

## The Fit Scoring Algorithm

Fit scoring is the most important piece of logic in InternshipMatch. Here's how it actually works.

### Phase 1: Deterministic base score (0-100)

For every (user, posting) pair, Python computes a base score from six factors:

1. **GPA fit (weight: 25)** — is the user's GPA above, at, or below the firm's estimated GPA floor? Above: full points. At: 80%. Below by <0.3: partial credit. Below by more: penalty.
2. **Class year eligibility (weight: 20)** — does the posting target the user's current class year? Wrong class year is an automatic hard filter, not a score reduction.
3. **Role match (weight: 20)** — does the posting's `role_type` appear in the user's `target_roles`? Exact match: full points. Adjacent role (e.g., S&T when user wants IB): partial.
4. **Coursework progression (weight: 15)** — has the user completed the coursework typically expected for this role at this firm's tier? A bulge bracket IB posting expects FIN 310 and FIN 312 completed by junior fall. A middle-market firm is more forgiving.
5. **Geographic fit (weight: 10)** — is the posting's location in the user's `target_geographies`? Includes proximity scoring (NYC is close to Boston, Providence is on the fence).
6. **Experience relevance (weight: 10)** — do the user's `prior_experience` bullets contain keywords from the posting's `requirements`? This is a genuine keyword match with weighted terms.

The base score is the weighted sum, clamped to 0-100.

### Phase 2: Claude qualitative pass (top 30 matches only)

Running Claude against all 200 firms would be slow and expensive. Instead, Python sorts by base score, takes the top 30, and calls Claude once per match with this prompt:

> Given this student profile: {profile}
> And this job posting: {posting}
> The deterministic base score is {base_score}/100.
> Is this base score too high, too low, or about right? Adjust it by up to ±15 points based on factors the deterministic model misses, and write a 2-3 sentence rationale explaining the final score. Identify 2-3 specific strengths and 2-3 specific gaps.

Claude's adjustment is added to the base score and clamped to 0-100. The final score, tier, rationale, strengths, and gaps are stored in the `fit_scores` table with a 24-hour TTL.

### The tier mapping

- 85-100: **strong_match** — apply with confidence, prepare thoroughly
- 70-84: **reach** — worth applying but not your top priority
- 55-69: **long_shot** — apply if you have time, don't waste prep cycles
- 0-54: **not_recommended** — the honest warning

---

## The Scraping Pipeline

Every night at 2:00 AM Eastern, a scheduled job runs `backend/scrapers/run_nightly.py`. The script iterates every firm in the registry, calls the firm's scraper adapter, and diffs the current postings against the stored postings.

### Scraper adapters

Every firm has its own adapter module because career page layouts are all different. The adapter pattern keeps the orchestration simple and the per-firm logic isolated:

```python
class FirmScraper(Protocol):
    def fetch_postings(self) -> list[ScrapedPosting]: ...
```

Most firms use Firecrawl (via MCP) because it handles JavaScript rendering and retries automatically. A handful of firms with aggressive bot detection or heavy JS routing use direct Playwright scripts. When Adventis or Trackr publish aggregated lists, InternshipMatch ingests those as a separate adapter to catch anything the per-firm scrapers miss.

### Diff logic

After scraping, the pipeline compares the fresh list against the stored `postings` table:

- **New posting:** insert row, mark `posted_at` to today, send alerts to users whose base score >= 80
- **Updated posting:** update title, description, requirements, deadline (preserve `posted_at`)
- **Disappeared posting:** set `closed_at` to today (don't delete — keep history)

### Failure modes

Scrapers break. When an adapter fails, the pipeline logs the error with the firm ID and continues with the next firm. A human (me) reviews the error log every morning and fixes broken adapters manually. Broken adapters don't affect existing postings — stale data is better than missing data.

---

## API Contracts

### POST /api/resume/upload

Request: multipart form with the PDF file.

Response: the parsed `StudentProfile` object. The user can then edit any field before saving.

### GET /api/opportunities

Query params: `limit` (default 30), `min_score` (default 55), `role_type` (optional filter)

Response:
```json
{
  "opportunities": [
    {
      "posting": { ... Posting ... },
      "firm": { ... Firm ... },
      "fit_score": { ... FitScore ... },
      "alumni_count": 3,
      "has_active_application": false
    }
  ],
  "total_evaluated": 147,
  "scoring_completed_at": "2026-04-08T14:23:00Z"
}
```

### POST /api/applications

Request: `{"posting_id": "...", "status": "planned"}`

Response: the created `Application` object. The frontend updates the opportunity card to show the application state.

### POST /api/prep/answer

Request: `{"session_id": "...", "question_id": "...", "answer_text": "..."}`

Response: Claude's evaluation of the answer — a 0-100 score, written feedback, lists of strengths and improvements, and an updated mastery score for the relevant category. Technical questions return a numerical score; behavioral questions return STAR-framework feedback; firm-specific questions return an alignment score with the firm's current strategy.

Rate-limited to 10 requests / minute / IP — each call invokes Claude.

---

## Repository Structure

```
internshipmatch/
├── README.md
├── ARCHITECTURE.md
├── CLAUDE.md
├── ROADMAP.md
│
├── docs/
│   ├── adr/
│   │   ├── 0001-resume-upload-claude-vision-parsing.md
│   │   ├── 0002-curated-firm-database-nightly-scraping.md
│   │   ├── 0003-hybrid-fit-scoring.md
│   │   ├── 0004-personalized-recruiting-timeline.md
│   │   ├── 0005-application-tracker-status-sync.md
│   │   ├── 0006-networking-events-radar-phase1.md
│   │   └── 0009-networking-events-phase2-three-source.md
│   └── aie/
│       └── INDEX.md + per-feature folders
│
├── backend/
│   ├── app/
│   │   ├── main.py                     FastAPI routes (monolithic today;
│   │   │                               splitting into routers is tracked
│   │   │                               as a follow-up refactor)
│   │   ├── models.py                   Pydantic data models
│   │   ├── admin.py                    Admin endpoints (role-gated)
│   │   ├── auth.py                     Supabase Auth middleware
│   │   ├── rate_limit.py               slowapi limiter + named limits
│   │   ├── resume_parser.py            Claude Vision resume extraction
│   │   ├── fit_scorer.py               Hybrid scoring engine
│   │   ├── timeline_builder.py         Personalized calendar generation
│   │   ├── alumni_finder.py            Alumni lookup + outreach draft
│   │   ├── prep_coach.py               Interview prep session logic
│   │   ├── prompts.py                  All Claude prompt strings +
│   │   │                               input sanitizer
│   │   ├── claude_client.py            Anthropic SDK wrapper
│   │   └── db.py                       Supabase Python client
│   ├── scrapers/
│   │   ├── base.py                     Scraper protocol
│   │   ├── normalizer.py               Posting normalization
│   │   ├── firm_matcher.py             Match postings to firm registry
│   │   ├── diff_engine.py              New/updated/closed diffing
│   │   ├── adapters/
│   │   │   ├── firecrawl_generic.py    Generic Firecrawl-backed adapter
│   │   │   └── jsearch_adapter.py      JSearch API aggregator
│   │   └── run_nightly.py              Orchestration script
│   ├── prep_corpus/
│   │   ├── wso_ingest.py               Ingestion from WSO interview reports
│   │   ├── glassdoor_ingest.py
│   │   └── seed_data.json              Initial question bank
│   ├── tests/
│   │   ├── test_fit_scorer.py
│   │   ├── test_resume_parser.py
│   │   └── test_scrapers.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    Homepage with resume upload CTA
│   │   ├── onboarding/page.tsx         Post-upload profile confirmation
│   │   ├── dashboard/page.tsx          Ranked opportunity list
│   │   ├── timeline/page.tsx
│   │   ├── firm/[id]/page.tsx
│   │   ├── alumni/page.tsx
│   │   └── prep/page.tsx
│   ├── components/
│   │   ├── ResumeUploader.tsx
│   │   ├── OpportunityCard.tsx
│   │   ├── FitScoreBreakdown.tsx
│   │   ├── TimelineView.tsx
│   │   ├── AlumniCard.tsx
│   │   ├── OutreachDraftEditor.tsx
│   │   ├── PrepSession.tsx
│   │   └── PrepEvaluationPanel.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── supabase.ts
│   │   ├── store.ts                    Zustand for ephemeral UI state
│   │   └── types.ts                    TS types matching Pydantic models
│   ├── tailwind.config.ts
│   └── package.json
│
└── infra/
    ├── supabase/
    │   ├── migrations/                 SQL migrations for schema changes
    │   └── seed/
    │       ├── firms.json              Initial firm registry
    │       └── alumni.json             Initial Bryant alumni seed
    └── scripts/
        ├── deploy.sh
        └── run_scraper.sh              Manual scraper trigger for debugging
```

---

## Design System

InternshipMatch uses a more conservative, institutional aesthetic than BryantPathfinder. The audience is finance students preparing for interviews at firms like Goldman Sachs and William Blair — the UI needs to feel like it belongs in the same world.

- **Background:** `#FAFAFA` (off-white, slightly cooler than Pathfinder's cream)
- **Primary text:** `#0A0A0A` (near-black)
- **Secondary text:** `#6B6B6B`
- **Accent:** a single deep navy `#0B2545` used for primary CTAs — the color of finance
- **Display font:** Fraunces (serif) for headlines — editorial, authoritative
- **UI font:** Inter (allowed here, because the institutional look calls for it)
- **Mono font:** IBM Plex Mono for firm names, scores, and timestamps
- **Layout:** Dense but organized — the dashboard needs to show 30 opportunities without feeling cramped
- **Cards:** Flatter than BryantPathfinder — single border, subtle background, minimal shadow
- **No rounded-full buttons.** Finance UIs use slight rounding, not pill shapes.

The design intentionally feels different from BryantPathfinder because the audience has different expectations. Pathfinder is playful and editorial; InternshipMatch is institutional and confident.

---

## Scaling Notes

InternshipMatch is built as a real product from day one, so scaling considerations matter earlier than they did for BryantPathfinder.

**Scraping load.** At 200 firms with nightly runs, we're making ~200 Firecrawl calls per day. At current Firecrawl pricing that's roughly $20/month in scraping costs. If InternshipMatch expands to include Canadian firms and European firms, the cost scales linearly.

**Fit scoring cost.** At 30 Claude calls per user per dashboard load, and an expected cost of ~$0.02 per call, each dashboard refresh is ~$0.60. Cached for 24 hours, the amortized cost per active user is a few dollars per month. Free for the first 100 users; after that, a premium tier unlocks unlimited refreshes.

**Alumni data.** The Phase 1 alumni seed is manual (I'll add Bryant alumni I know of and pull from the SMIF directory). Phase 2 adds user-contributed alumni ("I know this person") with moderation. Phase 3 adds LinkedIn scraping with user consent via a browser extension.

**Multi-school expansion.** The moment InternshipMatch proves out at Bryant, the next move is Babson, Bentley, and other regional business schools in the Boston/Providence corridor. Adding a school is a matter of adding an alumni seed and adjusting the GPA floor model for the school's placement history. Phase 2.
