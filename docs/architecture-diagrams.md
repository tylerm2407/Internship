# InternshipMatch -- Architecture Diagrams

**Document version:** 1.0
**Last updated:** 2026-04-20
**Prepared by:** Owen Ash, Bryant University
**Contact:** security@internshipmatch.app

---

## 1. High-Level System Architecture

This diagram shows the major components of InternshipMatch and how they connect.

```mermaid
flowchart TB
    subgraph Client["Client (Browser)"]
        FE["Next.js 15 Frontend<br/>TypeScript, Tailwind, shadcn/ui"]
    end

    subgraph Vercel["Vercel (CDN + Edge)"]
        EDGE["Edge Network<br/>Static Assets + SSR"]
    end

    subgraph Railway["Railway (Backend)"]
        API["FastAPI Backend<br/>Python 3.12, Pydantic v2"]
        CRON["Nightly Scraper<br/>Railway Cron"]
    end

    subgraph Supabase["Supabase (Data Layer)"]
        AUTH["GoTrue Auth<br/>JWT Issuance"]
        DB["PostgreSQL 15<br/>RLS Enabled"]
        STORE["Storage (S3)<br/>Resume PDFs"]
    end

    subgraph Anthropic["Anthropic (AI)"]
        CLAUDE["Claude API<br/>claude-sonnet-4-5"]
    end

    subgraph External["External Sources"]
        CAREERS["Firm Career Pages<br/>Goldman, JPM, etc."]
    end

    FE -->|HTTPS| EDGE
    EDGE -->|HTTPS| API
    FE -->|HTTPS| AUTH
    API -->|TLS| DB
    API -->|TLS| STORE
    API -->|HTTPS| CLAUDE
    CRON -->|TLS| DB
    CRON -->|HTTPS| CAREERS
    AUTH -->|Internal| DB
```

---

## 2. Data Flow Diagram

This diagram traces how student data flows through the system, from upload to dashboard.

```mermaid
flowchart LR
    subgraph Student
        USER["Student"]
    end

    subgraph Frontend
        UPLOAD["Resume Upload Page"]
        REVIEW["Profile Review + Edit"]
        DASH["Dashboard"]
        TIMELINE["Timeline"]
        TRACKER["Application Tracker"]
        ALUMNI["Alumni Finder"]
        PREP["Interview Prep"]
    end

    subgraph Backend
        PARSER["Resume Parser"]
        SCORER["Fit Scoring Engine"]
        TIMELINE_GEN["Timeline Generator"]
        ALUMNI_SVC["Alumni Service"]
        PREP_SVC["Prep Coach"]
    end

    subgraph Supabase
        DB["PostgreSQL<br/>(profiles, scores,<br/>applications, firms)"]
        STORAGE["Storage<br/>(resume PDFs)"]
    end

    subgraph Anthropic
        CLAUDE["Claude API"]
    end

    USER -->|1. Upload PDF| UPLOAD
    UPLOAD -->|2. PDF file| STORAGE
    UPLOAD -->|3. Parse request| PARSER
    PARSER -->|4. PDF text| CLAUDE
    CLAUDE -->|5. Structured profile| PARSER
    PARSER -->|6. Parsed fields| REVIEW
    USER -->|7. Review + correct| REVIEW
    REVIEW -->|8. Save profile| DB

    DB -->|9. Profile + firms| SCORER
    SCORER -->|10. Top 30 candidates| CLAUDE
    CLAUDE -->|11. Qualitative scores| SCORER
    SCORER -->|12. Final scores| DB
    DB -->|13. Ranked opportunities| DASH

    DB -->|14. Class year + targets| TIMELINE_GEN
    TIMELINE_GEN -->|15. Calendar events| TIMELINE

    DB -->|16. Target firms| ALUMNI_SVC
    ALUMNI_SVC -->|17. Draft outreach| CLAUDE
    ALUMNI_SVC -->|18. Alumni + messages| ALUMNI

    USER -->|19. Practice answer| PREP_SVC
    PREP_SVC -->|20. Evaluate answer| CLAUDE
    CLAUDE -->|21. Feedback| PREP_SVC
    PREP_SVC -->|22. Score + feedback| PREP
```

### Data Flow Notes

| Step | Data Involved | Encryption | Persisted? |
|------|-------------|-----------|-----------|
| 1-2 | Resume PDF | TLS in transit, AES-256 at rest | Yes (Supabase Storage) |
| 3-5 | Resume text | TLS in transit | No (transient in Anthropic, deleted after 30 days) |
| 6-8 | Parsed profile (name, GPA, coursework, etc.) | TLS in transit, AES-256 at rest | Yes (PostgreSQL) |
| 9-12 | Profile fields + fit scores | TLS in transit, AES-256 at rest | Yes (PostgreSQL) |
| 10-11 | Profile summary for qualitative scoring | TLS in transit | No (transient in Anthropic) |
| 17 | Alumni info + student profile for outreach draft | TLS in transit | No (transient in Anthropic) |
| 19-21 | Practice answers + feedback | TLS in transit | Feedback persisted; raw answers optional |

---

## 3. Network Boundary Diagram

This diagram shows the trust boundaries: what is publicly accessible, what is private, and how traffic flows between zones.

```mermaid
flowchart TB
    subgraph Public["Public Internet"]
        BROWSER["Student Browser"]
        CRAWLED["Firm Career Pages"]
    end

    subgraph DMZ["Public Endpoints (HTTPS Only)"]
        VERCEL["Vercel Edge<br/>internshipmatch.app<br/>Static + SSR"]
        RAILWAY_API["Railway<br/>api.internshipmatch.app<br/>FastAPI"]
        SUPABASE_AUTH["Supabase Auth<br/>*.supabase.co/auth<br/>Login + JWT"]
    end

    subgraph Private["Private / Server-Only"]
        SUPABASE_DB["Supabase PostgreSQL<br/>Direct connection<br/>Not publicly exposed"]
        SUPABASE_STORAGE["Supabase Storage<br/>Signed URLs only<br/>No public listing"]
        ANTHROPIC_API["Anthropic API<br/>api.anthropic.com<br/>Server-to-server only"]
        RAILWAY_CRON["Railway Cron<br/>Nightly scraper<br/>No public endpoint"]
    end

    BROWSER -->|HTTPS| VERCEL
    BROWSER -->|HTTPS| SUPABASE_AUTH
    VERCEL -->|HTTPS| RAILWAY_API
    RAILWAY_API -->|TLS| SUPABASE_DB
    RAILWAY_API -->|TLS| SUPABASE_STORAGE
    RAILWAY_API -->|HTTPS| ANTHROPIC_API
    RAILWAY_CRON -->|HTTPS| CRAWLED
    RAILWAY_CRON -->|TLS| SUPABASE_DB

    style Public fill:#fff3e0,stroke:#e65100
    style DMZ fill:#e3f2fd,stroke:#1565c0
    style Private fill:#e8f5e9,stroke:#2e7d32
```

### Boundary Rules

| Component | Publicly Accessible? | Authentication Required? | Notes |
|-----------|---------------------|-------------------------|-------|
| Vercel (frontend) | Yes | No (static assets); Yes (app pages redirect to login) | Landing page is public; all app routes require auth |
| Railway API | Yes (HTTPS endpoint) | Yes (Supabase JWT required on all routes) | CORS restricted to frontend domain |
| Supabase Auth | Yes (auth endpoints) | N/A (this is the auth service) | Rate-limited by Supabase |
| Supabase PostgreSQL | No | Yes (connection string + RLS) | Only accessible from Railway backend |
| Supabase Storage | No (no public listing) | Yes (signed URLs generated server-side) | Resume PDFs require authenticated, time-limited URLs |
| Anthropic API | No | Yes (API key, server-side only) | API key never exposed to browser |
| Railway Cron | No | N/A (internal process) | No public endpoint; runs on schedule |

### Key Security Boundaries

1. **The Supabase service role key never leaves the backend.** It is stored as a Railway environment variable and used only for server-side operations.
2. **The Anthropic API key never leaves the backend.** All Claude API calls are made server-to-server.
3. **Resume PDFs are not publicly accessible.** Access requires a signed URL generated by the backend after verifying the requesting user owns the file.
4. **The scraper has no public endpoint.** It runs as an internal cron job and writes directly to the database.

---

## 4. Tenant Isolation Diagram (Future State)

InternshipMatch is designed for multi-tenant operation when serving multiple institutions. This diagram shows the planned isolation model using an `institution_id` column.

```mermaid
flowchart TB
    subgraph Institutions
        INST_A["Institution A<br/>(e.g., Bryant University)"]
        INST_B["Institution B<br/>(e.g., Boston College)"]
        INST_C["Institution C<br/>(e.g., Northeastern)"]
    end

    subgraph Auth["Authentication Layer"]
        SSO_A["SSO / Email Auth<br/>institution_id = A"]
        SSO_B["SSO / Email Auth<br/>institution_id = B"]
        SSO_C["SSO / Email Auth<br/>institution_id = C"]
    end

    subgraph Database["PostgreSQL (Shared Database, Isolated Rows)"]
        PROFILES["student_profiles<br/>institution_id column<br/>RLS: users see only own institution"]
        SCORES["fit_scores<br/>institution_id column<br/>RLS: users see only own rows"]
        APPS["applications<br/>institution_id column<br/>RLS: users see only own rows"]
        ALUMNI["alumni<br/>institution_id column<br/>RLS: filtered by institution"]
    end

    subgraph Admin["Institutional Admin Portal (Future)"]
        ADMIN_A["Admin Dashboard A<br/>Aggregated metrics<br/>No individual student data"]
        ADMIN_B["Admin Dashboard B"]
        ADMIN_C["Admin Dashboard C"]
    end

    INST_A --> SSO_A --> PROFILES
    INST_B --> SSO_B --> PROFILES
    INST_C --> SSO_C --> PROFILES

    PROFILES --> SCORES
    PROFILES --> APPS
    PROFILES --> ALUMNI

    ADMIN_A -.->|Aggregated only| PROFILES
    ADMIN_B -.->|Aggregated only| PROFILES
    ADMIN_C -.->|Aggregated only| PROFILES
```

### Isolation Model Details

| Layer | Isolation Method | Status |
|-------|-----------------|--------|
| Authentication | Email domain restriction or SAML SSO per institution | Current: email domain; Future: SAML |
| Database rows | `institution_id` foreign key on all user-owned tables | Future (single-tenant for pilot) |
| Row-Level Security | RLS policies filter by `institution_id` AND `user_id` | Future (current RLS filters by `user_id` only) |
| Storage | Resume PDFs stored with `institution_id` prefix in path | Future |
| Admin access | Institution admins see only their institution's aggregated data | Future |
| Firm database | Shared across all institutions (firms are not institution-specific) | Current |
| Scraper data | Shared across all institutions (postings are public) | Current |

### Cross-Tenant Data Guarantees

- No student at Institution A can view, search, or infer the existence of students at Institution B
- Institutional admins cannot access individual student records (only aggregated, de-identified metrics)
- Alumni data is filtered by institution; no cross-institution alumni browsing
- Fit scores and application records are fully isolated per user and per institution
- The shared firm and postings tables contain no student data and pose no isolation risk

---

## 5. Diagram Rendering

All diagrams in this document use [Mermaid](https://mermaid.js.org/) syntax. They can be rendered in:

- GitHub (native Mermaid support in Markdown)
- VS Code (with the Mermaid preview extension)
- [Mermaid Live Editor](https://mermaid.live/)
- Any documentation platform that supports Mermaid (Notion, Confluence, etc.)
