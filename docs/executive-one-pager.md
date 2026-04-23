# InternshipMatch -- Executive Summary

**AI-powered recruiting agent for undergraduate finance students.**

---

## The Problem

Finance recruiting is the most structured, time-sensitive hiring process in any industry. Sophomore and junior students targeting investment banking, sales and trading, private equity, and quant roles must track 200+ firms, meet GPA cutoffs, hit application windows that open 18 months before start dates, and network with alumni at every target firm.

Today, students piece together 5+ disconnected tools: job databases that don't personalize (Adventis, WSO), resume matchers that know nothing about finance (Jobscan, Teal), and prep courses that don't tell you where to apply. Career services offices lack a centralized, finance-specific platform to support these students at scale.

## The Solution

InternshipMatch is the first product that combines all three functions into one vertical agent, built exclusively for finance recruiting:

- **Resume parsing via AI** -- Students upload a PDF; Claude Vision extracts a structured profile in seconds
- **Hybrid fit scoring** -- A 6-factor deterministic model + Claude qualitative pass ranks every opportunity with an honest, explainable score
- **Personalized recruiting timeline** -- Class-year-aware deadlines, application windows, and weekly action items
- **Application tracker** -- 12-stage pipeline from "researching" through "offer accepted" with reminders
- **Alumni networking radar** -- Surfaces school alumni at target firms with AI-drafted outreach messages
- **Interview prep coach** -- Firm-specific practice sessions with AI-evaluated answers and readiness scores

## Architecture

| Layer | Technology | Certification |
|-------|-----------|---------------|
| Frontend | Next.js 15, TypeScript | Vercel (SOC 2 Type II) |
| Backend | FastAPI, Python 3.12 | Railway (SOC 2 Type II) |
| Database & Auth | Supabase (PostgreSQL 15, GoTrue) | Supabase/AWS (SOC 2 Type II) |
| AI | Anthropic Claude API | Anthropic (SOC 2 Type II) |
| Mobile | React Native (Expo) -- iOS & Android | Same backend infrastructure |

All data stored in US (AWS us-east-1). TLS 1.2+ everywhere. AES-256 at rest. Row-Level Security on every user table. No student data is sold, shared with employers, or used to train AI models.

## Security & Privacy Posture

- **FERPA aligned** -- Operates under the school official exception with documented data handling
- **Row-Level Security** -- Students cannot see each other's data, enforced at the database level
- **Audit logging** -- All sensitive operations recorded with user, action, timestamp, and IP
- **Data minimization** -- No SSN, financial aid, disciplinary, or health data collected
- **User deletion** -- Students can delete all data at any time; 30-day complete purge
- **Anthropic AI** -- Does not train on API inputs; 30-day retention then auto-deleted

## The Ask

**1-semester pilot with one department. Free of charge. Zero risk.**

| Parameter | Detail |
|-----------|--------|
| Scope | Finance department or career services, 50-200 students |
| Duration | 1 semester (14 weeks) + 3-week evaluation |
| Cost | Waived for pilot partner |
| Success metrics | 40%+ adoption, 25%+ weekly active, NPS 30+ |
| Rollback | Full data export + permanent deletion within 30 days |
| Obligation | None. No commitment to continue after pilot. |

## Documentation Packet

This one-pager is accompanied by:

1. **Security Overview** -- Encryption, access control, incident response, backup/DR
2. **Privacy & FERPA Alignment** -- Complete data inventory, retention, deletion, subprocessors
3. **HECVAT Lite Responses** -- Pre-answered vendor security questionnaire
4. **Accessibility Statement** -- WCAG 2.1 AA target, known limitations, VPAT roadmap
5. **Pilot Implementation Plan** -- 3-phase structure with metrics, support model, and rollback
6. **Architecture Diagrams** -- System, data flow, network boundary, tenant isolation

## Contact

**Owen Ash** -- Co-founder, Bryant University Class of 2029
**Email:** security@internshipmatch.app
**Web:** internshipmatch.app
