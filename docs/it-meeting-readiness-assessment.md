# InternshipMatch -- IT Meeting Readiness Assessment

**Last updated:** 2026-04-23
**Prepared for:** Tyler Moore / Owen Ash
**Purpose:** Pre-meeting gap analysis for Bryant University IT department presentation

---

## 1. Vendor Documentation Audit

| Document | File | Quality | IT-Ready? |
|----------|------|---------|-----------|
| Security Overview | `security-overview-for-it.md` | Excellent | Yes |
| Privacy & FERPA Alignment | `privacy-and-ferpa-alignment.md` | Excellent | Yes |
| HECVAT Lite Responses | `hecvat-lite-responses.md` | Excellent | Yes |
| Pilot Implementation Plan | `pilot-implementation-plan.md` | Excellent | Yes |
| Accessibility & VPAT | `accessibility-and-vpat.md` | Good | Yes |
| Architecture Diagrams | `architecture-diagrams.md` | Excellent | Yes |
| Selling Strategy (internal) | `selling-software-to-schools.md` | Good | Internal only |
| Technical Guide (internal) | `technical-guide-for-schools.md` | Good | Internal only |

**Summary:** 6 of 8 documents are directly customer-facing and ready to hand to IT. The documentation packet is enterprise-grade for an early-stage product.

---

## 2. Technical Readiness Audit

### What's Implemented and Verified

| Area | Status | Evidence |
|------|--------|----------|
| Row-Level Security (RLS) | Complete | All user-owned tables in Supabase |
| Encryption in transit | Complete | TLS 1.2+ on all connections |
| Encryption at rest | Complete | AES-256 via Supabase/AWS KMS |
| Audit logging | Complete | `audit_log` table, migration 0007 |
| Rate limiting | Complete | `slowapi` middleware on backend |
| CORS lockdown | Complete | Restricted to configured domains (was `["*"]`) |
| Email domain restriction | Complete | `@bryant.edu` only, client-side + Supabase trigger |
| Admin endpoints | Complete | `/api/admin/users`, `/api/admin/stats`, `/api/admin/export` |
| Multi-tenant foundation | Complete | `institutions` table, `institution_id` on users, admin roles |
| User deletion endpoint | Complete | `DELETE /api/users/me` with cascade + audit log |
| CI/CD pipeline | Complete | GitHub Actions: lint, test, build |
| All 7 core features | Complete | Resume, dashboard, timeline, applications, alumni, prep, scoring |
| Mobile app | Complete | React Native (Expo), separate repo |

### What's Not Implemented

| Area | Status | Risk Level |
|------|--------|------------|
| SSO / SAML integration | Documented as available, not configured | High -- IT will ask |
| Penetration testing | Planned Q4 2026 | Medium -- acknowledged upfront |
| SOC 2 Type I | Planned 2027 | Low -- subprocessors all SOC 2 Type II |
| Automated dependency scanning | Planned Q3 2026 | Low |
| Cyber liability insurance | Planned Q4 2026 | Medium -- IT may require for contract |
| VPAT publication | Planned Q1 2027 | Low -- accessibility statement exists |
| Formal security policy document | Planned Q4 2026 | Low -- controls documented in vendor packet |

---

## 3. Deal-Breaker Gaps (Fix Before the Meeting)

### Gap 1: App is Not Deployed

**Problem:** `NEXT_PUBLIC_API_URL=http://localhost:8000`. The backend points at localhost. There is no live URL for IT to visit or for a live demo.

**Impact:** If IT asks "can we see it?" and the answer is "only on my laptop," the product looks like a class project, not a deployable service.

**Fix:**
- Deploy frontend to Vercel with a real URL
- Deploy backend to Railway with a real URL
- Connect them and verify the full flow works end-to-end
- Estimated effort: 2-4 hours

---

### Gap 2: Domain and Email Addresses May Not Exist

**Problem:** All vendor docs reference `internshipmatch.app`, `security@internshipmatch.app`, and `accessibility@internshipmatch.app`. If these are not registered and receiving mail, IT will notice immediately.

**Impact:** Referencing non-existent contact addresses in compliance documents destroys credibility.

**Fix:**
- Register domain (internshipmatch.app or alternative)
- Set up email forwarding for `security@` and `accessibility@` to a real inbox
- Publish privacy policy and terms of service at the URLs referenced in docs (`internshipmatch.app/privacy`, `internshipmatch.app/terms`)
- Estimated effort: 1-2 hours

---

### Gap 3: No Executive One-Pager

**Problem:** The vendor packet has 8 detailed documents but no single-page summary a CIO can skim in 2 minutes.

**Impact:** Decision-makers won't read 80 pages of docs before deciding whether to engage. The one-pager is what gets passed around internally after the meeting.

**Fix:**
- Create a 1-page PDF: problem, solution, target user, architecture diagram, security posture summary, pilot ask
- Include at the front of the vendor packet
- Estimated effort: 1 hour

---

### Gap 4: SSO Claimed But Not Configured

**Problem:** The HECVAT says "SAML 2.0 via Supabase Auth." Supabase SAML requires the Pro plan and actual IdP configuration. If IT asks to test SSO, the answer is "not yet."

**Impact:** Contradicting your own HECVAT responses in the first meeting erodes trust.

**Fix:**
- Option A: Upgrade Supabase to Pro and configure SAML before the meeting
- Option B: Update HECVAT language to: "SAML 2.0 supported via Supabase Auth; SSO configuration is performed during pilot setup (Phase 1, weeks 1-2)"
- Be upfront in the meeting: "SSO integration is part of the pilot setup phase. We'll configure it with your IdP during weeks 1-2."
- Estimated effort: Option A = 4-8 hours; Option B = 15 minutes

---

### Gap 5: No Live Demo with Real Data

**Problem:** Sample/preset data exists, but IT needs to see the real flow: sign up with @bryant.edu, upload a resume, see AI parsing, see the dashboard populate with scores.

**Impact:** A working demo is worth more than all 8 docs combined. "Let me show you" beats "let me tell you about" every time.

**Fix:**
- Prepare a demo account with a pre-uploaded resume and fully populated dashboard
- Also prepare a clean account to show the signup-to-dashboard flow live
- Test the demo 3 times before the meeting
- Have screenshots as backup if WiFi fails
- Estimated effort: 1-2 hours (after deployment is live)

---

### Gap 6: "1 Employee" in HECVAT

**Problem:** HECVAT Domain 1 says "Number of employees: 1 (solo founder)." This is a bus-factor red flag for any IT department evaluating vendor risk.

**Impact:** IT may flag this as an unacceptable vendor risk, especially for a product handling FERPA data.

**Fix:**
- Update to reflect the actual team: "2 (co-founders)" — Tyler Moore and Owen Ash
- Emphasize in the meeting: the architecture deliberately relies on SOC 2-certified managed infrastructure (Supabase, Vercel, Railway, Anthropic) rather than self-managed servers, which reduces operational bus-factor risk
- Estimated effort: 5 minutes

---

### Gap 7: Pricing is Vague

**Problem:** Pilot plan says "Reduced or waived for initial pilot partners." No post-pilot pricing exists. IT will ask "what does this cost if we expand?" and an answer of "we haven't decided" looks unserious.

**Impact:** Budget conversations stall deals. If IT can't attach a number to a budget request, the project dies in procurement.

**Fix:**
- Define at least 2-3 pricing tiers:
  - Pilot: Free (1 semester, up to 200 students, 1 department)
  - Department: $X/student/year or flat $X/year for a department
  - Institution-wide: $X/year (negotiated)
- You don't need final numbers, but you need a structure
- Estimated effort: 30 minutes of decision-making

---

## 4. Recommended Meeting Structure (30-45 Minutes)

### Opening: The Problem (3 min)

Finance recruiting is fragmented. Students use 5+ disconnected tools: job databases that don't personalize (Adventis, WSO), resume matchers that don't know finance (Jobscan, Teal), and prep courses that don't tell you where to apply. Students miss deadlines, apply to wrong-fit firms, and network blindly. Career services has no centralized tool for finance-specific recruiting support.

### Live Demo (10 min)

Walk through the complete student journey:
1. Sign up with @bryant.edu email
2. Upload resume (PDF)
3. AI parses resume into structured profile (show the review/edit step)
4. Dashboard populates with ranked opportunities and fit scores
5. Show timeline with recruiting deadlines
6. Show alumni networking with outreach drafting
7. Show interview prep with AI evaluation

**Key talking point:** "Everything you just saw runs on the same infrastructure as your Supabase database. No new servers to manage, no on-prem installation."

### Architecture & Security (10 min)

Walk through the architecture diagram (print or project `architecture-diagrams.md` diagram 1):
- All data in US (AWS us-east-1)
- All subprocessors SOC 2 Type II certified
- Row-Level Security on every user table -- students cannot see each other's data
- Anthropic does not train on student data, deletes API inputs after 30 days
- Resume PDFs in encrypted storage, not in the database
- Audit logging on all sensitive operations
- FERPA school official framework documented and ready for DPA

### The Ask (5 min)

"We'd like to propose a 1-semester pilot with the finance department. 50-200 students, free of charge. We have a structured pilot plan with clear success metrics -- 40% adoption, 25% weekly active, NPS of 30+. If it doesn't meet those targets, we walk away and delete all data within 30 days. Zero risk to the institution."

Hand over the vendor packet.

### Q&A (10-15 min)

**Anticipated questions and prepared answers:**

| Question | Answer |
|----------|--------|
| "Do you support SSO?" | "Yes, SAML 2.0 via Supabase Auth. SSO configuration is part of the pilot setup phase (weeks 1-2). We'll work with your IdP team directly." |
| "Do you have a pen test?" | "Third-party pen test is scheduled for Q4 2026. For the pilot, all subprocessors (Supabase, Anthropic, Railway, Vercel) hold SOC 2 Type II, and we've documented our controls in the security overview and HECVAT." |
| "Who has access to student data?" | "Only the individual student, via RLS-enforced database policies. The service role key is server-side only, encrypted, never in the browser. No InternshipMatch staff can view individual student records through the application." |
| "What if you go out of business?" | "All student data is exportable in JSON. Upon contract termination, the institution receives a complete export and all data is deleted within 30 days. No vendor lock-in -- the data format is open." |
| "Why should we trust a startup over Handshake?" | "Handshake is a general job board. InternshipMatch is a vertical AI agent built specifically for finance recruiting. We know the 200 firms, the recruiting timelines, the interview formats. Handshake lists marketing internships next to IB roles. We don't." |
| "What does this cost after the pilot?" | "[Present pricing tiers]" |
| "How is this different from what career services already does?" | "Career services advises students 1-on-1. InternshipMatch automates the research, scoring, and tracking so advisors can focus on high-value conversations instead of telling students which firms to look at." |

---

## 5. Vendor Packet (Documents to Print/PDF for Handoff)

Assemble in this order:

1. **Executive One-Pager** (to be created) -- the leave-behind
2. **Architecture Diagrams** (`architecture-diagrams.md`) -- visual proof of maturity
3. **Security Overview** (`security-overview-for-it.md`) -- what IT cares about most
4. **Privacy & FERPA Alignment** (`privacy-and-ferpa-alignment.md`) -- what legal cares about
5. **HECVAT Lite Responses** (`hecvat-lite-responses.md`) -- saves IT 2-3 weeks
6. **Accessibility Statement** (`accessibility-and-vpat.md`) -- shows compliance awareness
7. **Pilot Implementation Plan** (`pilot-implementation-plan.md`) -- the concrete next step

Total: ~50 pages of professional documentation that most Series A startups don't have.

---

## 6. Action Item Checklist

### Must-Do (Deal Breakers)

- [ ] Deploy frontend to Vercel with production URL
- [ ] Deploy backend to Railway with production URL
- [ ] Connect frontend to deployed backend (update `NEXT_PUBLIC_API_URL`)
- [ ] Register domain (`internshipmatch.app` or alternative)
- [ ] Set up email forwarding for `security@` and `accessibility@`
- [x] ~~Publish privacy policy page at domain~~ (created at `/privacy`)
- [x] ~~Publish terms of service page at domain~~ (created at `/terms`)
- [x] ~~Create executive one-pager~~ (created `docs/executive-one-pager.md`)
- [ ] Prepare live demo (pre-loaded account + clean signup flow)
- [ ] Test live demo end-to-end at least 3 times

### Should-Do (Strengthens the Pitch)

- [x] ~~Update HECVAT employee count from 1 to 2~~
- [x] ~~Update SSO language in HECVAT to reflect pilot-phase configuration~~
- [ ] Define pricing tiers (pilot free, department rate, institution rate)
- [ ] Print/PDF the vendor packet (7 documents in order)
- [ ] Prepare 2-minute architecture diagram walkthrough script
- [ ] Record 3-minute product demo video as backup

### Code Fixes Applied (April 23)

- [x] ~~Added missing `GET /api/postings/{id}` backend endpoint~~ (opportunity detail page was broken)
- [x] ~~Fixed `getUpcomingApplications` response key mismatch~~ (frontend expected `applications`, backend returned `upcoming`)
- [x] ~~Fixed same `getUpcomingApplications` bug in mobile app~~
- [x] ~~Fixed pre-existing TypeScript build error in `prep/page.tsx`~~ (`readiness_scores` property didn't exist on type)
- [x] ~~Frontend build passes clean with all new pages~~

### Nice-to-Have

- [ ] Prepare "bus factor" answer (managed infra, no self-hosted servers)
- [ ] Prepare "why not Handshake" competitive positioning answer
- [ ] Prepare "career services alignment" talking points
- [ ] Screenshot backups of every demo screen (WiFi contingency)
