# School Readiness Gap Analysis Report

## Executive Summary

**Overall readiness: Prototype-ready, not yet pilot-ready.**

InternshipMatch has a strong technical foundation — modern stack, strict typing, row-level security on every user table, and well-documented architecture. However, it is currently built as a single-school consumer SaaS product, not an institutional tool. Before Owen can credibly present this to a university IT department, the product needs paper-level compliance artifacts (Phase 0), then a small set of technical changes to reach pilot-readiness (Phase 1).

The gap is manageable. Most issues are documentation and configuration — not architectural rewrites. The core data model and security posture are sound; what's missing is the institutional wrapper that higher-ed IT expects to see before approving even a limited pilot.

---

## Readiness Overview

| # | Dimension | Rating | Summary |
|---|-----------|--------|---------|
| 1 | Architecture & Multi-tenancy | Partial | Good stack, no `institution_id`, no env separation, no IaC |
| 2 | Security & HECVAT | Partial | RLS is strong; CORS wide open, no rate limiting, no security docs |
| 3 | Privacy & FERPA | Partial | CLAUDE.md acknowledges FERPA; no privacy policy, no deletion endpoints, no audit logging |
| 4 | Identity & SSO | Missing | Supabase native auth only, zero SAML/OIDC support |
| 5 | Accessibility | Partial | Semantic HTML + lang attribute; no VPAT, no testing suite, no accessibility doc |
| 6 | Institutional Rollout | Missing | Single-school hardcoded ("Bryant University"), no tenant config, no admin panel |
| 7 | Documentation & Trust Artifacts | Partial | Strong ARCHITECTURE.md and CLAUDE.md; missing SECURITY, PRIVACY, ACCESSIBILITY docs |

**Rating key:**
- **Complete** — meets institutional expectations today
- **Partial** — foundations exist, but gaps would block procurement
- **Missing** — no meaningful progress toward institutional requirements

---

## Detailed Findings

### 1. Architecture & Multi-tenancy

**Current state:**
- Backend: FastAPI (Python 3.12) on Railway (`backend/app/main.py`)
- Frontend: Next.js 15 on Vercel
- Database: Supabase PostgreSQL with RLS on all user-owned tables (`supabase/migrations/0001_initial_schema.sql`)
- No Docker configuration in the repo
- No CI/CD pipeline configuration
- No infrastructure-as-code (Terraform, Pulumi, etc.)
- Single environment — no documented staging/production separation

**Gaps:**
1. **No `institution_id` column** — The `users` table has `school TEXT NOT NULL DEFAULT 'Bryant University'` (line 15 of `0001_initial_schema.sql`). This is a free-text string, not a foreign key to an institutions table. There is no tenant isolation beyond per-user RLS.
2. **No environment separation** — The technical guide (`docs/technical-guide-for-schools.md`, lines 18-20) explicitly calls out that universities expect "separate environments: production, staging, and development." The repo has no evidence of this.
3. **No CI/CD** — No GitHub Actions, no automated testing pipeline, no deployment gates. IT teams expect at least basic automated testing and linting in CI.
4. **No WAF or CDN configuration** — The technical guide's reference architecture (lines 75-76) includes CDN + WAF at the edge. Railway provides basic TLS but no WAF.

**Recommendations:**
- Add an `institutions` table with `id`, `name`, `domain`, `config` (JSONB for branding, SSO settings).
- Add `institution_id UUID REFERENCES institutions(id)` to `users` table and update RLS policies.
- Document the production vs. staging separation (even if both are Railway environments today).
- Add a minimal CI pipeline (GitHub Actions: lint, type-check, test).

---

### 2. Security & HECVAT

**Current state:**
- RLS enabled on every user-owned table with correct `auth.uid()` checks
- JWT validation via Supabase GoTrue (`backend/app/auth.py`)
- Structured logging in the backend (`backend/app/db.py`)
- HTTPS enforced by Railway and Vercel

**Gaps:**
1. **CORS allows all origins** — `backend/app/main.py` configures `allow_origins=["*"]`. The HECVAT and the technical guide (line 135) expect explicit origin allowlisting.
2. **No rate limiting** — No middleware or API gateway throttling. A university security reviewer will flag this immediately.
3. **No security overview document** — The technical guide (lines 126-152) provides a template for HECVAT-style answers. InternshipMatch has none of these written.
4. **No incident response plan** — HECVAT domain requires documented detection, triage, containment, and notification procedures.
5. **No vulnerability management process** — No dependency scanning, no container scanning, no documented SLAs for patching.
6. **No penetration test results** — Not expected for a pilot, but the absence should be acknowledged with a timeline.

**Recommendations:**
- Restrict CORS to the actual frontend domain(s).
- Add rate limiting middleware (e.g., `slowapi` for FastAPI).
- Write `docs/security-overview-for-it.md` covering encryption, access control, logging, incident response, and backups.
- Complete a HECVAT Lite self-assessment (EDUCAUSE provides the template).
- Add `pip-audit` or Dependabot for dependency vulnerability scanning.

---

### 3. Privacy & FERPA

**Current state:**
- CLAUDE.md explicitly warns about FERPA and student data protection (lines in the "Critical Gotchas" section)
- The system stores GPA, coursework, clubs, diversity status, and prior experience — all potentially FERPA-covered
- PDFs stored in Supabase Storage (not in the database)
- Resume data is sent to Anthropic Claude API for parsing and scoring

**Gaps:**
1. **No privacy policy document** — Nothing a student or institution can point to that explains what data is collected, why, how long it's retained, and who can access it.
2. **No data deletion endpoints** — The selling guide (line 48) requires the vendor to explain "how data is deleted or returned at contract end." No such API exists.
3. **No audit logging of data access** — The technical guide (lines 173-179) requires logging actor, timestamp, IP, and action for all access to sensitive student records. The current structured logging does not cover this.
4. **AI subprocessor disclosure** — Student resume data is sent to Anthropic's API. This must be disclosed as a subprocessor with a clear explanation that Anthropic does not train on API inputs.
5. **No data retention policy** — No documented retention windows for logs, backups, or application data.
6. **No data minimization review** — The `StudentProfile` model collects `diversity_status` which may not be necessary for the core use case.

**Recommendations:**
- Write `docs/privacy-and-ferpa-alignment.md` covering data inventory, collection purpose, retention, deletion, and subprocessor list.
- Implement a `DELETE /api/users/me` endpoint that cascades to all user data.
- Add audit logging middleware that records (user_id, action, resource, timestamp, ip) for profile reads/writes.
- Document Anthropic as a subprocessor with their data handling commitments (no training on API data, SOC 2 certified).
- Set explicit retention windows (e.g., 90 days for logs, user data deleted within 30 days of account deletion).

---

### 4. Identity & SSO

**Current state:**
- Authentication is Supabase Auth with email/password only (`backend/app/auth.py`)
- Frontend uses `@supabase/supabase-js` for session management (`frontend/lib/supabase.ts`)
- No SAML, no OIDC, no Shibboleth support
- No role mapping beyond the implicit "authenticated user" role

**Gaps:**
1. **No SSO support at all** — The selling guide (lines 58-69) is emphatic: "Schools usually prefer products that fit into their existing identity stack." SAML 2.0 and OIDC are the minimum. This is the single largest blocker for institutional adoption.
2. **No user provisioning** — No SCIM, no CSV import for users, no way for an institution to bulk-create accounts.
3. **No role-based access beyond "user"** — No admin role, no institutional-admin role, no concept of "this person manages users at School X."
4. **No attribute mapping** — The technical guide (lines 189-204) specifies `eduPersonPrincipalName`, `mail`, `givenName`, `sn`, `eduPersonAffiliation`. None of these are referenced anywhere.

**Recommendations:**
- **Phase 1 (pilot-ready):** Add Supabase Auth's built-in SAML support (Supabase supports SAML 2.0 on Pro plans). Configure one IdP for the pilot institution.
- **Phase 1:** Add an `admin` role and basic admin endpoints (view users at my institution, export data).
- **Phase 2:** Implement SCIM provisioning for automated user lifecycle management.
- Document the SSO integration guide showing the SAML attribute mapping and expected flow.

---

### 5. Accessibility

**Current state:**
- `<html lang="en">` is set in `frontend/app/layout.tsx`
- Using shadcn/ui components (which have reasonable ARIA defaults)
- Tailwind utility classes for styling
- Semantic HTML structure in page components

**Gaps:**
1. **No VPAT or accessibility conformance statement** — The technical guide (lines 219-238) lists this as a minimum deliverable. Schools will ask for it.
2. **No automated accessibility testing** — No axe-core, no Lighthouse CI, no accessibility linting (eslint-plugin-jsx-a11y).
3. **No manual screen reader testing documented** — No evidence of VoiceOver, NVDA, or JAWS testing.
4. **No accessibility reporting mechanism** — No way for users to report accessibility issues.
5. **Color contrast not verified** — The design system uses `#6B6B6B` secondary text on `#FAFAFA` background. This is 4.97:1 contrast ratio — passes AA for normal text but is borderline. Needs verification across all UI states.

**Recommendations:**
- Write `docs/accessibility-and-vpat.md` with a WCAG 2.1 AA conformance target and known limitations.
- Add `eslint-plugin-jsx-a11y` to the frontend linting config.
- Add Lighthouse accessibility audit to CI (target score: 90+).
- Verify color contrast ratios across all text/background combinations.
- Add a "Report accessibility issue" link in the application footer.

---

### 6. Institutional Rollout

**Current state:**
- "Bryant University" is hardcoded as a default throughout the schema and models
- `users.school` is a free-text field with `DEFAULT 'Bryant University'` (`0001_initial_schema.sql`, line 15)
- `Alumnus.school` defaults to `"Bryant University"` (`backend/app/models.py`, line 320)
- No concept of institutional branding, configuration, or admin users
- No admin panel or institutional dashboard

**Gaps:**
1. **No multi-school support** — Every assumption in the code is single-school. The technical guide (lines 46-58) describes multi-tenant patterns as a signal of "long-term maturity."
2. **No institutional admin panel** — IT teams expect to manage their users, view usage, and configure settings without contacting the vendor.
3. **No tenant onboarding flow** — No way to add a new school without code changes.
4. **No usage analytics for institutions** — Schools want to see adoption metrics (DAU, feature usage, engagement) for their cohort.
5. **No pilot plan document** — The technical guide (lines 243-265) provides a phased pilot template. InternshipMatch has no equivalent.

**Recommendations:**
- Create an `institutions` table and migrate `school` from free-text to a foreign key.
- Build a minimal admin panel: user list, usage stats, data export for the institution.
- Write `docs/pilot-implementation-plan.md` with Phase 1 (technical setup), Phase 2 (limited pilot), Phase 3 (evaluate and scale).
- Add per-institution configuration (branding, alumni database, target firms list).

---

### 7. Documentation & Trust Artifacts

**Current state:**
- `ARCHITECTURE.md` — comprehensive system design document
- `CLAUDE.md` — detailed project instructions with FERPA acknowledgment
- `docs/selling-software-to-schools.md` — strategy guide for the sales conversation
- `docs/technical-guide-for-schools.md` — technical patterns universities expect
- No external-facing security, privacy, or accessibility documents

**Gaps:**
1. **No security overview for IT** — The selling guide (lines 82-90) lists this as part of a "convincing vendor packet."
2. **No privacy/data handling summary** — Required for FERPA review.
3. **No accessibility statement** — Required for student-facing tools.
4. **No architecture diagram in a shareable format** — ARCHITECTURE.md is internal; IT needs a clean one-pager.
5. **No incident response plan** — Even a one-page plan shows operational maturity.
6. **No backup/DR documentation** — Supabase handles this, but it needs to be documented in vendor-facing language.

**Recommendations:**
- Write 4 documents (detailed in Phase 0 below):
  - `docs/security-overview-for-it.md`
  - `docs/privacy-and-ferpa-alignment.md`
  - `docs/accessibility-and-vpat.md`
  - `docs/pilot-implementation-plan.md`
- Create a one-page architecture diagram (Mermaid) suitable for IT presentations.
- Document Supabase's backup/DR capabilities in institutional-facing language.

---

## Prioritized Improvement Roadmap

### Phase 0: Paper Readiness (1-2 weeks, no code changes)

Goal: Have the documentation packet ready for Owen's first IT conversation.

| # | Action | Output | Effort |
|---|--------|--------|--------|
| 0.1 | Write security overview | `docs/security-overview-for-it.md` | 1 day |
| 0.2 | Write privacy & FERPA alignment doc | `docs/privacy-and-ferpa-alignment.md` | 1 day |
| 0.3 | Write accessibility statement | `docs/accessibility-and-vpat.md` | 0.5 day |
| 0.4 | Write pilot implementation plan | `docs/pilot-implementation-plan.md` | 0.5 day |
| 0.5 | Create shareable architecture diagram | `docs/architecture-diagrams.md` (Mermaid) | 0.5 day |
| 0.6 | Draft HECVAT Lite responses | `docs/hecvat-lite-responses.md` | 1 day |
| 0.7 | Document subprocessors (Anthropic, Supabase, Railway, Vercel) | Include in privacy doc | Included in 0.2 |

**Why Phase 0 matters:** The selling guide (lines 148-159) shows that IT meetings move quickly from "what does it do?" to "show me your security posture." Having these documents ready before the meeting is the difference between advancing to a pilot and being sent away to "come back when you're ready."

---

### Phase 1: Pilot-Ready (2-4 weeks, targeted code changes)

Goal: Technical changes required to support a single-school institutional pilot.

| # | Action | Files Affected | Effort |
|---|--------|---------------|--------|
| 1.1 | Restrict CORS to actual frontend domain | `backend/app/main.py` | 1 hour |
| 1.2 | Add rate limiting middleware | `backend/app/main.py`, new `backend/app/rate_limit.py` | 0.5 day |
| 1.3 | Add `institutions` table + migrate `school` field | `supabase/migrations/0003_institutions.sql`, `backend/app/models.py` | 1 day |
| 1.4 | Add audit logging for profile access | `backend/app/db.py`, new migration | 1 day |
| 1.5 | Add `DELETE /api/users/me` data deletion endpoint | `backend/app/main.py`, `backend/app/db.py` | 0.5 day |
| 1.6 | Enable Supabase SAML (Pro plan) + configure pilot IdP | Supabase dashboard + `backend/app/auth.py` | 1-2 days |
| 1.7 | Add admin role + basic admin endpoints | `backend/app/main.py`, new `backend/app/admin.py` | 2 days |
| 1.8 | Add GitHub Actions CI (lint, type-check, test) | `.github/workflows/ci.yml` | 0.5 day |
| 1.9 | Add eslint-plugin-jsx-a11y + Lighthouse CI | `frontend/package.json`, `.github/workflows/ci.yml` | 0.5 day |
| 1.10 | Verify and fix color contrast ratios | `frontend/tailwind.config.ts` | 0.5 day |

**Milestone:** After Phase 1, InternshipMatch can pass a basic IT security review and run a controlled pilot with one department at one institution.

---

### Phase 2: Multi-School Production (1-2 months)

Goal: Support multiple institutions simultaneously with proper isolation and governance.

| # | Action | Description | Effort |
|---|--------|-------------|--------|
| 2.1 | Full multi-tenant data model | `institution_id` on all relevant tables, RLS policies scoped by institution | 1 week |
| 2.2 | Institutional admin panel | Dashboard for IT admins: user management, usage stats, data export | 1-2 weeks |
| 2.3 | SCIM provisioning | Automated user lifecycle from campus IdP | 1 week |
| 2.4 | Per-institution configuration | Branding, alumni database scope, target firm lists, SSO settings | 1 week |
| 2.5 | SOC 2 Type I preparation | Engage auditor, implement remaining controls, document policies | 2-3 months |
| 2.6 | Formal penetration test | Third-party pentest with remediation | 2-4 weeks |
| 2.7 | VPAT completion | Full WCAG 2.1 AA audit with conformance table | 1-2 weeks |
| 2.8 | Infrastructure as Code | Terraform/Pulumi for reproducible deployments | 1 week |
| 2.9 | Disaster recovery testing | Documented restore procedure, tested annually | 1 day + ongoing |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| IT rejects due to no SSO | High | Deal-blocking | Phase 1.6 — enable Supabase SAML before the meeting |
| Security review fails on CORS `*` | High | Delays pilot | Phase 1.1 — trivial fix, do immediately |
| FERPA concerns about AI subprocessor | Medium | Requires legal review | Phase 0.2 — document Anthropic's data handling in privacy doc |
| Accessibility complaint blocks adoption | Medium | Delays pilot | Phase 0.3 + Phase 1.9 — statement + automated testing |
| No multi-tenant story scares IT | Medium | Weakens pitch | Phase 0.4 — acknowledge in pilot plan, show roadmap |

---

## Appendix: Reference Document Mapping

### Mapping to `docs/selling-software-to-schools.md`

| Report Section | Reference Document Section | Lines |
|---------------|--------------------------|-------|
| Security & HECVAT | "Security Review Expectations" | 27-36 |
| Security & HECVAT | "Useful Trust Artifacts" | 82-90 |
| Privacy & FERPA | "FERPA Implications for a SaaS Vendor" | 43-51 |
| Privacy & FERPA | "Privacy and Regulatory Requirements" | 37-51 |
| Identity & SSO | "Identity, Integration, and Technical Architecture" | 58-69 |
| Accessibility | "Accessibility Is Not Optional" | 53-56 |
| Institutional Rollout | "A Founder Readiness Checklist" | 148-161 |
| Documentation | "Useful Trust Artifacts" | 82-90 |
| Phase 0 roadmap | "Best Near-Term Action Plan" | 168-174 |
| Phase 1 roadmap | "What IT Will Care About Most" | 21-25 |

### Mapping to `docs/technical-guide-for-schools.md`

| Report Section | Reference Document Section | Lines |
|---------------|--------------------------|-------|
| Architecture | "Backend Models Universities Expect" | 12-42 |
| Architecture | "Example Architecture Diagrams" | 62-120 |
| Multi-tenancy | "Multi-tenant Data Models That Look Professional" | 46-58 |
| Security & HECVAT | "Security & HECVAT-style Controls" | 126-152 |
| Privacy & FERPA | "FERPA & Privacy: Specific Technical Design Choices" | 156-181 |
| Identity & SSO | "Identity, SSO, and Attribute Mapping" | 185-214 |
| Accessibility | "Accessibility Deliverables" | 217-238 |
| Institutional Rollout | "Implementation Patterns for Campus Pilots" | 243-265 |
| Documentation | "Suggested File Structure for Your Repo" | 271-286 |

---

## Appendix: Key File References

| File | Relevance |
|------|-----------|
| `backend/app/main.py` | CORS configuration (`allow_origins=["*"]`), all API routes |
| `backend/app/auth.py` | JWT validation via Supabase GoTrue, no SSO |
| `backend/app/models.py` | Data models, `school: str` field (no `institution_id`) |
| `backend/app/db.py` | Database operations, structured logging (no audit trail) |
| `supabase/migrations/0001_initial_schema.sql` | RLS policies, schema with `school TEXT DEFAULT 'Bryant University'` |
| `supabase/migrations/0002_phase2_features.sql` | Phase 2 tables (applications, alumni, prep, timeline) |
| `frontend/app/layout.tsx` | `<html lang="en">`, semantic structure |
| `frontend/components/AuthGuard.tsx` | Session-based route protection |
| `frontend/lib/supabase.ts` | Supabase client initialization |
| `CLAUDE.md` | FERPA warning, design system, architecture decisions |
| `ARCHITECTURE.md` | System design (internal documentation) |

---

## Bottom Line

InternshipMatch is a well-built prototype with a strong technical foundation. The path to institutional readiness is not a rewrite — it's a documentation sprint (Phase 0) followed by targeted security and identity work (Phase 1). The most critical items for Owen's first IT meeting are:

1. **Have the paper ready** — security overview, privacy doc, accessibility statement, pilot plan
2. **Fix CORS immediately** — `allow_origins=["*"]` is indefensible in an IT meeting
3. **Have an SSO answer** — even "we support SAML via Supabase and can configure your IdP for the pilot" is sufficient
4. **Present as a bounded pilot** — one department, one semester, limited data scope, clear success metrics

The honest pitch is: "We're a focused, well-architected product that's ready for a controlled pilot with your institution. Here's our security posture, here's our FERPA alignment, and here's the pilot plan."
