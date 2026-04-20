# InternshipMatch -- Security Overview for IT

**Document version:** 1.0
**Last updated:** 2026-04-20
**Prepared by:** Owen Ash, Bryant University
**Contact:** security@internshipmatch.app

---

## 1. Executive Summary

InternshipMatch is an AI-powered recruiting agent for undergraduate business students targeting finance internships. This document describes the security posture of the platform for evaluation by institutional IT and information-security teams.

The application follows a defense-in-depth model: encrypted transport, encrypted storage, row-level access control, structured audit logging, and a defined incident-response process. All user data is processed within SOC 2-certified infrastructure.

---

## 2. Architecture Overview

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | Next.js 15, TypeScript | Vercel (US regions) |
| Backend API | FastAPI, Python 3.12 | Railway (US regions) |
| Database and Auth | Supabase (PostgreSQL 15, GoTrue Auth, Storage) | AWS us-east-1 via Supabase |
| AI Processing | Anthropic Claude API (claude-sonnet-4-5) | Anthropic infrastructure (US) |

---

## 3. Encryption

### 3.1 In Transit

All network communication uses TLS 1.2 or higher. This applies to:

- Browser to frontend (Vercel edge network, automatic HTTPS with HSTS)
- Frontend to backend API (HTTPS enforced, no plaintext endpoints)
- Backend to Supabase (TLS-encrypted PostgreSQL connections)
- Backend to Anthropic API (HTTPS with certificate pinning by the Anthropic SDK)
- Supabase inter-service communication (encrypted internal network)

HTTP requests are redirected to HTTPS at the edge. No plaintext HTTP traffic is accepted.

### 3.2 At Rest

| Data Store | Encryption Method | Key Management |
|-----------|-------------------|----------------|
| Supabase PostgreSQL | AES-256 (managed by AWS RDS) | AWS KMS, automatic key rotation |
| Supabase Storage (resume PDFs) | AES-256 (S3 server-side encryption) | AWS KMS |
| Supabase Auth tokens | Hashed with bcrypt (passwords) | N/A |
| Railway environment variables | Encrypted at rest | Railway platform-managed |
| Vercel environment variables | Encrypted at rest | Vercel platform-managed |

### 3.3 Sensitive Fields

Resume PDFs are stored in Supabase Storage, not in the database. Parsed student profile data (GPA, coursework, experience) is stored in PostgreSQL with RLS enforcement. No raw resume text is logged.

---

## 4. Access Control

### 4.1 Authentication

- User authentication is handled by Supabase Auth (GoTrue), which issues signed JWTs
- Sessions use short-lived access tokens (1 hour) with refresh token rotation
- Password requirements follow NIST 800-63B guidelines (minimum 8 characters, no composition rules, breach-list checking via Supabase)
- Future: SAML/SSO integration for institutional single sign-on

### 4.2 Authorization -- Row-Level Security (RLS)

Every user-owned table in Supabase has Row-Level Security enabled. RLS policies enforce:

- **Students** can only read and write their own rows in `student_profiles`, `fit_scores`, `applications`, and `prep_sessions`
- **No cross-user data access** is possible through the API, even if a valid JWT is presented
- The Supabase `anon` key (used by the frontend) has no elevated privileges

### 4.3 Service Role Key Isolation

The Supabase `service_role` key is used only by the backend API server. It is:

- Stored as an environment variable on Railway (encrypted at rest)
- Never shipped to the browser or included in frontend bundles
- Never committed to version control
- Used only for server-side operations that require bypassing RLS (e.g., admin batch jobs, scraper writes)

### 4.4 API Security

- All backend endpoints require a valid Supabase JWT in the `Authorization` header
- Input validation is enforced via Pydantic v2 models on every request and response
- Rate limiting is applied at the Railway infrastructure level
- CORS is restricted to the production frontend domain

---

## 5. Logging and Monitoring

### 5.1 Structured Logging

The backend uses Python's `logging` module with structured key-value output:

```
logger.info("resume.parsed", user_id=uid, fields_extracted=12)
logger.error("scraper.failed", firm_id="gs", error="timeout")
```

Logs include:

- Authentication events (login, logout, failed attempts)
- API request metadata (endpoint, method, status code, latency)
- AI API calls (model used, token count, latency -- no prompt content)
- Scraper execution results (firm, postings found, errors)
- Error traces with stack context

### 5.2 What Is Not Logged

- Resume content or parsed profile fields
- GPA, coursework, or other academic data
- Full request/response bodies containing student information
- Anthropic API prompt or completion text

### 5.3 Log Retention

- Application logs: 90 days (Railway log retention)
- Supabase database logs: 7 days (Supabase dashboard)
- Auth event logs: retained per Supabase Auth configuration

### 5.4 Monitoring

- Vercel: automatic uptime monitoring, error tracking, and deployment status
- Railway: health checks, auto-restart on failure, resource usage alerts
- Supabase: database connection monitoring, storage usage alerts

---

## 6. Incident Response Plan

### 6.1 Severity Classification

| Severity | Definition | Response Time |
|----------|-----------|---------------|
| Critical | Confirmed data breach, unauthorized access to student data | 1 hour |
| High | Suspected breach, authentication bypass, RLS failure | 4 hours |
| Medium | Service outage, scraper failure affecting all firms | 24 hours |
| Low | Single-firm scraper failure, non-security bug | 72 hours |

### 6.2 Response Process

**Phase 1 -- Detection**
- Automated alerts from infrastructure providers (Vercel, Railway, Supabase)
- Manual review of structured logs
- User-reported issues via security@internshipmatch.app

**Phase 2 -- Triage**
- Confirm the incident and classify severity
- Identify affected systems and data scope
- Assign incident owner

**Phase 3 -- Containment**
- Revoke compromised credentials or API keys
- Disable affected endpoints or features
- Isolate affected database rows if necessary

**Phase 4 -- Notification**
- Notify affected users within 72 hours of confirmed breach (sooner for Critical)
- Notify institutional partners per contractual obligations
- File required regulatory notifications (state breach notification laws)

**Phase 5 -- Remediation and Review**
- Patch the vulnerability
- Conduct post-incident review
- Update documentation and controls
- Communicate resolution to affected parties

### 6.3 Contact

Security incidents should be reported to security@internshipmatch.app. The inbox is monitored daily.

---

## 7. Backup and Disaster Recovery

### 7.1 Database Backups

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Supabase automated backups | Daily | 30 days |
| Point-in-time recovery (PITR) | Continuous (WAL archiving) | 7 days |

### 7.2 Recovery Objectives

| Metric | Target |
|--------|--------|
| Recovery Point Objective (RPO) | < 1 hour (PITR) |
| Recovery Time Objective (RTO) | < 4 hours |

### 7.3 Infrastructure Recovery

- **Frontend (Vercel):** Stateless, redeployable from Git in minutes. No data at risk.
- **Backend (Railway):** Stateless API server, redeployable from Git. No persistent data stored on Railway.
- **Database (Supabase):** All persistent data. Backups and PITR managed by Supabase/AWS.
- **Resume files (Supabase Storage):** Backed up alongside the Supabase project. S3-backed with cross-AZ redundancy.

---

## 8. Vulnerability Management

### 8.1 Current Practices

- Dependencies are version-pinned and reviewed during development
- Supabase, Vercel, and Railway apply infrastructure-level security patches automatically
- The Anthropic Python SDK is updated promptly when new versions are released

### 8.2 Roadmap

| Initiative | Target Timeline |
|-----------|----------------|
| Automated dependency scanning (Dependabot / Snyk) | Q3 2026 |
| Annual third-party penetration test | Q4 2026 |
| SOC 2 Type I preparation | 2027 |

---

## 9. Subprocessors

InternshipMatch uses the following third-party subprocessors to deliver the service. Each subprocessor handles specific categories of data as described below.

| Subprocessor | Purpose | Data Handled | Certifications | Data Location |
|-------------|---------|-------------|----------------|---------------|
| **Supabase** | Database, authentication, file storage | User accounts, student profiles, resume PDFs, application data | SOC 2 Type II | AWS us-east-1 (US) |
| **Anthropic** | AI resume parsing, fit scoring, prep coaching | Resume text (transient), student profile fields (transient) | SOC 2 Type II | US |
| **Railway** | Backend API hosting | API request metadata (transient) | SOC 2 Type II | US |
| **Vercel** | Frontend hosting and CDN | Static assets, no user data at rest | SOC 2 Type II | US (edge global) |

### 9.1 Anthropic Data Handling

Per Anthropic's API data policy:

- API inputs and outputs are **not used to train Anthropic models**
- API data is retained for up to **30 days** for trust and safety purposes, then deleted
- Anthropic holds SOC 2 Type II certification
- No student data is persisted by Anthropic beyond the 30-day safety window

### 9.2 Subprocessor Change Notification

Institutional partners will be notified at least 30 days before any new subprocessor is added that would handle student data.

---

## 10. Compliance Roadmap

| Item | Status |
|------|--------|
| TLS 1.2+ on all connections | Complete |
| AES-256 encryption at rest | Complete (via Supabase/AWS) |
| Row-Level Security on all user tables | Complete |
| Structured logging (no PII in logs) | Complete |
| Incident response plan | Documented (this document) |
| FERPA alignment | Documented (see `privacy-and-ferpa-alignment.md`) |
| WCAG 2.1 AA conformance | In progress (see `accessibility-and-vpat.md`) |
| Automated dependency scanning | Planned Q3 2026 |
| Penetration testing | Planned Q4 2026 |
| SOC 2 Type I | Planned 2027 |
