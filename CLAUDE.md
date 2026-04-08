# CLAUDE.md — Claude Code Configuration for InternshipMatch

> This file tells Claude Code everything it needs to know to work on this project effectively. Read this first when starting a new session.

---

## Project Identity

**Name:** InternshipMatch
**Tagline:** Break into finance without the spreadsheet.
**One-liner:** An AI recruiting agent for business school students that reads your resume, knows the top 200 finance firms, and tells you exactly where to apply, when to apply, and what to say.

**Builder:** Owen Ash — sophomore Finance major at Bryant University, class of 2029.
**Target audience:** Undergraduate business students recruiting for investment banking, sales and trading, private equity, quant, asset management, and equity research roles.
**Repo:** github.com/Oman6/internshipmatch

---

## The Core Insight

The finance recruiting space has three types of tools and none of them do the whole job. There are **databases** (Adventis, Trackr, WSO) that list firms and postings but don't personalize. There are **resume matchers** (Jobscan, Teal, Seekario) that score fit but know nothing about finance recruiting specifically. There are **courses** (WSO Academy, FMC) that prepare you but don't tell you where to apply. InternshipMatch is the first product that combines all three functions into one agent, built vertical for finance students only.

The competitive edge is **vertical depth**, not horizontal breadth. Never add marketing internships. Never add software engineering roles. Never support graduate programs. Stay narrow, go deep, win by knowing finance recruiting better than any general-purpose tool ever will.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Python 3.12, Pydantic v2 |
| AI | Anthropic Claude (claude-sonnet-4-5) via the official Python SDK |
| Database | Supabase — Postgres, Auth, Storage |
| Scraping | Firecrawl MCP for most firms, Playwright for JS-heavy career pages |
| Deployment | Vercel (frontend), Railway (backend), Supabase (data layer) |
| Scheduled jobs | Railway cron for the nightly scraper run |

---

## Build Order

This is a multi-day build, not a single hackathon sprint. Follow this order and land each phase before moving to the next.

### Phase 1 — Foundation (Day 1)

1. **Set up the repo scaffold.** Write the top-level docs (README, ARCHITECTURE, CLAUDE.md are already in place — you're reading one now). Write the 5 ADRs.
2. **Set up Supabase.** Create the project, define the schema (users, student_profiles, firms, postings, fit_scores, applications, alumni, prep_sessions), run the initial migrations.
3. **Seed the firm registry.** Start with 25 firms covering the obvious tiers: 5 bulge brackets (GS, JPM, MS, BofA, Citi), 8 elite boutiques (Evercore, Lazard, Moelis, Centerview, Perella, PJT, Guggenheim, Qatalyst), 8 middle-market (Houlihan Lokey, William Blair, Baird, Jefferies, Piper Sandler, Raymond James, Harris Williams, Lincoln International), 4 quant/buy-side (Citadel, Two Sigma, Jane Street, AQR). Expand from 25 to 200 once the core flow is working.
4. **Build the Pydantic models.** Every model from ARCHITECTURE.md, fully typed, every field documented.
5. **Build the resume parser.** Claude Vision reads the PDF, returns a structured StudentProfile. This is the entry point to the whole app — get it solid.

### Phase 2 — Core scoring and dashboard (Day 2)

6. **Build the deterministic fit scoring engine.** Six-factor weighted model from ARCHITECTURE.md. Unit tests against known profiles.
7. **Build the Claude qualitative pass.** Only runs on the top 30 base scores. Prompts live in `prompts.py`. Caches results in the `fit_scores` table.
8. **Build the FastAPI routes.** `/api/resume/upload`, `/api/opportunities`, `/api/firms/{id}`, `/api/applications`. Real auth via Supabase.
9. **Build the frontend shell.** Next.js 15 app router, Supabase Auth integration, shadcn/ui base components.
10. **Build the homepage and resume upload flow.** Clean, direct — one CTA, one upload zone.
11. **Build the dashboard page.** Ranked opportunity list with fit scores, rationale, and apply buttons.

### Phase 3 — Scraping pipeline (Day 3)

12. **Build the scraper base protocol and the first five adapters.** Goldman Sachs, JP Morgan, William Blair, Jefferies, Evercore. Use Firecrawl MCP where possible.
13. **Build the diff logic.** Compare fresh scrape against stored postings, insert/update/mark-closed.
14. **Build the nightly orchestration script** and manually trigger it to seed the `postings` table.
15. **Wire the dashboard to real postings.** Remove any seed data, use live scraped postings.

### Phase 4 — Timeline and application tracker (Day 4)

16. **Build the timeline builder.** Generate a personalized recruiting calendar based on class year and target roles. Sophomore early insights in fall, junior summer apps starting in August the year before, diversity programs earlier.
17. **Build the `/timeline` page.** Calendar view with deadlines, recommended actions, and a "what to do this week" widget.
18. **Build the application tracker.** Users log applications, update status as they progress through interview rounds. Notifications for upcoming deadlines.

### Phase 5 — The unique features (Days 5-6)

19. **Build the alumni finder.** Manually seed Bryant alumni at the initial 25 firms. Build the `/alumni` page with cards for each alum, "draft outreach" button that calls Claude with the alum's info and the user's profile, outreach tracker.
20. **Build the interview prep coach.** Seed the prep corpus with WSO question banks (copied manually for Phase 1). Build the `/prep` page with firm-specific session starter, practice question loop, and Claude evaluation of answers.

### Phase 6 — Polish and launch prep (Day 7)

21. **Full design pass.** Re-read the design skills, audit the UI against the anti-patterns in CLAUDE.md.
22. **Write the marketing landing page.** Hero, demo video, pricing (free for Phase 1), waitlist signup.
23. **Deploy to production.** Vercel for frontend, Railway for backend, Supabase already live.
24. **Onboard first 5 beta users from Bryant Finance Society.** Get real feedback before wider launch.

---

## Design System — Non-Negotiable

InternshipMatch uses an **institutional editorial** aesthetic. More conservative than BryantPathfinder, more confident than a generic SaaS dashboard. The audience is finance students preparing to interview at firms like Goldman Sachs — the UI has to feel like it belongs in that world.

### Skills to load before writing UI code

1. `/mnt/skills/user/high-end-visual-design/SKILL.md`
2. `/mnt/skills/user/design-taste-frontend/SKILL.md`
3. `/mnt/skills/public/frontend-design/SKILL.md`

### Locked aesthetic direction

- **Background:** `#FAFAFA` (off-white, slightly cooler than Pathfinder)
- **Primary text:** `#0A0A0A` (near-black)
- **Secondary text:** `#6B6B6B`
- **Accent:** `#0B2545` (deep navy) — the color of finance, used only for primary CTAs and the logo
- **Display font:** Fraunces for hero headlines — serif, authoritative
- **UI font:** Inter — yes, Inter is allowed here, because institutional UIs call for it and I'm not making design decisions based on what's fashionable
- **Mono font:** IBM Plex Mono for firm names, scores, CRNs, timestamps, and financial figures
- **Layout:** Dense but organized. The dashboard must show 30 opportunities without feeling cramped.
- **Cards:** Flatter than BryantPathfinder — single 1px border, subtle background, minimal shadow. Finance UIs don't use heavy elevation.
- **Buttons:** Slight rounding (`rounded-md`), not pill shapes. Finance products don't use `rounded-full` CTAs.
- **Icons:** Phosphor Regular (not Light) — slightly heavier weight to match the institutional feel.

### Banned

- Playful serifs like Instrument Serif (that's Pathfinder's aesthetic, not this one)
- Rounded-full buttons
- Gradients of any kind
- Purple, teal, or bright accent colors
- Emojis anywhere
- "Elevate", "Seamless", "Game-changer", "Unleash" copy
- Hero illustrations or 3D animations

---

## Code Standards

### Python

- **Every function has type annotations.** Not optional.
- **Every public class and function has a docstring** with Args, Returns, Raises.
- **All request and response bodies are Pydantic models.** Never raw dict.
- **All external API calls are wrapped in try/except** with specific error handling. Scrapers in particular must fail gracefully — one broken firm never breaks the whole pipeline.
- **Use structured logging.** `logger.info("scraper.completed", firm_id=id, postings_found=n)` — not print().
- **Unit tests for the fit scorer.** This is the single most important piece of code. Test it against known profiles to catch regressions.

### TypeScript

- Strict mode on. No `any`.
- API calls typed end-to-end. TS types in `lib/types.ts` mirror the Pydantic models.
- React functional components with explicit prop types.
- Tailwind utility classes only.
- Zustand for ephemeral UI state; Supabase for everything persistent.

### Supabase

- All schema changes go through migrations in `infra/supabase/migrations/`. Never edit schema in the dashboard.
- RLS (Row Level Security) enabled on every user-owned table. Users can only read and write their own rows.
- Service role key stays server-side only. Never ship to the browser.

---

## Critical Gotchas

### The fit scorer is the product

If the scoring engine is wrong, users lose trust immediately. Test it against your own resume before shipping. Run it against Goldman Sachs TMT (should score low to moderate for a sophomore) and William Blair middle-market IB (should score high). If the numbers don't match your intuition, the model is broken — fix it before building anything else on top.

### Scrapers break constantly

Career pages redesign without warning. The Goldman scraper will work on Monday and be broken on Tuesday. Build the scraper pipeline to log errors per-firm and continue with the rest. A daily morning review of scraper errors is part of the product operations, not a failure mode. Don't try to fully automate recovery — manually fixing broken adapters is fine.

### Don't store raw resumes in the database

PDFs go to Supabase Storage. The parsed StudentProfile goes in the `student_profiles` table. Keep them separate — the database shouldn't hold binary data.

### FERPA and student data concerns

Student profiles contain GPA, coursework, and other protected academic information. Even though users are uploading voluntarily, treat this data with care. Don't log it. Don't send it to third parties. Don't train any models on it. Be explicit in the privacy policy about what InternshipMatch does and doesn't do with user data.

### The first 25 firms matter more than the next 175

Don't try to launch with 200 firms. Launch with 25 great ones, get the scoring right, get the first users happy, then expand. A tool that's great at 25 firms is infinitely more useful than a tool that's mediocre at 200.

### The Vision resume parser can be flaky

Claude Vision sometimes misreads GPAs, mistakes club names for employers, or hallucinates coursework that isn't there. Always show the parsed profile to the user and let them edit every field before saving. The resume upload screen is not "upload and done" — it's "upload, review, correct, save."

---

## The First Five Features

These are the features documented in `docs/adr/0001` through `0005`. Build them in this order.

1. **Resume Upload + AI Parsing (ADR 0001)** — the entry point. PDF → StudentProfile via Claude Vision. Must have a review-and-edit step.
2. **Curated Firm Database with Live Postings (ADR 0002)** — 200 firms with nightly-refreshed postings via the scraper pipeline.
3. **Hybrid Fit Scoring (ADR 0003)** — deterministic base + Claude qualitative pass. The core of the product.
4. **Personalized Recruiting Timeline (ADR 0004)** — class-year-aware calendar with deadlines and recommendations.
5. **Application Tracker with Status Sync (ADR 0005)** — log what you apply to, track status through interview rounds, get reminded about deadlines.

## The Two Unique Features

After the first five ship, the two features that genuinely differentiate InternshipMatch from everything else in the market.

### Feature 6: Networking Radar

For every firm in the user's target list, surface Bryant alumni currently working there. Cross-reference the alumni database (Phase 1: manual seed) with the user's firm list. Generate personalized cold outreach messages via Claude. Track response rates and follow-ups. Schedule coffee chats. Draft thank-you notes. Turn "you should network" from vague advice into a structured workflow.

Build this after Phase 1 of the core features ship. It's what users will tell their friends about.

### Feature 7: Interview Prep Coach

Ingest WSO and Glassdoor interview reports into a `prep_corpus` table indexed by firm and role type. When a user schedules an interview, generate a personalized prep plan based on the firm, the role, and the user's resume gaps. Practice sessions: user records an answer, Claude evaluates it on structure (STAR framework for behavioral, correctness for technical) and gives specific feedback. Track readiness scores over time.

The prep corpus seed is the hardest part — it's labor-intensive to build. Start with the top 10 firms only. Expand as user demand grows.

---

## When You Get Stuck

**The scraper is getting blocked.** Some firms have aggressive bot detection. Try Firecrawl first; if it fails, fall back to Playwright with stealth mode; if that fails, switch to ingesting the firm's postings via Adventis's public mirror. Document the workaround in the adapter file.

**The fit scores feel wrong.** Run the scorer against three test profiles: a strong candidate (3.9 GPA, junior, relevant coursework, prior IB experience), a middle candidate (3.5 GPA, sophomore, general business coursework), and a weak candidate (3.1 GPA, freshman, no finance experience). If the scores don't differentiate meaningfully, the weights are wrong — tune them.

**Claude Vision misreads the resume.** Improve the prompt with more worked examples. Make sure the user-facing review screen surfaces every parsed field so users catch errors. Don't try to make Vision perfect — make the review UX excellent.

**Supabase Auth isn't working.** Check that CORS is configured correctly on the backend, the anon key is in the frontend env, and RLS policies don't block the initial user insert. This is usually a policy issue, not an auth issue.

**The dashboard is slow.** Fit scores should be cached. If the dashboard is recomputing scores on every load, the cache is broken. Check the TTL logic in `fit_scorer.py`.

---

## Don't Do This

- **Don't expand beyond finance.** Every request to add "marketing internships" or "tech internships" is a request to make the product worse. The vertical focus is the strategy.
- **Don't inflate fit scores.** If the scoring engine wants to say 54, show 54. Users trust honesty. Fake scores are a one-time win that destroys long-term trust.
- **Don't train models on user resumes.** Not worth the privacy liability and not necessary for product quality.
- **Don't store LinkedIn scraped data without consent.** Phase 1 alumni is manually seeded. Phase 2 requires explicit user consent via a browser extension the user installs themselves.
- **Don't build a mobile app in Phase 1.** Web is enough. Students are on laptops when they're actually applying to internships.
- **Don't add AI-written cover letters.** This is a rabbit hole of ethical concerns and low product value. The user should write their own cover letters; InternshipMatch helps with everything else.
- **Don't build features nobody asked for.** After the first seven features ship, let user feedback drive what comes next.

---

## Change Documentation — AIE (Align, Instruct, Execute)

**Every non-trivial code change MUST be documented using the `/aie` skill.** This is mandatory, not optional.

### When AIE triggers (auto-activate)

- Writing or editing more than 20 lines of code in a single change
- Creating a new file with substantive logic
- Deleting any file
- Adding or removing a dependency
- Changing the database schema (table, column, index, policy, migration)
- Adding, modifying, or removing an API route
- Changing a system prompt or Claude API call
- Making an architectural decision about how two systems connect
- Fixing a bug that requires changes across more than one file

### When AIE does NOT trigger

- Typo/spelling fixes
- Comment-only updates
- Variable renames with no logic change
- Whitespace/formatting only
- Single-sentence README edits

### The process

1. **Align** — Write `docs/aie/AIE-[NNN]-[slug]/align.md` BEFORE any code. Get user confirmation.
2. **Instruct** — Write `instruct.md` when implementation begins. Capture the exact directive.
3. **Execute** — Write `execute.md` after implementation. Document every file touched and the outcome.
4. **Update** — Add a row to `docs/aie/INDEX.md`.

**The cardinal rule: never write implementation code before `align.md` is confirmed by the user.**

See the full AIE skill reference at `~/.claude/skills/aie/reference.md` for severity guide, naming conventions, and examples.

---

## The One Thing

If you can only do one thing well, **make the fit scoring honest and explainable.** Everything else — the scraping, the alumni finder, the prep coach — is downstream of that one decision. If users trust the scores, they come back every week. If they don't, the product is dead.
