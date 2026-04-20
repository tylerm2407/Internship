# InternshipMatch -- Privacy and FERPA Alignment

**Document version:** 1.0
**Last updated:** 2026-04-20
**Prepared by:** Owen Ash, Bryant University
**Contact:** security@internshipmatch.app

---

## 1. Purpose

This document describes how InternshipMatch collects, processes, stores, and deletes student data, and how the platform aligns with the Family Educational Rights and Privacy Act (FERPA, 20 U.S.C. 1232g). It is intended for review by institutional privacy officers, general counsel, and IT security teams evaluating InternshipMatch for campus deployment.

---

## 2. Data Inventory

The following table lists every category of student data collected by InternshipMatch, along with the purpose, source, and retention period.

| Data Field | Source | Purpose | Stored In | Retention |
|-----------|--------|---------|-----------|-----------|
| Email address | User registration | Authentication, account recovery, notifications | Supabase Auth | Account lifetime + 30 days |
| Password (hashed) | User registration | Authentication | Supabase Auth (bcrypt hash) | Account lifetime + 30 days |
| Full name | Resume upload / manual entry | Profile display, alumni outreach drafts | Supabase PostgreSQL | Account lifetime + 30 days |
| University name | Resume upload / manual entry | Firm matching, alumni network filtering | Supabase PostgreSQL | Account lifetime + 30 days |
| Class year | Resume upload / manual entry | Timeline generation, recruiting cycle alignment | Supabase PostgreSQL | Account lifetime + 30 days |
| Major(s) | Resume upload / manual entry | Fit scoring (coursework relevance factor) | Supabase PostgreSQL | Account lifetime + 30 days |
| GPA | Resume upload / manual entry | Fit scoring (GPA threshold factor) | Supabase PostgreSQL | Account lifetime + 30 days |
| Coursework list | Resume upload / manual entry | Fit scoring (technical preparation factor) | Supabase PostgreSQL | Account lifetime + 30 days |
| Work experience | Resume upload / manual entry | Fit scoring (experience relevance factor) | Supabase PostgreSQL | Account lifetime + 30 days |
| Extracurricular activities | Resume upload / manual entry | Fit scoring, profile context | Supabase PostgreSQL | Account lifetime + 30 days |
| Skills and certifications | Resume upload / manual entry | Fit scoring (skills match factor) | Supabase PostgreSQL | Account lifetime + 30 days |
| Resume PDF | User upload | AI parsing to extract structured profile | Supabase Storage | Account lifetime + 30 days |
| Fit scores | System-generated | Opportunity ranking and recommendations | Supabase PostgreSQL | Account lifetime + 30 days |
| Application records | User-entered | Status tracking, deadline reminders | Supabase PostgreSQL | Account lifetime + 30 days |
| Prep session transcripts | User-generated during practice | Interview readiness tracking | Supabase PostgreSQL | Account lifetime + 30 days |
| Application logs | System-generated | Debugging, security monitoring | Railway logs | 90 days |
| Auth event logs | System-generated | Security auditing | Supabase Auth logs | 90 days |

---

## 3. FERPA Alignment

### 3.1 Relationship to FERPA

FERPA protects education records maintained by educational agencies or institutions. InternshipMatch is a third-party service that processes student-provided data for the purpose of career preparation. When deployed by an institution, InternshipMatch operates as a **school official** under the school official exception (34 CFR 99.31(a)(1)), subject to the following conditions:

- InternshipMatch performs an institutional function (career services support)
- InternshipMatch operates under the direct control of the institution with respect to the use and maintenance of education records
- InternshipMatch is subject to the same conditions governing use and redisclosure as the institution

### 3.2 Institutional Purpose Only

Student data processed by InternshipMatch is used exclusively to provide career preparation services to the individual student. Data is:

- **Not sold** to any third party, for any reason, ever
- **Not used for advertising** or marketing to students
- **Not shared with employers or firms** in the database
- **Not used to train AI models** (see Section 4 below)
- **Not aggregated for institutional benchmarking** unless explicitly requested and contracted by the institution
- **Not disclosed to other students** -- all data is isolated per user via Row-Level Security

### 3.3 Legitimate Educational Interest

InternshipMatch processes student data solely to:

1. Parse resumes and build structured career profiles
2. Score fit against finance internship opportunities
3. Generate personalized recruiting timelines
4. Track application status and deadlines
5. Surface alumni networking opportunities
6. Provide AI-powered interview preparation

These functions fall within the scope of career services, a recognized institutional function under FERPA.

### 3.4 No Re-Disclosure

InternshipMatch does not re-disclose personally identifiable information from education records to any party other than the student and the contracting institution's authorized administrators.

---

## 4. Anthropic (Claude API) -- Subprocessor Disclosure

InternshipMatch uses Anthropic's Claude API for resume parsing, qualitative fit scoring, outreach message drafting, and interview prep evaluation. This section addresses how student data is handled by Anthropic.

### 4.1 Data Sent to Anthropic

When the AI features are invoked, the following data may be included in API requests:

- Resume text (during parsing)
- Parsed profile fields (name, GPA, coursework, experience -- during fit scoring)
- User-written practice answers (during prep coaching)

### 4.2 Anthropic's Data Commitments

Per Anthropic's API Terms of Service and data handling documentation:

| Commitment | Detail |
|-----------|--------|
| **No model training** | Anthropic does not use API inputs or outputs to train its models |
| **Retention period** | API data is retained for up to 30 days for trust and safety review, then automatically deleted |
| **Certifications** | Anthropic holds SOC 2 Type II certification |
| **Data location** | Processed in the United States |
| **Access controls** | Anthropic employees access API data only for safety review, under strict internal policies |

### 4.3 Risk Mitigation

- Resume PDFs are converted to text before being sent to Anthropic; the raw PDF file is never transmitted
- API calls include only the minimum data fields required for the specific function
- No data is cached by InternshipMatch from Anthropic responses beyond what is stored in the `fit_scores` and `prep_sessions` tables
- All API communication uses TLS 1.2+

---

## 5. Retention Windows

| Data Category | Retention Period | Trigger for Deletion |
|-------------|-----------------|---------------------|
| User account and profile | Account lifetime + 30 days | Account deletion or contract termination |
| Resume PDF | Account lifetime + 30 days | Account deletion or contract termination |
| Fit scores and application records | Account lifetime + 30 days | Account deletion or contract termination |
| Prep session data | Account lifetime + 30 days | Account deletion or contract termination |
| Application logs (Railway) | 90 days | Automatic expiration |
| Auth event logs (Supabase) | 90 days | Automatic expiration |
| Database backups (Supabase) | 30 days | Automatic rotation |
| Anthropic API data | 30 days (Anthropic-managed) | Automatic deletion by Anthropic |

The "+30 days" buffer after account deletion allows for:
- Processing any pending deletion requests
- Resolving any disputes or support tickets
- Completing backup rotation cycles

After the 30-day buffer, all user data is permanently and irrecoverably deleted.

---

## 6. Deletion Process

### 6.1 User-Initiated Deletion

Students can request deletion of their account and all associated data at any time by:

1. Using the account settings page in the application
2. Emailing security@internshipmatch.app with a deletion request

Upon receiving a valid deletion request:

- The user account is deactivated immediately
- All data in `student_profiles`, `fit_scores`, `applications`, `prep_sessions`, and `alumni` outreach records is permanently deleted within 30 days
- The resume PDF is deleted from Supabase Storage within 30 days
- The user is notified by email when deletion is complete

### 6.2 Admin-Initiated Deletion

Institutional administrators may request deletion of all student data associated with their institution by contacting security@internshipmatch.app. This is processed within 30 days.

### 6.3 Contract Termination

Upon termination of an institutional contract:

1. The institution receives a final data export (CSV or JSON) of all student records, if requested
2. All student data associated with the institution is deleted within 30 days of the termination effective date
3. A deletion confirmation certificate is provided to the institution

### 6.4 Backup Purging

Deleted data may persist in encrypted database backups for up to 30 days (the backup retention window). These backups are encrypted with AES-256 and are not accessible via the application. After the backup rotation cycle completes, the data is irrecoverable.

---

## 7. Data Minimization

InternshipMatch collects only data that is directly necessary for the career preparation functions described in Section 3.3. Specifically:

- **No Social Security numbers** are collected
- **No financial aid data** is collected
- **No disciplinary records** are collected
- **No health records** are collected
- **No demographic data** (race, ethnicity, gender, disability status) is collected unless voluntarily provided by the student for diversity program matching
- **No location tracking** or device fingerprinting is performed
- **No third-party analytics cookies** are used (no Google Analytics, no Facebook Pixel)

The resume parser extracts only the fields listed in the Data Inventory (Section 2). If a resume contains additional information (e.g., a home address), that information is not extracted or stored.

---

## 8. Parent and Student Access Rights

### 8.1 Under FERPA

- Students who are 18 or older (or attending a postsecondary institution at any age) hold FERPA rights themselves
- Students may inspect and review their education records at any time through the application's profile and data export features
- Students may request correction of inaccurate data through the profile editing interface
- Students may request deletion (see Section 6.1)

### 8.2 Data Export

Students may export their complete profile, fit scores, application records, and prep session history in JSON format through the application settings page. This supports the right to inspect and review.

### 8.3 Institutional Requests

Institutions may request access to aggregated, de-identified usage data (e.g., number of active users, feature usage rates) for program evaluation. Individually identifiable student data is not shared with institutional staff without the student's explicit consent, consistent with FERPA's protections.

---

## 9. Data Processing Agreement

InternshipMatch is prepared to execute a Data Processing Agreement (DPA) with institutional partners that includes:

- Scope of data processed and purposes
- Subprocessor list and change notification procedures
- Security obligations
- Breach notification timelines
- Data return and deletion upon termination
- Audit rights (with reasonable notice)
- FERPA school official designation

Contact security@internshipmatch.app to initiate a DPA.

---

## 10. Questions

For privacy-related questions, data subject requests, or to report a concern:

**Email:** security@internshipmatch.app
**Response time:** 2 business days for general inquiries, 24 hours for urgent matters
