# InternshipMatch: 5 Million-Dollar Features

> Strategic product expansion plan transforming InternshipMatch from a student recruiting tool into a multi-sided marketplace serving students, universities, and employers.

**Market opportunity:** $200M-$500M TAM across students ($100/yr x 500K finance undergrads), universities ($8K-$100K/yr x 550 AACSB schools), and employers ($5K-$50K/yr x 500 finance firms).

**Build timeline:** 22-25 weeks total, sequenced to maximize infrastructure reuse.

---

## Build Philosophy

**Every feature ships free and fully unlocked.** No paywalls, no Stripe integration, no tiered access during the build phase. The goal is to build all 5 features to production quality — the kind of quality you'd expect from LinkedIn, Bloomberg Terminal, or Handshake at their best — and then monetize later once the product is proven and the user base is established.

**Scale target: 100M+ users.** Every architectural decision, every database schema, every API endpoint must be designed to handle 100 million concurrent users, each receiving a personalized experience. This means:

- **Horizontal scalability** at every layer — stateless APIs, connection pooling, read replicas, CDN-served assets.
- **Precomputed personalization** — nightly batch jobs that compute benchmarks, recommendations, and question banks so the user-facing request path is fast reads, not expensive computations.
- **Pre-generated content** wherever possible — interview prep questions, assessment rubrics, simulation scenarios, and gap analyses should be pre-built per firm and per position so they're served instantly, not generated on-the-fly via expensive Claude API calls.
- **Efficient caching** — Redis/Postgres materialized views for hot data, aggressive TTLs, cache-aside patterns for user-specific data.
- **Event-driven architecture** — application status changes, new postings, benchmark updates all flow through an event bus so downstream systems (notifications, analytics, recommendations) stay decoupled and independently scalable.

**Quality bar: trillion-dollar software.** Every page, every interaction, every data point must feel like it was built by a 500-person engineering team. This means:

- Sub-200ms API response times for all user-facing endpoints.
- Accessibility (WCAG 2.1 AA) on every page.
- Real-time updates where users expect them (application status, new postings, benchmark changes).
- Graceful degradation — if Claude is slow or down, cached/pre-generated content fills the gap seamlessly.
- Zero-downtime deployments.
- Comprehensive error handling — users never see raw errors, always helpful recovery paths.

---

## Pre-Generated Question Bank Strategy

**Core principle:** Every firm in the database and every position type at that firm should have a pre-generated, curated question bank ready to serve instantly. This eliminates per-user Claude API calls for common content, reduces latency to near-zero, and ensures consistent quality across all users.

### How It Works

1. **Firm x Position Matrix:** For each of the 200 firms and each of the 6 position types (IB, S&T, PE, AM, ER, Quant), pre-generate a complete question bank. That's up to 1,200 unique question sets.

2. **Question Categories Per Bank:**
   - **Technical questions** (10-15 per bank): Firm-specific and role-specific. Goldman Sachs TMT IB gets different technical questions than Citadel Quant. Questions reference the firm's actual deal history, sector focus, and known interview style.
   - **Behavioral questions** (8-12 per bank): Tailored to firm culture. Goldman emphasizes leadership and teamwork. Evercore emphasizes deal intensity and analytical rigor. Jane Street emphasizes probability and quick thinking.
   - **Fit/motivation questions** (5-8 per bank): "Why [Firm X]?", "Why [Role Type]?", "Why this specific group?" with firm-specific context the student should reference in their answer.
   - **Brain teasers / market questions** (5-10 per bank): Firm-appropriate. Quant firms get probability puzzles. IB firms get "walk me through a DCF" variants. S&T firms get "pitch me a stock" scenarios.
   - **Model answers and rubrics**: Each question includes a model answer framework and a scoring rubric so Claude (or the pre-generated evaluation) can assess student responses consistently.

3. **Generation Pipeline:**
   - `backend/prep_corpus/generate_banks.py` — batch script that generates all question banks using Claude, stores them in the `question_banks` table.
   - Runs once during initial seed, then incrementally when new firms are added or existing banks need refreshing (quarterly).
   - Each bank is versioned. Students always get the latest version, but historical attempts reference the version they were tested on.

4. **Personalization Layer (On Top of Pre-Generated Content):**
   - The pre-generated bank is the base. When a student starts a prep session, the system selects questions from the bank based on:
     - Questions they haven't seen yet (no repeats until the bank is exhausted).
     - Questions targeting their weak areas (identified from previous assessment scores and prep session results).
     - Questions at the appropriate difficulty for their experience level (freshman vs junior).
   - This selection is a fast database query, not an AI call. The personalization is in the **selection**, not the **generation**.

5. **Database Schema:**

```sql
-- Pre-generated question banks (one per firm x position type)
CREATE TABLE question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) NOT NULL,
  role_type TEXT NOT NULL,              -- 'ib', 'st', 'pe', 'am', 'er', 'quant'
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(firm_id, role_type, version)
);

-- Individual questions within a bank
CREATE TABLE bank_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID REFERENCES question_banks(id) NOT NULL,
  category TEXT NOT NULL,               -- 'technical', 'behavioral', 'fit', 'brainteaser', 'market'
  difficulty TEXT NOT NULL,             -- 'foundational', 'intermediate', 'advanced'
  question_text TEXT NOT NULL,
  context TEXT,                         -- firm-specific context for the question
  model_answer TEXT NOT NULL,           -- framework/key points for a strong answer
  rubric JSONB NOT NULL,                -- {criteria: [{name, weight, description, scoring_guide}]}
  tags TEXT[] NOT NULL DEFAULT '{}',    -- ['dcf', 'valuation', 'merger'] for filtering
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track which questions a student has seen/answered
CREATE TABLE student_question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  question_id UUID REFERENCES bank_questions(id) NOT NULL,
  session_id UUID,                      -- links to prep_sessions
  response_text TEXT,
  score FLOAT,                          -- 0-100, from rubric evaluation
  feedback TEXT,                        -- pre-generated or Claude-evaluated feedback
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id, session_id)
);

-- Indexes for fast personalized selection
CREATE INDEX idx_bank_questions_bank_category ON bank_questions(bank_id, category, difficulty);
CREATE INDEX idx_student_question_history_user ON student_question_history(user_id, question_id);
```

6. **API Endpoints:**

```
GET    /api/prep/banks/{firm_id}/{role_type}         -- Get question bank metadata
GET    /api/prep/banks/{firm_id}/{role_type}/next     -- Get next personalized question (fast DB query)
POST   /api/prep/banks/{firm_id}/{role_type}/answer   -- Submit answer for evaluation
GET    /api/prep/banks/{firm_id}/{role_type}/progress  -- Student's progress through this bank
GET    /api/prep/weak-areas                            -- Aggregated weak areas across all banks
```

7. **Scale Impact:**
   - With 200 firms x 6 role types x ~35 questions per bank = ~42,000 pre-generated questions.
   - Serving a question is a single indexed DB read (~2ms). No Claude API call needed.
   - Evaluation can use the pre-generated rubric for instant scoring on structured answers, falling back to Claude only for free-text behavioral responses.
   - At 100M users, even if 1% are active simultaneously, that's 1M concurrent users. Pre-generated content means the system can serve all of them from Postgres read replicas without touching the Claude API.

---

## Table of Contents

1. [Feature 1: Peer Benchmarking & Career Intelligence](#feature-1-peer-benchmarking--career-intelligence)
2. [Feature 2: Employer Talent Pipeline Portal](#feature-2-employer-talent-pipeline-portal)
3. [Feature 3: Finance Skills Assessments](#feature-3-finance-skills-assessments)
4. [Feature 4: University Career Services Dashboard](#feature-4-university-career-services-dashboard)
5. [Feature 5: Virtual Deal Simulations](#feature-5-virtual-deal-simulations)
6. [Build Order & Sequencing](#build-order--sequencing)
7. [Future Monetization Plan](#future-monetization-plan)

---

## Feature 1: Peer Benchmarking & Career Intelligence

**Build first.** Establishes anonymized data aggregation, the nightly compute pipeline, and the personalization infrastructure that every subsequent feature depends on.

### What It Does

Gives students anonymized competitive intelligence about where they stand relative to peers targeting the same firms and roles. No names, no profiles — just aggregated percentile data that answers the question every finance student obsesses over: "Am I competitive enough?"

- **Percentile rankings:** GPA, relevant coursework count, internship experience, extracurricular leadership — all benchmarked against students targeting the same firm tier (bulge bracket, elite boutique, middle market, buy-side).
- **Application volume indicators:** "High," "Moderate," or "Low" competition signals per firm based on how many InternshipMatch users are targeting each firm. Not exact counts — directional signals only.
- **"Students like you" success paths:** Anonymized case studies of students with similar profiles who successfully placed at target firms. Shows what coursework they took, what timeline they followed, what their fit scores looked like.
- **Gap analysis:** "Students who placed at Goldman Sachs TMT had an average of 2.3 relevant internships — you have 1. Here's how to close that gap."
- **Weekly competitive pulse:** Email digest showing how the user's profile has changed relative to peers over the past week.

### Why It's Worth $1M+

Competitive intelligence is scarce — Wall Street Oasis forums are noisy and anecdotal, career services offices don't have cross-school data, and students have no way to objectively assess where they stand.

The psychology is powerful: students checking their percentile ranking will check it weekly. That's engagement that drives retention, and retention is what makes the platform indispensable before monetization even begins.

**Future revenue target:** 5,500+ subscribers at $15/mo = $990K ARR once monetization is enabled.

### Real Value Provided

- Students stop guessing and start making data-driven decisions about where to apply.
- Reduced application waste — students who see they're in the 20th percentile for Goldman stop wasting time on long-shot apps and focus on firms where they're competitive.
- Career services offices (Feature 4) get better outcomes because students self-select into realistic targets.

### Technical Implementation

#### New Database Tables

```sql
-- Aggregated benchmark data (refreshed nightly, no PII)
CREATE TABLE benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_tier TEXT NOT NULL,          -- 'bulge_bracket', 'elite_boutique', 'middle_market', 'buy_side', 'quant'
  role_type TEXT NOT NULL,          -- 'ib', 'st', 'pe', 'am', 'er', 'quant'
  class_year INT NOT NULL,
  metric TEXT NOT NULL,             -- 'gpa', 'relevant_courses', 'internship_count', 'leadership_score'
  p25 FLOAT NOT NULL,
  p50 FLOAT NOT NULL,
  p75 FLOAT NOT NULL,
  p90 FLOAT NOT NULL,
  sample_size INT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Application volume signals (refreshed nightly)
CREATE TABLE application_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id),
  role_type TEXT NOT NULL,
  signal TEXT NOT NULL,             -- 'high', 'moderate', 'low'
  applicant_count_bucket TEXT,      -- '50+', '20-50', '<20' (bucketed, never exact)
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Anonymized success paths
CREATE TABLE success_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_tier TEXT NOT NULL,
  role_type TEXT NOT NULL,
  profile_snapshot JSONB NOT NULL,  -- anonymized: {gpa_range, course_count, internship_count, class_year}
  timeline_snapshot JSONB NOT NULL, -- what they did and when
  outcome TEXT NOT NULL,            -- 'placed', 'advanced_to_final', 'superday_invite'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS: `benchmarks`, `application_signals`, and `success_paths` are read-only for all authenticated users. No paywall — every user gets full access.

#### New API Endpoints

```
GET    /api/benchmarks/{firm_tier}/{role_type}  -- Percentile data for a tier/role combo
GET    /api/benchmarks/me                       -- User's percentile across all target firms
GET    /api/signals/{firm_id}                   -- Application volume signal for a firm
GET    /api/success-paths/{firm_tier}/{role_type}  -- Anonymized success stories
GET    /api/gap-analysis/me                     -- Personalized gap analysis vs target firms
```

#### New Frontend Pages

- `/benchmarks` — Main benchmarking dashboard. Percentile charts per firm tier, gap analysis cards, application signal badges on each firm.
- `/benchmarks/[firm_tier]` — Deep dive into a specific tier with success paths and detailed distributions.

#### Reused Code

- `fit_scorer.py` — The existing scoring weights directly inform which metrics to benchmark. Percentile calculations reuse the same GPA/coursework/experience extraction logic.
- `models.py` — `StudentProfile` model provides all the fields being benchmarked.
- `lib/store.ts` — Zustand store extended with benchmark state.
- `lib/api.ts` — API client extended with benchmark endpoints.

#### Nightly Aggregation Job

A new `compute_benchmarks.py` script runs as a Railway cron job (same infrastructure as the scraper). It:

1. Queries all `student_profiles` and their `fit_scores`.
2. Groups by firm tier, role type, and class year.
3. Computes percentiles (p25, p50, p75, p90) for each metric.
4. Upserts into the `benchmarks` table.
5. Computes application volume signals from the `applications` table.
6. Generates anonymized success paths from users who reported successful placements.

Minimum sample size of 10 before publishing any benchmark. Below that threshold, show "Not enough data yet" to prevent de-anonymization.

#### Scale Considerations

- Benchmarks are precomputed nightly — serving them is a fast indexed read, not a real-time computation.
- At 100M users, the nightly aggregation job processes in partitioned batches (by firm tier, then role type) to avoid long-running transactions.
- Application signals use bucketed counts, never exact — this is both a privacy measure and a performance optimization (no need for exact COUNT queries on massive tables).
- Success paths are capped at 100 per firm_tier/role_type combo, rotated quarterly to keep content fresh.

### Competitive Advantage

No existing tool provides cross-school anonymized benchmarking for finance recruiting. Wall Street Oasis has anecdotal forum posts. Handshake has general career data but nothing finance-specific. This is genuinely novel data that becomes more valuable as the user base grows — a network effect that compounds over time.

### Build Complexity

**3-4 weeks.** The data aggregation is straightforward (SQL percentile functions). The frontend is charts and cards — no novel UI patterns. The hardest part is ensuring anonymization holds up — no benchmark should be publishable with fewer than 10 data points.

---

## Feature 2: Employer Talent Pipeline Portal

**Build second.** Opens the employer side of the marketplace and creates employer accounts/auth infrastructure that Features 3-5 depend on.

### What It Does

A self-service dashboard where banks and financial firms search, filter, and shortlist candidates from InternshipMatch's resume database. Think LinkedIn Recruiter, but built specifically for finance recruiting.

- **Candidate search and filtering:** Filter by GPA, class year, target role, coursework, skills, school, fit score. Full-text search across parsed resumes.
- **Anonymized profiles:** Employers see skills, experience, GPA range, coursework, and fit scores — but not names, emails, or schools until they unlock a profile. This protects students and creates a future monetizable unlock mechanic. During build phase, all unlocks are free and unlimited.
- **Reverse fit scoring:** The existing fit scoring engine runs in reverse — given a specific role at a specific firm, score all candidates and rank them. Employers see a ranked list of students most likely to be a good fit for their open roles.
- **Direct job posting:** Employers post roles directly into InternshipMatch's `postings` table, bypassing the scraper entirely. These "verified" postings get a badge on the student dashboard.
- **Pipeline analytics:** Track how many students viewed their postings, how many applied, conversion rates, time-to-fill.
- **Candidate engagement:** Send anonymized "interest signals" to candidates before unlocking. "A bulge bracket firm is interested in your profile" drives student engagement.

### Why It's Worth $1M+

Employers spend $5K-$50K per hire on campus recruiting (career fairs, info sessions, recruiter travel). A self-service portal that lets them find qualified candidates without leaving their desk is a clear cost reduction. InternshipMatch's fit scoring gives employers signal that resumes alone don't — a ranked, scored candidate list is genuinely valuable.

The key insight: employers don't need another ATS. They need a **sourcing channel** specifically for finance talent. That's a much simpler, more focused product than trying to compete with Greenhouse or Workday.

**Future revenue target:** 100 employer accounts at blended $6K/yr = $600K ARR once monetization is enabled.

### Real Value Provided

- Employers access a pre-qualified, finance-focused candidate pool instead of sifting through general job board applicants.
- Reverse fit scoring saves recruiters hours of manual resume screening.
- Students get discovered by firms they might not have considered, expanding their opportunity set.
- Verified postings improve data quality for all students on the platform.

### Technical Implementation

#### New Database Tables

```sql
-- Employer accounts (separate from student auth)
CREATE TABLE employer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id),
  company_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'full_access',   -- all features unlocked during build phase
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employer team members
CREATE TABLE employer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_account_id UUID REFERENCES employer_accounts(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',  -- 'admin', 'member', 'viewer'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profile unlock log (tracking for analytics, no usage limits during build phase)
CREATE TABLE profile_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_account_id UUID REFERENCES employer_accounts(id) NOT NULL,
  student_profile_id UUID REFERENCES student_profiles(id) NOT NULL,
  unlocked_by UUID REFERENCES employer_users(id) NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employer_account_id, student_profile_id)
);

-- Employer-posted jobs (verified postings)
CREATE TABLE employer_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_account_id UUID REFERENCES employer_accounts(id) NOT NULL,
  firm_id UUID REFERENCES firms(id),
  title TEXT NOT NULL,
  role_type TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements JSONB,
  location TEXT,
  deadline TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  views INT NOT NULL DEFAULT 0,
  applications INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Candidate shortlists
CREATE TABLE shortlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_account_id UUID REFERENCES employer_accounts(id) NOT NULL,
  name TEXT NOT NULL,
  created_by UUID REFERENCES employer_users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shortlist_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortlist_id UUID REFERENCES shortlists(id) NOT NULL,
  student_profile_id UUID REFERENCES student_profiles(id) NOT NULL,
  notes TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shortlist_id, student_profile_id)
);

-- Interest signals (anonymized employer-to-student)
CREATE TABLE interest_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_account_id UUID REFERENCES employer_accounts(id) NOT NULL,
  student_profile_id UUID REFERENCES student_profiles(id) NOT NULL,
  signal_type TEXT NOT NULL DEFAULT 'interested', -- 'interested', 'highly_interested'
  message TEXT,                                    -- optional anonymized message
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  UNIQUE(employer_account_id, student_profile_id)
);
```

RLS: Employer tables restricted to users with matching `employer_account_id`. Students can read their own `interest_signals` but not see which employer sent them (anonymized until mutual interest).

#### New API Endpoints

```
-- Employer auth
POST   /api/employer/register          -- Create employer account
POST   /api/employer/invite            -- Invite team member
GET    /api/employer/account            -- Account details and usage

-- Candidate search
GET    /api/employer/candidates         -- Search/filter candidates (anonymized)
GET    /api/employer/candidates/{id}    -- Anonymized candidate detail
POST   /api/employer/candidates/{id}/unlock  -- Unlock full profile (free during build phase)

-- Reverse fit scoring
POST   /api/employer/reverse-score      -- Score all candidates against a role spec
GET    /api/employer/reverse-score/{posting_id}  -- Get ranked candidates for a posting

-- Job posting
POST   /api/employer/postings           -- Create verified posting
PUT    /api/employer/postings/{id}      -- Update posting
DELETE /api/employer/postings/{id}      -- Deactivate posting
GET    /api/employer/postings           -- List employer's postings with analytics

-- Shortlists
POST   /api/employer/shortlists         -- Create shortlist
POST   /api/employer/shortlists/{id}/add     -- Add candidate
DELETE /api/employer/shortlists/{id}/{candidate_id}  -- Remove candidate
GET    /api/employer/shortlists         -- List shortlists

-- Interest signals
POST   /api/employer/signals/{candidate_id}  -- Send interest signal
GET    /api/signals/me                  -- Student: view signals received

-- Analytics
GET    /api/employer/analytics          -- Posting views, applications, conversions
```

#### New Frontend Pages

- `/employer` — Employer landing page with registration CTA.
- `/employer/dashboard` — Main employer dashboard: posting analytics, recent unlocks, shortlist summary.
- `/employer/search` — Candidate search with filters (GPA, class year, role type, skills, coursework).
- `/employer/candidates/[id]` — Candidate detail (anonymized or full depending on unlock status).
- `/employer/postings` — Manage job postings.
- `/employer/postings/new` — Create new verified posting.
- `/employer/shortlists` — Manage candidate shortlists.
- `/employer/analytics` — Detailed analytics: funnel visualization, time-to-fill, applicant demographics.
- `/employer/settings` — Account and team management.

#### Reused Code

- `fit_scorer.py` — Reverse fit scoring reuses the same six-factor model but inverts the query: instead of "how well does this student fit this firm," it's "how well does this firm's role fit this student." Same weights, same logic, different direction.
- `models.py` — `StudentProfile`, `Firm`, `Posting` models used directly.
- `claude_client.py` — Qualitative scoring pass reused for reverse scoring top candidates.

#### Consent Model

Students must opt in to be discoverable by employers. A toggle in account settings: "Allow employers to find my anonymized profile." Default: off. When opted in, their anonymized profile appears in employer searches. When an employer unlocks their profile, the student receives a notification.

#### Scale Considerations

- Candidate search uses Postgres full-text search with GIN indexes. At 100M profiles, consider adding Elasticsearch/Typesense as a dedicated search layer.
- Reverse fit scoring is batch-computed when a posting is created, results cached in a `reverse_scores` materialized view. Not computed per-request.
- Shortlists are lightweight junction tables — no performance concern at any scale.
- Interest signals use a notification queue (Redis pub/sub or Postgres LISTEN/NOTIFY) so students see signals in real-time.

### Competitive Advantage

Handshake is the closest competitor but it's horizontal (all industries) and employer-unfriendly (expensive, clunky UI, no fit scoring). LinkedIn Recruiter is $10K+/yr and not built for campus recruiting. InternshipMatch's vertical focus means employers get a curated, scored candidate pool — not a firehose of irrelevant applicants.

### Build Complexity

**4-5 weeks.** The employer auth system is the most complex new infrastructure. Reverse fit scoring is a straightforward inversion of existing logic. The search/filter UI is standard.

---

## Feature 3: Finance Skills Assessments

**Build third.** Extends the existing prep coach infrastructure, bridges the student and employer sides of the marketplace with verifiable credentials.

### What It Does

Standardized, AI-evaluated assessments that test real finance knowledge — not multiple choice trivia, but applied skills that mirror actual analyst work. Students earn verified credentials they display on their InternshipMatch profiles. Employers filter candidates by assessment scores. **All assessments are free and unlimited during build phase.**

#### Assessment Categories

1. **Accounting Fundamentals** — Three-statement modeling, journal entries, revenue recognition, working capital analysis. 45 minutes.
2. **Valuation** — DCF construction, comparable company analysis, precedent transactions. Build a mini-model from provided data. 60 minutes.
3. **LBO Modeling** — Sources and uses, debt schedules, returns analysis. Given a case prompt, build the model. 60 minutes.
4. **M&A Analysis** — Accretion/dilution, synergy estimation, deal structure evaluation. Case-based. 60 minutes.
5. **Behavioral & Fit** — "Walk me through your resume," "Why banking?", "Tell me about a time you led a team." Claude evaluates structure, specificity, and persuasiveness. 30 minutes.

#### How It Works

1. Student selects an assessment from the catalog.
2. A timed assessment environment opens with a case prompt, data tables, and input fields.
3. For quantitative assessments: student builds models in a structured spreadsheet-like interface (not free-form Excel — structured input fields that mirror a model's layout).
4. For behavioral: student records text or audio responses.
5. Claude evaluates each response against a **pre-generated rubric** (from the question bank): correctness, methodology, attention to detail, speed.
6. Student receives a score (0-100), detailed feedback per section, and a credential badge if they score above threshold (70+).
7. Credential appears on their InternshipMatch profile. Employers can filter by credential.

#### Pre-Generated Assessment Content

Each assessment draws from the pre-generated question bank system. For each of the 5 categories:

- **10+ case variants per category** — pre-generated with complete financial data, rubrics, and model answers. Prevents answer sharing and allows retakes with fresh content.
- **Firm-specific variants** — When a student is prepping for Goldman Sachs IB, the valuation assessment uses a TMT-sector case study. William Blair gets a middle-market industrials case. The content feels personalized because it's drawn from a deep, pre-built library.
- **Difficulty tiers** — Foundational (freshman/sophomore), Intermediate (junior), Advanced (senior/experienced). The system auto-selects based on the student's profile.

### Why It's Worth $1M+

Technical skills are the biggest anxiety for finance recruits, and there's no standardized way to prove you have them. A finance GPA doesn't distinguish between schools with different grading scales. The CFA is for professionals, not undergrads. InternshipMatch assessments fill the gap — a portable, standardized credential that means the same thing regardless of what school you attend.

For employers, assessment scores are a filter that saves interview time. Instead of running a modeling test in the superday, they can pre-screen candidates who already have a verified 85+ on the LBO assessment.

**Future revenue target:** 8,000+ assessment purchases at blended $61/purchase = $490K ARR, plus employer sponsorships pushing to $1.2M ARR.

### Real Value Provided

- Students get objective, actionable feedback on their technical skills with specific areas to improve.
- Credentials are portable proof of competence that supplement a resume.
- Employers get a pre-screening signal that reduces interview waste.
- Employer-sponsored assessments (future) let employers build a pipeline of technically vetted candidates.

### Technical Implementation

#### New Database Tables

```sql
-- Assessment definitions
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,           -- 'accounting', 'valuation', 'lbo', 'ma', 'behavioral'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  time_limit_minutes INT NOT NULL,
  rubric JSONB NOT NULL,            -- scoring rubric for Claude evaluation
  case_prompt TEXT NOT NULL,
  data_tables JSONB,                -- structured data provided to student
  input_schema JSONB NOT NULL,      -- defines the structured input fields
  difficulty TEXT NOT NULL DEFAULT 'intermediate',  -- 'foundational', 'intermediate', 'advanced'
  firm_id UUID REFERENCES firms(id),  -- NULL = generic, non-NULL = firm-specific variant
  role_type TEXT,                    -- NULL = general, non-NULL = role-specific
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INT NOT NULL DEFAULT 1
);

-- Student assessment attempts
CREATE TABLE assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  assessment_id UUID REFERENCES assessments(id) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INT,
  responses JSONB NOT NULL DEFAULT '{}',  -- student's structured responses
  status TEXT NOT NULL DEFAULT 'in_progress',  -- 'in_progress', 'submitted', 'evaluated', 'expired'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Evaluation results
CREATE TABLE assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES assessment_attempts(id) NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  assessment_id UUID REFERENCES assessments(id) NOT NULL,
  overall_score FLOAT NOT NULL,     -- 0-100
  section_scores JSONB NOT NULL,    -- {section_name: {score, max, feedback}}
  strengths TEXT[] NOT NULL DEFAULT '{}',
  improvement_areas TEXT[] NOT NULL DEFAULT '{}',
  credential_earned BOOLEAN NOT NULL DEFAULT false,  -- true if score >= threshold
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  evaluation_model TEXT NOT NULL,   -- Claude model used for evaluation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Verified credentials
CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  assessment_id UUID REFERENCES assessments(id) NOT NULL,
  result_id UUID REFERENCES assessment_results(id) NOT NULL,
  score FLOAT NOT NULL,
  category TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,           -- credentials valid for 1 year
  is_displayed BOOLEAN NOT NULL DEFAULT true,  -- student can hide from profile
  UNIQUE(user_id, assessment_id)    -- one credential per assessment (best score)
);

-- Employer-sponsored assessment campaigns (future monetization, schema ready)
CREATE TABLE assessment_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_account_id UUID REFERENCES employer_accounts(id) NOT NULL,
  assessment_id UUID REFERENCES assessments(id) NOT NULL,
  campaign_name TEXT NOT NULL,
  branding JSONB,                   -- logo URL, custom intro text, colors
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
```

RLS: Students can read/write their own attempts and results. Credentials are read-only to all authenticated users (they're public proof). Employers can read scores for students who took their sponsored assessments.

#### New API Endpoints

```
-- Assessment catalog
GET    /api/assessments                 -- List available assessments
GET    /api/assessments/{id}            -- Assessment details (without answers)
GET    /api/assessments/for-firm/{firm_id}/{role_type}  -- Firm-specific assessment variants

-- Taking assessments
POST   /api/assessments/{id}/start      -- Start a timed attempt
PUT    /api/assessments/{id}/respond    -- Save responses (auto-saves during attempt)
POST   /api/assessments/{id}/submit     -- Submit for evaluation

-- Results and credentials
GET    /api/assessments/results         -- All user's results
GET    /api/assessments/results/{id}    -- Detailed result with feedback
GET    /api/credentials/me              -- User's earned credentials
GET    /api/credentials/{user_id}       -- Public credentials for a profile (employer view)

-- Employer campaigns (future, schema ready)
POST   /api/employer/campaigns          -- Create sponsored assessment campaign
GET    /api/employer/campaigns          -- List campaigns with usage stats
GET    /api/employer/campaigns/{id}/results  -- Candidate scores for a campaign
```

#### New Frontend Pages

- `/assessments` — Assessment catalog with categories, descriptions, difficulty levels.
- `/assessments/[id]` — Assessment detail: what's tested, time limit, sample questions, "Start Assessment" CTA.
- `/assessments/[id]/take` — Timed assessment environment with structured input fields, countdown timer, auto-save.
- `/assessments/results` — Results dashboard: scores, credentials earned, improvement areas.
- `/assessments/results/[id]` — Detailed result breakdown with Claude's feedback per section.
- `/profile/credentials` — Manage which credentials are displayed on profile.

#### Reused Code

- `prep_coach.py` — The existing prep session evaluation logic is the foundation for behavioral assessment evaluation. Same Claude prompts, same STAR framework rubric, extended with scoring.
- `claude_client.py` — All evaluation calls go through the existing client with assessment-specific prompts.
- `prep_corpus/` and `question_banks` — Pre-generated question banks inform assessment content. Assessment case variants are stored alongside prep questions in the same infrastructure.

#### Assessment Integrity

- Timed environment: once started, the clock runs. Browser tab visibility API detects tab switches (warning, not instant fail).
- Each assessment has 3-5 variant question sets (pre-generated) to prevent answer sharing.
- Claude evaluation includes a plagiarism/copy-paste detection pass.
- Credentials include the date earned and score — employers can see how recent they are.

#### Scale Considerations

- Assessment content is pre-generated and cached. Starting an assessment is a DB read, not a generation call.
- Evaluation is the only Claude API touchpoint. For structured/quantitative assessments, the pre-generated rubric enables deterministic scoring without Claude (rubric-based scoring engine). Claude is only needed for free-text behavioral evaluation.
- At 100M users, evaluation jobs are queued (Redis/SQS) and processed by a pool of workers, with results pushed via WebSocket when ready. Students see "Evaluating your responses..." with a progress indicator, not a blocking spinner.

### Competitive Advantage

The CFA Institute's Investment Foundations Certificate is the closest analog but it's $400, takes months, and isn't designed for undergrads. Wall Street Prep and BIWS sell courses but don't certify. InternshipMatch assessments are faster (45-60 min), free (during build phase), and directly connected to the recruiting pipeline — a credential that both proves skill and gets you discovered by employers.

### Build Complexity

**5-6 weeks.** The hardest part is designing high-quality assessment content and rubrics for each category (accelerated by pre-generated question bank pipeline). The timed assessment UI requires careful state management (auto-save, countdown, structured inputs). Claude evaluation prompt engineering needs extensive testing against known-good and known-bad responses to calibrate scoring.

---

## Feature 4: University Career Services Dashboard

**Build fourth.** Requires data from Features 1-3 (student benchmarks, employer engagement, assessment scores) to deliver compelling analytics.

### What It Does

A dedicated admin dashboard for university career services offices that shows aggregate student recruiting outcomes, employer engagement metrics, early warnings for at-risk students, and tools for counselors to manage their caseload — all consent-gated and FERPA-compliant. **Full access for all universities during build phase.**

#### Core Capabilities

1. **Recruiting Outcomes Dashboard:** Aggregate view of where students are applying, interview rates, placement rates, by firm tier and role type. Year-over-year trends.
2. **Employer Engagement Metrics:** Which employers are actively recruiting from this school (based on profile unlocks, interest signals, and verified postings). Which firms are new this year vs returning.
3. **Student Progress Tracker:** Anonymized cohort view showing how many students have completed onboarding, uploaded resumes, earned credentials, submitted applications. Identifies students falling behind the typical timeline.
4. **At-Risk Early Warning:** Flag students who are targeting firms well above their current profile (fit scores below 30), missing key deadlines, or inactive for 30+ days during peak recruiting season.
5. **Counselor View:** With student consent, a counselor can see an individual student's dashboard — fit scores, applications, prep progress, benchmarks — and add notes/action items.
6. **Alumni Data Management:** Upload and manage alumni records. Cross-reference with students' networking activity.
7. **Reporting:** Exportable reports for department reviews, accreditation, and employer relations meetings.

### Why It's Worth $1M+

Career services offices are under pressure to prove outcomes — "X% of finance majors placed within 6 months of graduation" is a metric that drives enrollment, rankings, and funding. Right now they track this manually via surveys with 30-40% response rates. InternshipMatch gives them real-time, comprehensive data that's orders of magnitude better than what they have today.

The institutional buyer motion is powerful: one contract covers hundreds or thousands of students, and renewal rates for SaaS tools that become part of university workflow are 90%+.

**Future revenue target:** 40 university contracts at blended $12.5K/yr = $500K ARR, scaling to 120 contracts = $1.5M ARR.

### Real Value Provided

- Career services offices get data they've never had: real-time recruiting activity, not post-hoc surveys.
- At-risk early warnings let counselors intervene before it's too late — a student who hasn't started applications by October of junior year needs outreach now, not in January.
- Employer engagement data helps career services prioritize which firms to invite to campus events.
- Accreditation reporting becomes automated instead of manual.
- Students at partner universities benefit from coordinated career services support.

### Technical Implementation

#### New Database Tables

```sql
-- University accounts
CREATE TABLE university_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,               -- 'Bryant University School of Business'
  domain TEXT NOT NULL,             -- 'bryant.edu' (for email verification)
  tier TEXT NOT NULL DEFAULT 'full_access',  -- all features unlocked during build phase
  max_students INT NOT NULL DEFAULT 999999,  -- no limits during build phase
  max_admins INT NOT NULL DEFAULT 999,
  contract_start TIMESTAMPTZ,
  contract_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- University admin users
CREATE TABLE university_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_account_id UUID REFERENCES university_accounts(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT NOT NULL DEFAULT 'counselor',  -- 'admin', 'counselor', 'viewer'
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student-university association
CREATE TABLE university_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_account_id UUID REFERENCES university_accounts(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  student_profile_id UUID REFERENCES student_profiles(id),
  counselor_consent BOOLEAN NOT NULL DEFAULT false,  -- student must opt in
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(university_account_id, user_id)
);

-- Counselor notes (consent-gated)
CREATE TABLE counselor_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_account_id UUID REFERENCES university_accounts(id) NOT NULL,
  student_user_id UUID REFERENCES auth.users(id) NOT NULL,
  counselor_id UUID REFERENCES university_admins(id) NOT NULL,
  note TEXT NOT NULL,
  action_items JSONB,               -- [{task, due_date, completed}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Precomputed university analytics (refreshed nightly)
CREATE TABLE university_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_account_id UUID REFERENCES university_accounts(id) NOT NULL,
  period TEXT NOT NULL,             -- '2026-Q1', '2026-03', '2025-2026'
  metric_type TEXT NOT NULL,        -- 'placement_rate', 'application_count', 'avg_fit_score', etc.
  dimensions JSONB,                 -- {firm_tier, role_type, class_year} for slicing
  value FLOAT NOT NULL,
  sample_size INT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS: University admins can read aggregate analytics for their university. Counselor views of individual students require `counselor_consent = true`. Students control their consent toggle. No cross-university data access.

#### New API Endpoints

```
-- University admin
POST   /api/university/register         -- Create university account
GET    /api/university/account           -- Account details
POST   /api/university/admins/invite     -- Invite counselor/admin

-- Analytics
GET    /api/university/analytics/overview     -- High-level recruiting metrics
GET    /api/university/analytics/employers    -- Employer engagement data
GET    /api/university/analytics/cohort       -- Cohort progress tracker
GET    /api/university/analytics/at-risk      -- At-risk student list
GET    /api/university/analytics/trends       -- Year-over-year comparisons
POST   /api/university/analytics/export       -- Generate downloadable report

-- Counselor
GET    /api/university/students               -- List students (aggregate or consented individual)
GET    /api/university/students/{id}          -- Individual student dashboard (consent-gated)
POST   /api/university/students/{id}/notes    -- Add counselor note
PUT    /api/university/students/{id}/notes/{note_id}  -- Update note

-- Student consent
PUT    /api/university/consent                -- Student toggles counselor access

-- Alumni management
POST   /api/university/alumni                 -- Upload alumni records
GET    /api/university/alumni                 -- List alumni with networking activity
PUT    /api/university/alumni/{id}            -- Update alumni record
```

#### New Frontend Pages

- `/university` — Landing page for career services: value prop, case studies, "Get Started" CTA.
- `/university/dashboard` — Main analytics dashboard: KPI cards (placement rate, active students, employer engagement), trend charts, quick links.
- `/university/employers` — Employer engagement: which firms are active, profile unlock volume, posting activity.
- `/university/cohort` — Cohort progress: funnel visualization (onboarded -> resume uploaded -> applications submitted -> interviews -> placed).
- `/university/at-risk` — At-risk student list with risk factors and recommended actions.
- `/university/students` — Student directory (anonymized by default, full detail for consented students).
- `/university/students/[id]` — Individual student view (mirrors the student's own dashboard, with counselor notes).
- `/university/alumni` — Alumni management: upload CSV, view networking activity, match with current students.
- `/university/reports` — Generate and download reports.
- `/university/settings` — Account and admin management.

#### Reused Code

- `benchmarks` table from Feature 1 — university analytics are a filtered view of the same data, scoped to students at that university.
- `application_signals` from Feature 1 — employer engagement metrics derived from the same data.
- `employer_accounts` and `profile_unlocks` from Feature 2 — employer engagement per university computed from existing tables.
- `credentials` from Feature 3 — student progress tracked by credential completion.
- `alumni` table from the core product — university alumni management extends existing alumni data.
- All existing fit scoring and student profile infrastructure.

#### FERPA Compliance

- All individual student data requires explicit opt-in consent (`counselor_consent` flag).
- Aggregate analytics never show groups smaller than 5 students.
- University admins can only see students who registered with an email matching the university's domain.
- Counselor notes are visible only to admins/counselors at that university, never to students.
- Data export includes only consented and aggregated data.
- Audit log tracks every counselor access to individual student data.

#### Scale Considerations

- University analytics are precomputed nightly (same cron infrastructure as benchmarks). Dashboard loads are fast reads.
- At-risk detection is a batch job that runs nightly, not real-time. Results cached in the `university_analytics` table with `metric_type = 'at_risk'`.
- At 550+ universities with 100M+ students, the nightly compute partitions by university to parallelize.
- Report generation is async — user requests a report, job queue processes it, user gets notified when the PDF is ready for download.

### Competitive Advantage

Handshake offers university analytics but they're horizontal (all industries) and expensive ($50K+ for enterprise). 12Twenty is finance-focused but dated and not AI-powered. InternshipMatch is the only platform that combines AI-driven fit scoring, verified skills credentials, and employer engagement data — all in a finance-vertical package.

### Build Complexity

**4 weeks.** Most of the data already exists from Features 1-3. The university dashboard is primarily a new set of views and aggregation queries on existing tables. The consent model and FERPA compliance are the most sensitive parts. SSO (SAML/OIDC) infrastructure adds ~1 week.

---

## Feature 5: Virtual Deal Simulations

**Build last.** Most complex feature, requires employer relationships from Feature 2 and assessment infrastructure from Feature 3. The capstone of the platform.

### What It Does

Firm-branded, interactive work simulations that replicate the actual work of an investment banking analyst, equity researcher, or trader. Not a quiz — a 30-60 minute immersive experience where students analyze real-ish deals, build models, write memos, and make recommendations. Claude evaluates the quality of their financial analysis, not just correctness. **All simulations are free and unlimited during build phase.**

#### Simulation Types

1. **M&A Advisory Simulation (60 min):** Student is an analyst at [Firm X]. A client is considering acquiring a target. Student receives public filings, market data, and strategic context. Tasks: build a quick valuation, assess strategic rationale, identify key risks, draft an executive summary for the MD. Claude evaluates financial reasoning, not just math.

2. **Equity Research Simulation (45 min):** Student is a research associate covering [Sector Y]. A company just reported earnings. Tasks: analyze the quarter vs estimates, update the model, revise the price target, write a one-page investment thesis. Claude evaluates analytical depth and writing quality.

3. **LBO Case Simulation (60 min):** Student is at a PE fund evaluating a buyout target. Tasks: build an LBO model from provided data, determine maximum entry price, structure the financing, present the investment thesis. Claude evaluates deal structuring and return analysis.

4. **Trading Desk Simulation (30 min):** Student is a junior trader managing a position. Market events occur in real-time (simulated). Tasks: interpret news, decide whether to buy/sell/hold, manage risk limits, explain decisions. Claude evaluates decision-making under pressure and risk awareness.

5. **Custom Firm-Branded Simulations:** Employers design their own simulations (with InternshipMatch's help) that reflect their actual deal flow, sector focus, and evaluation criteria. A Goldman TMT simulation feels different from a William Blair Healthcare simulation.

#### Pre-Generated Simulation Content

Each simulation type has a deep library of pre-generated scenarios:

- **8+ scenarios per simulation type at launch** — 2 per type x 4 types = 8 generic + firm-specific variants.
- **Firm-specific scenario variants:** For the top 25 firms, each simulation type has a custom scenario reflecting that firm's sector focus and deal style. Goldman TMT gets a tech M&A case. Evercore gets a restructuring advisory case. Citadel gets a volatility trading scenario.
- **All financial data, rubrics, and evaluation criteria are pre-generated.** The scenario, the data tables, the model answers, and the scoring rubric are all stored in the database. Claude only evaluates free-text responses (memos, rationale, explanations) — numerical/model outputs are scored deterministically against the pre-built answer key.
- **Difficulty scaling:** Each scenario has foundational, intermediate, and advanced variants. The system selects based on the student's profile and previous simulation scores.

### Why It's Worth $1M+

This is the feature that makes InternshipMatch indispensable for employers. Instead of flying 50 candidates to New York for a superday and running paper LBO tests, firms can pre-screen candidates with a simulation that tests real analytical thinking. A single superday costs $50K-$100K in travel, hotels, and recruiter time. If a simulation eliminates even 20% of unqualified candidates, the ROI is immediate.

For students, simulations are the closest thing to actual on-the-job experience they can get without an internship. Completion badges on their profile signal to employers: "This student has done the work, not just studied the theory."

**Future revenue target:** 10 employer simulation contracts at avg $25K + student freemium = $400K ARR, scaling to $1.0M ARR.

### Real Value Provided

- Students get hands-on experience that's impossible to get from textbooks or courses. A 60-minute M&A simulation teaches more about the job than 10 hours of lecture.
- Completion badges are strong signals on a profile — they prove a student can do the work, not just talk about it.
- Employers get a pre-screening tool that reduces superday costs and improves hire quality.
- Custom branded simulations double as employer branding — students who do a Goldman Sachs simulation develop affinity for Goldman Sachs.
- Claude's evaluation provides feedback students can't get anywhere else: "Your DCF methodology was sound but you missed the working capital adjustment in Year 3, which understated your terminal value by 12%."

### Technical Implementation

#### New Database Tables

```sql
-- Simulation definitions
CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,               -- 'ma_advisory', 'equity_research', 'lbo_case', 'trading_desk'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  time_limit_minutes INT NOT NULL,
  difficulty TEXT NOT NULL,         -- 'analyst', 'associate', 'senior'
  employer_account_id UUID REFERENCES employer_accounts(id),  -- NULL = generic
  firm_id UUID REFERENCES firms(id),  -- NULL = generic, non-NULL = firm-specific scenario
  branding JSONB,                   -- employer logo, colors, custom intro
  scenario JSONB NOT NULL,          -- full scenario data: company info, financials, market data
  tasks JSONB NOT NULL,             -- [{task_id, description, input_schema, rubric, weight}]
  answer_key JSONB NOT NULL,        -- pre-generated correct answers for deterministic scoring
  evaluation_prompts JSONB NOT NULL, -- Claude prompts for evaluating free-text tasks only
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INT NOT NULL DEFAULT 1
);

-- Student simulation attempts
CREATE TABLE simulation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  simulation_id UUID REFERENCES simulations(id) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INT,
  task_responses JSONB NOT NULL DEFAULT '{}',  -- {task_id: {response_data}}
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Simulation results
CREATE TABLE simulation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES simulation_attempts(id) NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  simulation_id UUID REFERENCES simulations(id) NOT NULL,
  overall_score FLOAT NOT NULL,
  task_scores JSONB NOT NULL,       -- {task_id: {score, max, feedback, strengths, gaps}}
  analytical_quality FLOAT,         -- Claude's assessment of financial reasoning (0-100)
  communication_quality FLOAT,      -- Quality of written outputs (0-100)
  time_management FLOAT,            -- How well they allocated time across tasks (0-100)
  badge_earned BOOLEAN NOT NULL DEFAULT false,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Simulation badges (like credentials but for simulations)
CREATE TABLE simulation_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  simulation_id UUID REFERENCES simulations(id) NOT NULL,
  result_id UUID REFERENCES simulation_results(id) NOT NULL,
  type TEXT NOT NULL,               -- simulation type
  employer_branded BOOLEAN NOT NULL DEFAULT false,
  employer_name TEXT,               -- if branded
  score FLOAT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_displayed BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, simulation_id)
);

-- Trading desk simulation events (real-time market events, pre-generated)
CREATE TABLE trading_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) NOT NULL,
  event_time_offset_seconds INT NOT NULL,  -- when this event fires (offset from start)
  event_type TEXT NOT NULL,         -- 'earnings', 'macro', 'sector', 'breaking_news'
  headline TEXT NOT NULL,
  details TEXT NOT NULL,
  market_impact JSONB,              -- {ticker: price_change}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS: Students own their attempts and results. Employers can read results for attempts on their branded simulations. Badges are public (like credentials).

#### New API Endpoints

```
-- Simulation catalog
GET    /api/simulations                  -- List available simulations (generic + firm-specific)
GET    /api/simulations/{id}             -- Simulation detail (scenario preview, not full data)
GET    /api/simulations/for-firm/{firm_id}  -- Firm-specific simulation variants

-- Taking simulations
POST   /api/simulations/{id}/start       -- Start timed simulation
PUT    /api/simulations/{id}/task/{task_id}  -- Save task response (auto-save)
POST   /api/simulations/{id}/submit      -- Submit for evaluation
GET    /api/simulations/trading/{id}/events  -- SSE endpoint for trading desk events

-- Results and badges
GET    /api/simulations/results          -- All user's simulation results
GET    /api/simulations/results/{id}     -- Detailed result with per-task feedback
GET    /api/badges/me                    -- User's earned badges
GET    /api/badges/{user_id}             -- Public badges for a profile

-- Employer simulation management
POST   /api/employer/simulations         -- Create branded simulation
PUT    /api/employer/simulations/{id}    -- Update simulation
GET    /api/employer/simulations/{id}/results  -- Candidate performance data
GET    /api/employer/simulations/{id}/analytics  -- Aggregate performance metrics

-- Simulation builder (employer-facing)
POST   /api/employer/simulations/generate  -- AI-assisted simulation generation from firm's deal history
```

#### New Frontend Pages

- `/simulations` — Simulation catalog: cards for each type, difficulty indicator, time required, employer branding where applicable.
- `/simulations/[id]` — Simulation detail: what you'll do, skills tested, time limit, "Start Simulation" CTA.
- `/simulations/[id]/play` — The simulation environment:
  - Left panel: scenario context, company data, financial statements.
  - Center panel: task workspace (structured inputs, mini-spreadsheet for modeling tasks, text editor for memos).
  - Right panel: task list with completion status, countdown timer.
  - For trading desk: live event feed with breaking news ticker.
- `/simulations/results` — Results dashboard: scores, badges earned, improvement areas.
- `/simulations/results/[id]` — Detailed per-task feedback from Claude.
- `/employer/simulations` — Employer simulation management.
- `/employer/simulations/new` — Simulation builder wizard (AI-assisted).
- `/employer/simulations/[id]/analytics` — Candidate performance analytics for a branded simulation.

#### Reused Code

- `claude_client.py` — All evaluation goes through the existing client. Simulation evaluation prompts are more complex than assessment prompts but use the same infrastructure.
- `assessments` infrastructure from Feature 3 — timed environment, auto-save, structured inputs, and evaluation pipeline are architecturally identical. Simulations are essentially multi-task assessments with richer scenarios.
- `credentials`/`badges` display components — badge rendering on profiles reuses the credential card component.
- Employer account infrastructure from Feature 2 — branding and team management.
- Pre-generated question bank infrastructure — simulation scenarios, answer keys, and rubrics follow the same pre-generation pipeline.

#### Content Development

The hardest part of this feature is creating high-quality simulation content. Each simulation needs:

- A realistic scenario with internally consistent financial data.
- 3-5 tasks that mirror actual analyst workflow.
- A detailed rubric for Claude evaluation.
- A complete answer key for deterministic scoring of quantitative outputs.
- Multiple difficulty variants.

**Initial content plan:** Launch with 8 generic simulations (2 per type) + firm-specific variants for the top 10 firms (40 additional scenarios). Expand content library based on usage data and employer requests.

#### Scale Considerations

- Simulation scenarios are pre-generated and stored as JSONB — loading a scenario is a single DB read.
- Trading desk events are pre-generated sequences, served via SSE. No real-time computation needed — just a timer-based playback of pre-built events.
- Numerical/model task scoring uses the pre-generated answer key (deterministic, no Claude call). Only free-text tasks (memos, rationale) need Claude evaluation.
- At 100M users, evaluation is the bottleneck. Mitigation: queue evaluations, prioritize quick deterministic scoring for immediate feedback, queue Claude evaluation for detailed feedback delivered async.

### Competitive Advantage

Goldman Sachs and JP Morgan run their own virtual simulations (Forage/TheForage) but these are free employer-branding tools with no real evaluation — students just click through. Wall Street Prep sells static case studies. InternshipMatch simulations are the first to combine interactive scenarios with AI evaluation that gives genuine analytical feedback. The employer-branded model creates a moat: once Goldman builds their InternshipMatch simulation, switching costs are high.

### Build Complexity

**6 weeks.** The simulation environment UI is the most complex frontend work in the entire product — structured data input, real-time events (trading desk), multi-panel layout, countdown timer, auto-save. The Claude evaluation prompts need extensive testing to ensure scoring is calibrated and feedback is genuinely useful. Content creation for 8+ launch simulations is ~2 weeks of work alongside the engineering.

---

## Build Order & Sequencing

### Why This Order

```
Feature 1: Peer Benchmarking (Weeks 1-4)
    |-- Establishes: Anonymized data aggregation, nightly compute pipeline, personalization infra
    |-- Used by: Features 2, 3, 4, 5

Feature 2: Employer Portal (Weeks 5-9)
    |-- Establishes: Employer auth, profile unlocks, reverse scoring
    |-- Used by: Features 3, 4, 5

Feature 3: Skills Assessments (Weeks 10-15)
    |-- Establishes: Timed evaluation environment, credentials, Claude scoring calibration
    |-- Used by: Features 4, 5

Feature 4: University Dashboard (Weeks 16-19)
    |-- Establishes: Institutional accounts, FERPA compliance, aggregate analytics
    |-- Used by: Feeds data to employer and student engagement

Feature 5: Deal Simulations (Weeks 20-25)
    |-- Capstone: Combines employer branding, evaluation engine, credential system
```

Each feature builds on the infrastructure of the previous ones. Building out of order means duplicating work or building throwaway scaffolding.

### Dependencies

| Feature | Hard Dependencies | Soft Dependencies |
|---------|-------------------|-------------------|
| Peer Benchmarking | None (builds on core product) | -- |
| Employer Portal | None (builds on core product) | Benchmarks for reverse scoring context |
| Skills Assessments | Employer accounts from F2 (for campaigns) | Credential display on employer search |
| University Dashboard | Aggregate data from F1, Employer data from F2, Credentials from F3 | -- |
| Deal Simulations | Employer accounts from F2, Evaluation engine from F3 | University distribution from F4 |

### Parallel Work Opportunities

While the features must ship sequentially, certain workstreams can run in parallel:

- **Pre-generated question bank creation** can begin immediately and run throughout the entire build. By the time Feature 3 (Assessments) ships, the question bank should have 200+ firms covered.
- **Simulation content creation** (F5) can begin during F2 development — scenario writing, financial data preparation, and rubric design are independent of the code.
- **University outreach** can begin during F3 development — pilot commitments before the dashboard is built.
- **Employer outreach** can begin during F1 development — pilot commitments drive F2 requirements.

---

## Future Monetization Plan

> All features ship free during the build phase. Monetization is enabled once the product is proven and the user base is established. The pricing models below are the planned future state.

### Student Tier (B2C)

| Tier | Future Price | Includes |
|------|-------------|----------|
| Free | $0 | Core dashboard, fit scores, application tracker, basic prep |
| Premium | $14.99/mo ($99/yr) | Benchmarking, gap analysis, weekly pulse, assessment credits |
| Premium+ | $24.99/mo ($179/yr) | Everything + success paths, deep benchmarks, unlimited assessments/simulations |

### Employer Tier (B2B)

| Tier | Future Price | Includes |
|------|-------------|----------|
| Starter | $250/mo ($3,000/yr) | 5 posts/mo, 50 unlocks/mo, basic search |
| Professional | $500/mo ($6,000/yr) | Unlimited posts, 200 unlocks/mo, reverse fit scoring, analytics |
| Enterprise | $800/mo ($9,600/yr) | Everything + API access, ATS integration, branded simulations |

### University Tier (B2B)

| Tier | Future Price | Includes |
|------|-------------|----------|
| Department | $5,000/yr | Single department, up to 500 students, 3 admin seats |
| School-wide | $15,000/yr | Entire business school, up to 3,000 students, 10 admin seats |
| Enterprise | $25,000/yr | University-wide, unlimited, SSO, dedicated support |

### Assessment & Simulation Add-Ons

| Option | Future Price |
|--------|-------------|
| Single assessment | $29 |
| 3-pack | $69 |
| Employer assessment sponsorship | $500-$2,000/campaign |
| Employer simulation contract (small) | $5K-$10K/yr |
| Employer simulation contract (large) | $30K-$40K/yr |

### Revenue Projections (Post-Monetization)

| Feature | Year 1 ARR | Year 2 ARR |
|---------|------------|------------|
| Peer Benchmarking (Premium subs) | $990K | $1.8M |
| Employer Talent Pipeline | $600K | $1.2M |
| Skills Assessments | $490K | $1.2M |
| University Dashboard | $500K | $1.5M |
| Virtual Deal Simulations | $400K | $1.0M |
| **Total** | **$2.98M** | **$6.7M** |

### Key Assumptions

- **Student user base:** Target 100M+ users at scale. Initial monetization at 50K+ active users.
- **Premium conversion:** 10-15% of active free users convert to paid (industry standard for freemium B2C SaaS).
- **Employer contracts:** Average deal size $6K/yr for portal, $25K/yr for simulations. 6-month sales cycle.
- **University contracts:** Average deal size $12.5K/yr. 3-6 month sales cycle with pilot period.
- **Churn:** 5% monthly for B2C subscriptions (seasonal — higher in summer), 10% annual for B2B contracts.
- **Net revenue retention:** 120% for B2B (upsells from Starter to Professional, Department to School-wide).

---

## What This Makes InternshipMatch

With all five features shipped, InternshipMatch is no longer a student tool. It's a **three-sided marketplace**:

1. **Students** get personalized recruiting intelligence, verified credentials, hands-on experience, and a pre-generated question bank covering every firm and position they could target.
2. **Employers** get a sourcing channel, pre-screening tools, and branded recruiting experiences.
3. **Universities** get outcome data, student support tools, and employer relationship insights.

Each side makes the others more valuable. More students = better data for employers. More employers = more postings for students. More universities = more students = more employers. This is the flywheel that makes InternshipMatch defensible at scale.

### The Scale Vision

At 100M+ users, InternshipMatch becomes the **Bloomberg Terminal for career intelligence**:

- Every finance student in the world has a personalized recruiting dashboard.
- Every finance employer has a talent sourcing channel.
- Every business school has real-time outcome data.
- Pre-generated content (42,000+ questions, 100+ simulation scenarios, nightly benchmarks) means the platform serves instantly at any scale.
- Claude is reserved for high-value evaluations (behavioral responses, free-text analysis), not routine content delivery.

The total addressable market for a platform that serves all three sides: **$200M-$500M**, with InternshipMatch positioned to capture 1-3% in Year 2 ($6.7M) and 5-10% by Year 5 ($20M-$50M).
