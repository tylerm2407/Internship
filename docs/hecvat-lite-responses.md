# InternshipMatch -- HECVAT Lite Pre-Answered Responses

**Document version:** 1.0
**Last updated:** 2026-04-20
**Prepared by:** Owen Ash, Bryant University
**Contact:** security@internshipmatch.app

---

## About This Document

The Higher Education Community Vendor Assessment Toolkit (HECVAT) Lite is a standardized questionnaire used by universities to evaluate the security posture of third-party vendors. This document provides pre-answered responses to the HECVAT Lite domains to streamline institutional security reviews.

For detailed supporting documentation, refer to:

- `security-overview-for-it.md` -- Full security posture
- `privacy-and-ferpa-alignment.md` -- Privacy and FERPA details
- `accessibility-and-vpat.md` -- Accessibility conformance
- `architecture-diagrams.md` -- System architecture and data flows
- `pilot-implementation-plan.md` -- Deployment and rollback procedures

---

## Domain 1: Company Information

| Question | Response |
|----------|----------|
| Company name | InternshipMatch |
| Company website | internshipmatch.app |
| Primary contact name | Owen Ash |
| Primary contact email | security@internshipmatch.app |
| Company headquarters location | Bryant University, Smithfield, RI, USA |
| Year founded | 2026 |
| Number of employees | 2 (co-founders; see note below) |
| Product/service name | InternshipMatch |
| Product description | AI-powered recruiting agent for undergraduate business students targeting finance internships. Provides resume parsing, opportunity matching, fit scoring, timeline planning, application tracking, alumni networking, and interview preparation. |
| Does the product handle regulated data (FERPA, HIPAA, PCI, etc.)? | Yes -- FERPA-covered student education records (GPA, coursework, academic history). See `privacy-and-ferpa-alignment.md`. |
| Is the product hosted or on-premises? | Hosted (SaaS). No on-premises deployment option. |

**Note on company size:** InternshipMatch is an early-stage product built by two co-founders. Institutional partners should factor this into their risk assessment. The technical architecture compensates by relying entirely on mature, SOC 2-certified managed infrastructure providers (Supabase, Vercel, Railway, Anthropic) rather than self-managed servers, which significantly reduces operational bus-factor risk.

---

## Domain 2: Documentation and Policies

| Question | Response |
|----------|----------|
| Do you have a written information security policy? | Yes. Security controls are documented in `security-overview-for-it.md`. A formal Information Security Policy document is planned for Q4 2026. |
| Do you have a written privacy policy? | Yes. Privacy practices and FERPA alignment are documented in `privacy-and-ferpa-alignment.md`. A public-facing privacy policy is published at internshipmatch.app/privacy. |
| Do you have an acceptable use policy? | Yes. Terms of service are published at internshipmatch.app/terms. |
| Do you have a data classification policy? | Student data is classified as confidential. Infrastructure logs are classified as internal. Firm and posting data is classified as public. Formal classification policy document planned for Q4 2026. |
| Do you have a change management process? | Yes. All code changes go through Git version control with pull request review. Database schema changes require migrations checked into version control. No direct production database edits. |
| Do you have a vendor/subprocessor management process? | Yes. Subprocessors are listed in `security-overview-for-it.md` Section 9. Institutional partners are notified 30 days before adding subprocessors that handle student data. |
| Will you sign a Data Processing Agreement (DPA)? | Yes. Contact security@internshipmatch.app. See `privacy-and-ferpa-alignment.md` Section 9. |
| Will you sign a FERPA Business Associate Agreement or school official designation? | Yes. InternshipMatch will operate as a school official under the school official exception. See `privacy-and-ferpa-alignment.md` Section 3. |

---

## Domain 3: Access Control

| Question | Response |
|----------|----------|
| How are users authenticated? | Supabase Auth (GoTrue) issuing signed JWTs. Email/password with bcrypt hashing. SAML SSO integration available for institutional deployments. |
| Do you support Single Sign-On (SSO)? | Yes. SAML 2.0 is supported via Supabase Auth. SSO integration is configured during the pilot setup phase (Phase 1, weeks 1-2) in coordination with the institution's IdP team. See `pilot-implementation-plan.md`. |
| Do you support Multi-Factor Authentication (MFA)? | Supabase Auth supports TOTP-based MFA. MFA can be enabled per institution. |
| How is authorization enforced? | Row-Level Security (RLS) on all user-owned PostgreSQL tables. Users can only access their own data. No cross-user data access is possible through the API. |
| How are administrative accounts managed? | Service role keys are stored as encrypted environment variables on Railway. They are never exposed to the frontend. Admin database access is restricted to the founder via Supabase dashboard with MFA enabled. |
| How are API keys and secrets managed? | Stored as encrypted environment variables in Railway (backend) and Vercel (frontend, anon key only). Never committed to version control. The `.env` file is in `.gitignore`. |
| Do you implement least-privilege access? | Yes. The frontend uses the Supabase `anon` key (no elevated privileges). The `service_role` key is used only by the backend for specific server-side operations. RLS further restricts data access to row owners. |
| Is there session timeout? | Yes. Access tokens expire after 1 hour. Refresh tokens rotate on use. |

---

## Domain 4: Encryption

| Question | Response |
|----------|----------|
| Is data encrypted in transit? | Yes. All connections use TLS 1.2 or higher. HTTPS is enforced on all public endpoints. HTTP is redirected to HTTPS. |
| Is data encrypted at rest? | Yes. AES-256 encryption via AWS KMS for PostgreSQL (Supabase) and S3 (Supabase Storage). Automatic key rotation managed by AWS. |
| Are backups encrypted? | Yes. Supabase backups are encrypted at rest using the same AES-256 encryption as the primary database. |
| What TLS versions are supported? | TLS 1.2 and TLS 1.3. TLS 1.0 and 1.1 are not supported. |
| Are cryptographic keys managed securely? | Yes. Encryption keys are managed by AWS KMS with automatic rotation. Application-level secrets are stored in encrypted environment variables, never in code. |

---

## Domain 5: Data Handling

| Question | Response |
|----------|----------|
| What categories of data are collected? | Student profile information (name, email, university, class year, major, GPA, coursework, work experience, skills), resume PDFs, fit scores, application records, prep session data. See `privacy-and-ferpa-alignment.md` Section 2 for complete inventory. |
| Where is data stored geographically? | United States. Supabase runs on AWS us-east-1. Railway and Vercel use US regions. Anthropic processes data in the US. |
| Is data shared with third parties? | Only with subprocessors listed in `security-overview-for-it.md` Section 9 (Supabase, Anthropic, Railway, Vercel). Data is never sold, shared with advertisers, or used for purposes beyond service delivery. |
| Is student data used to train AI models? | No. Anthropic does not train on API data per their Terms of Service. InternshipMatch does not train any models on student data. |
| What is the data retention period? | User data: account lifetime + 30 days. Application logs: 90 days. Backups: 30 days. Anthropic API data: 30 days (Anthropic-managed). See `privacy-and-ferpa-alignment.md` Section 5. |
| Can data be exported? | Yes. Students can export their complete profile, scores, and application records in JSON format. Institutions can request bulk export upon contract termination. |
| Can data be deleted on request? | Yes. User-initiated, admin-initiated, and contract-termination deletion processes are documented in `privacy-and-ferpa-alignment.md` Section 6. Deletion completes within 30 days. |
| Is there a data minimization practice? | Yes. Only data necessary for career preparation functions is collected. No SSN, financial aid, disciplinary, health, or tracking data is collected. See `privacy-and-ferpa-alignment.md` Section 7. |

---

## Domain 6: Business Continuity

| Question | Response |
|----------|----------|
| Do you have a business continuity plan? | Yes. The stateless architecture (Vercel frontend, Railway backend) allows rapid redeployment from Git. All persistent data is in Supabase with automated backups. |
| Do you have a disaster recovery plan? | Yes. See `security-overview-for-it.md` Section 7. RPO < 1 hour (PITR), RTO < 4 hours. |
| How often are backups performed? | Daily automated backups via Supabase. Continuous point-in-time recovery (WAL archiving) with 7-day retention. |
| How often are backups tested? | Backup restoration is tested quarterly. PITR recovery is validated during testing. |
| What is your uptime SLA? | Dependent on upstream providers: Supabase (99.9%), Vercel (99.99%), Railway (99.9%). InternshipMatch targets 99.5% uptime for the overall service. |
| Do you have geographic redundancy? | Supabase runs on AWS with cross-AZ redundancy within us-east-1. Vercel uses a global edge network. Railway provides auto-restart on failure. Full multi-region failover is not currently implemented. |

---

## Domain 7: Incident Response

| Question | Response |
|----------|----------|
| Do you have an incident response plan? | Yes. Documented in `security-overview-for-it.md` Section 6. Covers detection, triage, containment, notification, and remediation. |
| How quickly will you notify the institution of a breach? | Within 72 hours of confirming a breach involving student data. Critical incidents (confirmed unauthorized access) within 24 hours. |
| How can incidents be reported to you? | Email security@internshipmatch.app. Monitored daily. |
| Do you have severity classifications for incidents? | Yes. Four levels: Critical (1-hour response), High (4-hour), Medium (24-hour), Low (72-hour). See `security-overview-for-it.md` Section 6.1. |
| Do you conduct post-incident reviews? | Yes. Every Critical and High incident includes a post-incident review with root cause analysis, remediation steps, and documentation updates. |
| Have you experienced any data breaches? | No. InternshipMatch has not experienced any data breaches as of the date of this document. |

---

## Domain 8: Vulnerability Management

| Question | Response |
|----------|----------|
| Do you perform vulnerability scanning? | Infrastructure-level scanning is performed by Supabase, Vercel, and Railway. Application-level automated dependency scanning (Dependabot/Snyk) is planned for Q3 2026. |
| Do you perform penetration testing? | Not yet. Third-party penetration testing is planned for Q4 2026. |
| How are security patches applied? | Infrastructure patches are applied automatically by Supabase, Vercel, and Railway. Application dependencies are version-pinned and updated promptly when security advisories are published. |
| Do you have a responsible disclosure policy? | Yes. Security researchers can report vulnerabilities to security@internshipmatch.app. Reports are acknowledged within 2 business days. |
| Do you use a Web Application Firewall (WAF)? | Vercel provides DDoS protection and bot mitigation at the edge. Railway provides rate limiting. A dedicated WAF is on the roadmap. |
| Are dependencies monitored for known vulnerabilities? | Currently monitored manually. Automated monitoring via Dependabot/Snyk planned for Q3 2026. |

---

## Domain 9: Additional Information

| Question | Response |
|----------|----------|
| Do you have SOC 2 certification? | Not yet. SOC 2 Type I is planned for 2027. All subprocessors (Supabase, Anthropic, Railway, Vercel) hold SOC 2 Type II. |
| Do you comply with WCAG 2.1 AA? | Partially conformant, working toward full AA conformance. See `accessibility-and-vpat.md`. |
| Can the institution audit your security practices? | Yes, with reasonable notice (30 days) and during business hours. Audit rights are included in the DPA. |
| Do you carry cyber liability insurance? | Planned for Q4 2026 as part of SOC 2 preparation. |
| What is your data portability approach? | Students can export all data in JSON format. Institutions receive a complete data export upon contract termination. No proprietary formats or vendor lock-in. |

---

## Summary of Planned Improvements

| Item | Current State | Target | Timeline |
|------|-------------|--------|----------|
| Formal Information Security Policy | Documented in vendor packet | Standalone policy document | Q4 2026 |
| Automated dependency scanning | Manual review | Dependabot or Snyk | Q3 2026 |
| Third-party penetration test | Not conducted | Annual pen test | Q4 2026 |
| SOC 2 Type I | Not certified | Certified | 2027 |
| Cyber liability insurance | Not held | Active policy | Q4 2026 |
| WCAG 2.1 AA formal audit | Internal testing only | Third-party audit | Q4 2026 |
| VPAT publication | Roadmap documented | Published VPAT | Q1 2027 |
| Dedicated WAF | Edge-level protection only | Application WAF | Q3 2026 |

---

## Document Cross-References

| HECVAT Domain | Supporting Document |
|--------------|-------------------|
| Company Info | This document, Section 1 |
| Documentation & Policies | `privacy-and-ferpa-alignment.md` |
| Access Control | `security-overview-for-it.md` Section 4 |
| Encryption | `security-overview-for-it.md` Section 3 |
| Data Handling | `privacy-and-ferpa-alignment.md` Sections 2, 5, 6, 7 |
| Business Continuity | `security-overview-for-it.md` Section 7 |
| Incident Response | `security-overview-for-it.md` Section 6 |
| Vulnerability Management | `security-overview-for-it.md` Section 8 |
| Architecture | `architecture-diagrams.md` |
| Accessibility | `accessibility-and-vpat.md` |
| Pilot Plan | `pilot-implementation-plan.md` |
