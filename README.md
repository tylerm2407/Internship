# InternshipMatch

> Break into finance without the spreadsheet.

**One sentence:** InternshipMatch is an AI recruiting agent for business school students — it reads your resume, knows the top 200 finance firms, and tells you exactly where to apply, when to apply, and what to say.

---

## The Problem

Finance recruiting is a full-time job on top of being a full-time student. For a business major targeting investment banking, sales and trading, private equity, or quant, the process starts 12 to 18 months before the internship actually happens and looks something like this.

You maintain a Google Sheet of 150+ firms. You check Wall Street Oasis, Adventis, and Trackr every morning to see what's opened. You bookmark Goldman Sachs, JP Morgan, Evercore, Moelis, Lazard, Houlihan Lokey, William Blair, Baird, Jefferies, and another eighty firms, each with their own application portal. Some applications open in August, some in December, some in February — and the deadlines shift every year. The sophomore summer early insights programs have diversity criteria you need to decode. The junior summer analyst roles are the ones that actually feed into full-time offers. Half the postings are for "2028 summer analysts" and half are for "2027 summer analysts" and you have to figure out which class you even are.

Once you find a role you want, you read a 400-word job description looking for which specific skills they want. You try to figure out if your 3.78 GPA and your FMC program certification and your student-managed fund experience are enough. You tweak your resume to match the posting. You write a cover letter. You submit. You never hear back. You do this fifty times.

The tools that exist are databases. Adventis lists 200 firms. Trackr tracks applications. WSO has a course. None of them tell you *where to focus your time*. None of them read your resume and tell you "you have a real shot at these twelve firms, a stretch at these eight, and the other hundred are wasting your time." None of them help you prepare for the interviews once you get them.

InternshipMatch does. You upload your resume once. You tell it what roles you want (IB, S&T, PE, quant, asset management, equity research — pick any). It ingests the live opening list from the top 200 firms, scores your fit against each one with honest, specific reasoning, builds you a personalized recruiting timeline, finds Bryant alumni at every firm you're targeting, and prepares you for each interview with firm-specific technicals pulled from real WSO and Glassdoor interview reports.

It's the tool a finance major actually needs. Built by one.

---

## The Demo

Owen Ash is a sophomore Finance major at Bryant University. 3.78 GPA. He's completed Intro to Business, Statistics I, and Principles of Anthropology and is currently taking Financial Management, Macroeconomics, and Writing Workshop. He's interested in investment banking — specifically middle-market M&A — and sales and trading. He's going to be recruiting for Summer 2028 junior analyst positions starting next fall.

He opens InternshipMatch and uploads his resume. Three seconds later, the dashboard shows him:

- **47 firms with matching open applications** right now, ranked by fit score
- **Top match: William Blair middle-market IB summer analyst**, 87% fit, deadline in 6 weeks, three Bryant alumni currently at the firm
- **Second match: Jefferies S&T early insights program**, 82% fit, deadline in 10 days, application takes ~45 minutes
- **The honest warning:** his fit score for Goldman Sachs TMT is 54% — specifically because his deal experience section is empty and his technical finance coursework doesn't start until next fall. The system tells him exactly what's missing and whether applying anyway is worth it.
- **His personalized timeline:** diversity programs to apply to this week, sophomore summer programs that open in 30 days, junior summer apps that start hitting in 8 months, with specific recommendations for when to network and when to start technical prep.
- **Alumni he should message:** two Bryant grads at William Blair, one at Jefferies, plus a list of Bryant Finance Society members who interned at his top 10 firms last summer.
- **Interview prep queue:** for his top 5 firms, the system has already pulled the common technical questions from WSO and Glassdoor, mapped them to gaps in his resume, and built him a ten-question practice set to work through before his first-round.

He applies to three roles in the next hour, schedules two networking coffees for next week, and blocks out Saturday morning for his first DCF walkthrough practice session. The whole loop — from "I should probably start recruiting" to "I'm actively executing a plan" — took fifteen minutes.

Compare that to the Google Sheet approach, which takes three months and still leaves you guessing.

---

## How It Works — Technical Architecture

### The core insight

Resume matchers and job boards already exist. Teal, Jobscan, Simplify, Adventis, Trackr — all of them. What doesn't exist is a vertical-specific agent that understands *finance recruiting in particular*: the rhythm of sophomore versus junior summer programs, the prestige hierarchy of bulge bracket versus elite boutique versus middle-market, the unwritten GPA cutoffs, the club involvement that actually matters (SMIF, Finance Society, case competitions), and the specific technical skills that separate a viable candidate from a filtered-out one.

InternshipMatch is narrow on purpose. It serves one audience — undergraduate business students targeting finance roles — and goes deep on everything that audience needs instead of trying to cover every job on earth.

```
Your resume (PDF)
    +
Your target roles (IB, S&T, PE, quant, etc.)
    +
Live scraped firm list (~200 firms, daily updates)
    +
Finance-specific scoring model (GPA, coursework, clubs, prior experience, network)
    =
A ranked opportunity list, a personalized timeline, and a prep plan
```

### System overview

```
User (web + mobile)
        │
        ▼
Next.js 16 frontend (TypeScript, Tailwind, shadcn/ui)
        │ REST + SSE
        ▼
FastAPI backend (Python 3.12)
  ├── Resume Parser       → Claude Vision reads PDF, extracts structured profile
  ├── Firm Scraper        → nightly scrape of 200+ firm career pages
  ├── Fit Scorer          → deterministic scoring + Claude qualitative pass
  ├── Timeline Builder    → personalized recruiting calendar by class year + target roles
  ├── Alumni Finder       → LinkedIn + Bryant database cross-reference
  └── Prep Coach          → firm-specific interview questions from WSO/Glassdoor corpus
        │
        ▼
Anthropic Claude (claude-sonnet-4)
        │
        ▼
Supabase (Postgres + Auth + Storage)
  ├── users               → authenticated user accounts with student profile
  ├── resumes             → uploaded PDF + parsed profile JSON
  ├── firms               → 200+ finance firms with metadata
  ├── postings            → live job postings, refreshed nightly
  ├── applications        → which postings the user has applied to + status
  ├── alumni              → Bryant alumni at target firms
  └── prep_sessions       → interview prep history and performance
```

### The profile schema

```json
{
  "user_id": "uuid",
  "name": "Owen Ash",
  "school": "Bryant University",
  "graduation_year": 2029,
  "class_year_at_application": "sophomore",
  "major": "Finance",
  "gpa": 3.78,
  "target_roles": ["investment_banking_mm", "sales_and_trading"],
  "target_geographies": ["NYC", "Boston", "Providence"],
  "technical_skills": ["Excel", "financial modeling (3-statement)", "DCF valuation"],
  "coursework": ["FIN 201", "MATH 201", "BUS 100", "ECO 114"],
  "clubs": ["Bryant Finance Society", "SMIF applicant"],
  "prior_experience": [
    {
      "role": "Personal Finance Tutor",
      "org": "Bryant Math Center",
      "summary": "Tutored 6 students in personal finance",
      "dates": "2025-09 to present"
    }
  ],
  "certifications": ["FMC® Program"],
  "diversity_status": "not specified"
}
```

### The fit scoring model

Fit scores are computed by a deterministic Python model with a Claude-powered qualitative pass layered on top. The deterministic layer handles the stuff that's obvious — GPA cutoffs, class year eligibility, geographic fit — and produces a base score from 0 to 100. Claude then reviews the top candidates and adjusts for nuanced factors: whether the student's coursework sequence actually prepares them for the role, whether their prior experience maps to the specific desk or group, whether a reach application is worth the time given the timeline. The final score is displayed with a short written rationale, never just a number, so students understand *why* they scored where they did.

Why this split: a pure LLM scoring system would be slow, expensive, and inconsistent across runs. A pure keyword match would miss context (a 3.5 GPA is fine at a middle-market firm but a non-starter at Goldman TMT) and couldn't explain its reasoning. The hybrid is fast enough to score 200 firms in under five seconds and honest enough that students trust the output.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web app | Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Mobile app (Phase 2) | Expo React Native, Expo Router, NativeWind |
| Backend | FastAPI, Python 3.12, Pydantic v2 |
| AI | Anthropic Claude (claude-sonnet-4) |
| Database | Supabase (Postgres + Auth + Storage) |
| Scraping | Firecrawl MCP for curated firm career pages, Playwright for dynamic sites |
| Deployment | Vercel (frontend), Railway (backend), Supabase (data) |

---

## Repository Structure

```
internshipmatch/
├── README.md              Product overview (this file)
├── ARCHITECTURE.md        Full system design and data models
├── CLAUDE.md              Claude Code configuration
├── ROADMAP.md             Feature roadmap beyond the first five
│
├── docs/
│   ├── data-model.md      Canonical Pydantic schemas
│   ├── api.md             REST endpoint reference
│   └── adr/
│       ├── 0001-supabase-as-source-of-truth.md
│       ├── 0002-scrape-vs-api-integration.md
│       ├── 0003-hybrid-fit-scoring.md
│       ├── 0004-vertical-focus-over-breadth.md
│       └── 0005-honest-scoring-with-explanations.md
│
├── backend/
│   ├── app/
│   │   ├── main.py                  FastAPI routes
│   │   ├── models.py                Pydantic data models
│   │   ├── resume_parser.py         Claude Vision resume extraction
│   │   ├── fit_scorer.py            Deterministic + Claude hybrid scoring
│   │   ├── timeline_builder.py      Personalized recruiting calendar
│   │   ├── alumni_finder.py         LinkedIn + Bryant database lookup
│   │   ├── prep_coach.py            Interview prep generation
│   │   └── prompts.py               All Claude prompt strings
│   ├── scrapers/
│   │   ├── firm_registry.py         The master list of 200+ firms
│   │   ├── adventis_scraper.py      Adventis mirror
│   │   ├── career_page_scraper.py   Direct firm career page scraper
│   │   └── run_nightly.py           Orchestrates the full nightly refresh
│   └── requirements.txt
│
└── frontend/
    ├── app/
    │   ├── page.tsx                 Homepage + resume upload
    │   ├── dashboard/page.tsx       Ranked opportunity list
    │   ├── timeline/page.tsx        Personalized recruiting calendar
    │   ├── firm/[id]/page.tsx       Single firm deep dive
    │   ├── alumni/page.tsx          Alumni network map
    │   └── prep/page.tsx            Interview prep coach
    └── components/
        ├── ResumeUploader.tsx
        ├── OpportunityCard.tsx
        ├── FitScoreBreakdown.tsx
        ├── TimelineView.tsx
        ├── AlumniCard.tsx
        └── PrepSession.tsx
```

---

## The First Five Features (Build Order)

1. **Resume Upload + AI Parsing** — PDF in, structured profile out
2. **Curated Firm Database with Live Postings** — 200 firms, nightly refresh
3. **Hybrid Fit Scoring** — deterministic base + Claude qualitative pass with rationale
4. **Personalized Recruiting Timeline** — class-year-aware calendar with deadlines
5. **Application Tracker with Status Sync** — never lose a deadline again

Detailed specs live in `docs/adr/` — one ADR per feature covering the design decision and the trade-offs.

---

## The Two Unique Features

Beyond the five table-stakes features, InternshipMatch has two that genuinely don't exist anywhere else and that unlock real value for the user.

### Feature 6: Networking Radar

Every finance student is told "network your way in" and then left to figure out what that actually means. Networking Radar turns it into a structured workflow.

For every firm in your target list, InternshipMatch finds Bryant alumni currently working there by cross-referencing LinkedIn public profiles with Bryant's alumni directory (and for Phase 2, the Bryant Finance Society internal network). For each alum it finds, the app surfaces: their graduation year, their current role, their LinkedIn URL, and an AI-generated cold outreach message tailored to your shared background and their current work. You pick who to message, edit the draft, and send it.

Then the tracker follows up. If you haven't heard back in a week, it reminds you. If you get a response, it helps you schedule the coffee chat and prepare three smart questions based on the alum's current work. If the coffee chat goes well, it drafts your thank-you follow-up and adds the alum to your long-term relationship tracker.

This feature alone is worth the whole product for a Bryant student. Nobody teaches you how to run a networking campaign the right way. InternshipMatch does.

### Feature 7: Interview Prep Coach

Every finance interview is some combination of technicals (walk me through a DCF, how do the three statements connect, what's the current 10-year yield), behavioral (why IB, why this firm, tell me about a time you failed), and firm-specific fit questions (what deals have you been tracking, what do you think of our recent M&A activity). The prep material is out there — WSO has 10,000 interview reports, Glassdoor has firm-specific question logs, Mergers & Inquisitions has technical guides — but synthesizing it into a personal study plan is a separate job.

Interview Prep Coach does the synthesis for you. Once you have an interview scheduled with a firm, the coach pulls the relevant questions from its corpus (pre-ingested WSO and Glassdoor content, kept up to date), cross-references them with gaps in your resume and coursework, and builds you a prep plan specific to *this* interview at *this* firm. It then runs you through practice sessions: you record your answer, Claude evaluates it for structure, content, and confidence, and gives you specific feedback on how to improve. Technical questions get auto-graded for correctness. Behavioral answers get scored on the STAR framework. Firm-specific questions get evaluated against the firm's current deal flow and strategy.

By the time you walk into the real interview, you've practiced the exact questions you're likely to get asked, with feedback on every answer, specifically for this firm. Nothing else does this.

---

## Why This Wins

**Vertical focus.** Handshake is a marketplace. Jobscan is a resume checker. Adventis is a database. InternshipMatch is the only product that does all of it *for finance students specifically* and refuses to dilute itself by adding marketing internships or engineering roles.

**Honest scoring.** Every other fit-score tool inflates its numbers to make users feel good. InternshipMatch will tell you your Goldman TMT score is a 54 and exactly why. That honesty is the product.

**Built by someone who needs it.** I'm a Bryant Finance major recruiting for Summer 2028. I will use this tool myself starting next week. Every feature is tested against the question: "would this actually help me land a better internship?" — not "would this make a good demo?"

**Distribution is obvious.** Bryant has a Finance Society, a Student Managed Investment Fund, and roughly 400 Finance majors. I can ship InternshipMatch to 50 beta users by the end of this semester just by walking it into the SMIF meeting.

---

## Built By

Owen Ash, Finance major at Bryant University, class of 2029. Building InternshipMatch to solve a problem I'm about to face myself.

Building in public. Follow the repo for updates.
