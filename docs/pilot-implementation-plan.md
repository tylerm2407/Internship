# InternshipMatch -- Institutional Pilot Implementation Plan

**Document version:** 1.0
**Last updated:** 2026-04-20
**Prepared by:** Owen Ash, Bryant University
**Contact:** security@internshipmatch.app

---

## 1. Overview

This document provides a structured template for piloting InternshipMatch at a university. The pilot is designed as a low-risk, time-bounded evaluation that gives the institution hands-on experience with the platform before making a broader commitment.

The pilot spans one academic semester and follows three phases: technical setup, limited deployment, and evaluation.

---

## 2. Pilot Structure

```
Phase 1                Phase 2                    Phase 3
Technical Setup        Limited Pilot              Evaluate & Decide
(2-4 weeks)           (1 semester, ~14 weeks)     (2-3 weeks)

[Tenant config]  -->  [One department]  ------->  [Usage review]
[SSO setup]           [50-200 students]           [Survey results]
[Staff training]      [Metrics tracking]          [Expansion decision]
[Test accounts]       [Weekly check-ins]          [Data export or delete]
```

---

## 3. Phase 1 -- Technical Setup (Weeks 1-4)

### 3.1 Objectives

- Configure the institutional tenant
- Integrate with campus SSO (if applicable)
- Onboard pilot administrators
- Validate security and privacy controls

### 3.2 Tasks

| Task | Owner | Timeline | Details |
|------|-------|----------|---------|
| Execute Data Processing Agreement (DPA) | Institution legal + InternshipMatch | Week 1 | See `privacy-and-ferpa-alignment.md` for DPA scope |
| Provision institutional tenant | InternshipMatch | Week 1 | Assign `institution_id`, configure branding (logo, colors) |
| SSO integration (optional) | IT + InternshipMatch | Weeks 1-2 | SAML 2.0 via Supabase Auth; falls back to email/password if SSO is not available |
| Configure allowed email domains | InternshipMatch | Week 1 | Restrict signups to `@institution.edu` |
| Create admin accounts | InternshipMatch | Week 1 | 2-3 admin accounts for career services staff |
| IT security review | Institution IT | Weeks 1-3 | Review `security-overview-for-it.md`, `privacy-and-ferpa-alignment.md`, `hecvat-lite-responses.md` |
| Staff training session | InternshipMatch | Week 2 | 60-minute virtual walkthrough for career services staff |
| Create test student accounts | InternshipMatch + career services | Week 2 | 3-5 test accounts for staff to explore the product |
| Accessibility review | Institution accessibility office | Weeks 2-3 | Review `accessibility-and-vpat.md`, test with institutional assistive technology |
| Confirm go-live readiness | Both parties | Week 3-4 | Sign off on security, privacy, accessibility, and operational readiness |

### 3.3 Deliverables

- Signed DPA
- Configured tenant with SSO (or email auth)
- Admin accounts provisioned
- Staff trained and familiar with the product
- IT security review completed (or waived for pilot with conditions)

---

## 4. Phase 2 -- Limited Pilot (One Semester, ~14 Weeks)

### 4.1 Scope

| Parameter | Recommended Value |
|-----------|------------------|
| Department | Finance department or career services (single department) |
| Student count | 50-200 students |
| Class years | Sophomores and juniors (primary recruiting window) |
| Recruitment method | In-class announcement, career services email, finance club meeting |

### 4.2 Pilot Launch

| Activity | Timeline |
|----------|----------|
| Student onboarding email with signup link | Week 1 of semester |
| Optional: in-class demo (15 minutes) | Week 1-2 |
| Career services promotes via existing channels | Ongoing |

### 4.3 Support Model During Pilot

| Support Channel | Response Time | Availability |
|----------------|---------------|--------------|
| Email (security@internshipmatch.app) | 1 business day | Monday-Friday |
| Dedicated Slack channel (or Teams, per institution preference) | 4 hours during business hours | Monday-Friday, 9am-5pm ET |
| Scheduled check-in calls with career services | Weekly (30 min) | Weeks 1-8; biweekly weeks 9-14 |
| Emergency (service outage, security incident) | 1 hour | 24/7 |

### 4.4 Metrics Tracked During Pilot

InternshipMatch will collect and share the following anonymized, aggregated metrics with the institutional pilot lead on a biweekly basis:

**Engagement Metrics**

| Metric | Description |
|--------|-------------|
| Total registered users | Number of students who created accounts |
| Weekly active users (WAU) | Students who logged in at least once per week |
| Login frequency | Average logins per user per week |
| Retention rate | Percentage of users active in week N who return in week N+1 |

**Feature Usage Metrics**

| Metric | Description |
|--------|-------------|
| Resumes uploaded | Number of students who completed the upload + review flow |
| Dashboard views | Number of times the opportunity dashboard was accessed |
| Fit scores generated | Total fit scores computed |
| Applications tracked | Number of applications logged in the tracker |
| Timeline views | Number of times the recruiting timeline was accessed |
| Alumni lookups | Number of alumni networking searches |
| Prep sessions started | Number of interview prep sessions initiated |
| Prep sessions completed | Number of prep sessions with at least 5 questions answered |

**Outcome Indicators**

| Metric | Description |
|--------|-------------|
| Applications submitted (self-reported) | Students who report submitting an application to a recommended firm |
| Interview invitations (self-reported) | Students who report receiving an interview after using the platform |
| Net Promoter Score (NPS) | Collected via in-app survey at weeks 6 and 12 |

### 4.5 Biweekly Reporting

InternshipMatch will provide a one-page report every two weeks containing:

- Key metrics summary (table format)
- Trend charts (WAU, feature adoption)
- Notable student feedback themes
- Any technical issues encountered and their resolution

---

## 5. Phase 3 -- Evaluate and Decide (Weeks 15-17)

### 5.1 Evaluation Meeting

At the end of the pilot semester, InternshipMatch and the institution hold a formal evaluation meeting. Attendees should include:

- Career services director or pilot lead
- IT security representative
- Finance department representative (if department-scoped)
- InternshipMatch account lead

### 5.2 Evaluation Criteria

| Criterion | Target for Expansion | Measurement |
|-----------|---------------------|-------------|
| Adoption rate | 40%+ of eligible students registered | Registration count / eligible population |
| Weekly active usage | 25%+ of registered users active weekly by end of pilot | WAU / total registered |
| Resume upload completion | 60%+ of registered users completed upload + review | Upload count / registered |
| Feature breadth | Average user engaged with 3+ features | Feature usage logs |
| Student satisfaction | NPS of 30+ | In-app survey |
| IT/security concerns | No unresolved critical or high issues | IT review log |
| Accessibility concerns | No unresolved accessibility barriers reported | Accessibility issue log |

### 5.3 Decision Options

| Decision | Criteria | Next Steps |
|----------|----------|------------|
| **Expand** | Meets or exceeds targets | Negotiate institution-wide contract, onboard additional departments |
| **Extend pilot** | Promising but insufficient data | Run one more semester with same or expanded scope |
| **Decline** | Does not meet targets or unresolved concerns | Execute rollback plan (Section 6) |

---

## 6. Rollback Plan

If the institution decides not to continue after the pilot:

| Step | Timeline | Details |
|------|----------|---------|
| Notify students | Within 5 business days of decision | Email notification with export instructions |
| Student data export window | 30 days | Students can export their profiles, scores, and application records (JSON) |
| Data deletion | 30 days after export window closes | All student data, resume PDFs, and institutional configuration permanently deleted |
| Deletion confirmation | Within 5 business days of deletion | Written confirmation sent to institutional contact |
| DPA termination | Concurrent with deletion | DPA terminates upon confirmation of data deletion |

No student data is retained by InternshipMatch after the rollback process completes.

---

## 7. Pricing During Pilot

Pilot pricing is negotiated on a per-institution basis. Standard pilot terms:

| Item | Pilot Term |
|------|-----------|
| Duration | 1 semester (14-16 weeks) |
| Student cap | Up to 200 students |
| Cost | Reduced or waived for initial pilot partners |
| Commitment | No obligation to continue after pilot |
| Expansion pricing | Discussed during Phase 3 evaluation if targets are met |

---

## 8. Timeline Summary

| Week | Phase | Key Activities |
|------|-------|---------------|
| 1-2 | Setup | DPA signed, tenant configured, SSO integrated, admin accounts created |
| 3-4 | Setup | Staff training, test accounts, security review, go-live readiness |
| 5 | Pilot | Student onboarding, launch communications |
| 5-10 | Pilot | Active usage, weekly check-ins, biweekly metrics reports |
| 11 | Pilot | Mid-pilot survey (NPS), interim review call |
| 11-18 | Pilot | Continued usage, biweekly reports |
| 18 | Pilot | End-of-pilot survey (NPS), final metrics pull |
| 19-20 | Evaluate | Evaluation meeting, decision |
| 21-24 | Post-pilot | Expand, extend, or rollback |

---

## 9. Points of Contact

| Role | Name | Email |
|------|------|-------|
| InternshipMatch -- Product | Owen Ash | security@internshipmatch.app |
| Institution -- Pilot Lead | TBD | TBD |
| Institution -- IT Security | TBD | TBD |
| Institution -- Career Services | TBD | TBD |

---

## 10. Appendix: Institutional Checklist

Use this checklist to track pilot readiness:

- [ ] DPA executed
- [ ] IT security review of `security-overview-for-it.md` completed
- [ ] Privacy review of `privacy-and-ferpa-alignment.md` completed
- [ ] Accessibility review of `accessibility-and-vpat.md` completed
- [ ] HECVAT Lite review of `hecvat-lite-responses.md` completed
- [ ] SSO integration tested (or email auth confirmed)
- [ ] Admin accounts created and tested
- [ ] Staff training completed
- [ ] Student communication drafted and approved
- [ ] Metrics reporting schedule confirmed
- [ ] Evaluation criteria and targets agreed upon
- [ ] Go-live date confirmed
