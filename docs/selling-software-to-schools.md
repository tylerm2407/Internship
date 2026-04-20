# Selling Software to Schools and Universities: A Practical Research Report

## Executive Summary
Selling software to a school or university is usually less about the demo alone and more about clearing institutional risk, compliance, procurement, and implementation hurdles. Higher-education buyers typically evaluate whether a product fits an actual campus need, protects student data, integrates with identity and campus systems, satisfies procurement and legal review, and can be supported over time.

For a small vendor or student founder, the fastest path is usually to position the product as a controlled pilot tied to a specific departmental outcome rather than as a vague campus-wide deployment. Universities often move more comfortably when a product has a clear internal sponsor, limited scope, documented security controls, and a realistic implementation plan with ownership on both sides.

## How Schools Buy Software
Schools and universities usually buy software through a multi-stakeholder process rather than a single decision-maker. Depending on the product, stakeholders can include the sponsoring department, central IT, information security, procurement, legal counsel, accessibility staff, privacy officers, and sometimes academic leadership or finance.

In higher education, the initial buyer is often not procurement but a departmental champion who sees a specific use case. That champion may help a vendor get meetings, define scope, and justify the project internally, but the deal can still stall later if security review, data privacy, budget approval, or contract redlines are not ready.

### Typical Campus Buying Flow
1. Problem identification by a department or faculty/unit sponsor.
2. Internal interest and product review, often including demos and feature validation.
3. Security, privacy, and accessibility review if the product will handle institutional data or student-facing workflows.
4. Procurement review to determine whether the purchase can be made directly, through an existing contract vehicle, or through a formal bid/RFP process.
5. Contract negotiation covering data protection, service levels, support, pricing, term, and termination rights.
6. Technical implementation, pilot, training, and go-live planning.

## What IT Will Care About Most
For an IT department, the most important question is not whether the software is innovative but whether it creates manageable institutional risk. A university IT team will typically examine where data is stored, who can access it, how users authenticate, what logs exist, how incidents are handled, whether backups and disaster recovery exist, and whether the vendor has documented controls and policies.

A product pitched as a school system integration must therefore be presented as a secure service with operational maturity, not just as an app. Even if the software is early-stage, campuses respond better when the vendor can show an architecture diagram, data flow map, role-based access controls, encryption approach, retention policy, and named incident-response process.

### Security Review Expectations
Many colleges and universities use the Higher Education Community Vendor Assessment Toolkit, or HECVAT, as a standardized vendor-security questionnaire. EDUCAUSE describes the toolkit as a common way for higher education institutions to assess cloud and technology vendors, and vendors are often expected to complete at least the Lite or Full version depending on risk level.

A HECVAT-style review can cover:
- Data classification and types of institutional data collected.
- Encryption in transit and at rest.
- Access management, least privilege, and admin controls.
- Logging, monitoring, vulnerability management, and penetration testing.
- Subprocessors and third-party dependencies such as hosting, analytics, payments, and support tools.
- Business continuity, backups, and disaster recovery.

## Privacy and Regulatory Requirements
Any product touching student records, coursework, advising data, grades, IDs, or educational records may raise FERPA issues. The U.S. Department of Education explains that FERPA protects the privacy of student education records and can apply when schools disclose personally identifiable information from those records to third-party service providers performing institutional functions.

The Department of Education's vendor guidance makes clear that a school cannot simply hand student data to a vendor without guardrails. Third-party providers acting on behalf of the institution are expected to use the data only for the authorized purpose, remain under the school's direct control regarding the use and maintenance of education records, and avoid unauthorized redisclosure.

### FERPA Implications for a SaaS Vendor
If the software will process protected student information, the vendor should be prepared to explain:
- What student data is collected and why.
- Whether the school can limit collection to the minimum necessary data.
- How the vendor contractually agrees to use data only for the institutional purpose.
- How data is deleted or returned at contract end.
- Whether any subprocessors can access the data.
- How parent/student requests, access controls, and audit logging are handled.

Beyond FERPA, higher-education institutions may also ask about GLBA when the product touches financial aid or other covered financial information. Universities such as George Washington University and University of California guidance note that higher-ed institutions are subject to GLBA safeguards obligations for certain financial information, which can affect vendor expectations around risk assessments, controls, and service-provider oversight.

## Accessibility Is Not Optional
If the software is student-facing or used in teaching, schools may require accessibility review before approval. Accessibility scrutiny is especially strong in education because institutions face legal and reputational risk if digital tools are not usable by people with disabilities.

In practice, the product should be ready to discuss WCAG conformance, keyboard navigation, screen-reader support, color contrast, captioning where relevant, accessible forms, and whether a VPAT or accessibility statement exists. Even when not formally required at the first meeting, accessibility readiness signals maturity and can prevent a deal from being blocked later.

## Identity, Integration, and Technical Architecture
Schools usually prefer products that fit into their existing identity stack rather than stand alone with separate credentials. In higher education, common enterprise login patterns include SAML-based single sign-on, with platforms such as Shibboleth and commercial identity systems like Okta widely used to federate authentication.

If the software is being presented to IT, the product should be ready to explain whether it supports SSO, what protocols it supports, how user provisioning works, what attributes are required, and how roles are mapped. Products that can work with campus identity systems reduce password sprawl and make adoption easier for IT and end users.

### Integration Questions to Expect
An IT team may ask:
- Does the product support SAML 2.0 and/or OIDC for SSO?
- Can it integrate with campus identity providers such as Shibboleth or Okta?
- Does it require direct database access, or does it use APIs?
- Can it import or sync users, courses, departments, or entitlements safely?
- What systems does it need to connect to, such as LMS, SIS, payment systems, or analytics layers?

### Backend and Database Considerations
From a campus perspective, backend architecture matters because it determines resilience and data governance. IT leaders will want to know the hosting environment, database type, geographic region of data storage, redundancy model, backup schedule, encryption approach, separation between production and development environments, and whether administrators can view plaintext sensitive data.

For a modern SaaS stack using hosted infrastructure and managed databases, the important issue is not whether the stack is trendy but whether controls are documented and enforceable. A vendor should be able to explain role-based access controls, row-level permissions if used, secrets management, environment separation, audit logging, patching responsibilities, and what happens if a dependency or subprocessor has an incident.

## Compliance Signals That Increase Trust
Many universities will not require a small pilot-stage vendor to already have every enterprise certification, but visible control maturity makes procurement easier. SOC 2 is one of the most common trust signals for SaaS companies because it provides an independent assessment framework around security-related controls, even though it is not a law and does not replace FERPA or campus-specific review.

For an early-stage vendor, the practical message is that SOC 2 may not be mandatory for the first conversation, but moving toward it can materially improve credibility. If SOC 2 is not yet complete, institutions may still proceed if the vendor can provide security policies, a completed HECVAT, architecture documentation, and evidence of implemented controls.

### Useful Trust Artifacts
A convincing vendor packet for a school IT department often includes:
- Product overview and use cases.
- Architecture diagram and data flow diagram.
- Security overview, including encryption, access control, logging, and incident response.
- Draft or completed HECVAT.
- Privacy/data handling summary with FERPA-aware language.
- Accessibility statement or VPAT status.
- Support and implementation plan.
- Pilot scope, success metrics, and rollback plan.

## Contract Terms That Matter
Even when a school likes the software, the contract stage can slow or kill the deal. Contracts with educational institutions commonly address data ownership, confidentiality, breach notification timing, data deletion or return on termination, subcontractor restrictions, audit rights, insurance, service levels, uptime expectations, limitation of liability, governing law, and pricing protections.

A student founder should expect the institution's paper to be more protective than a normal startup customer agreement. Universities may insist that institutional data remains the school's property, that the vendor not monetize or repurpose the data, and that security incidents be reported quickly under defined procedures.

### Terms to Prepare Before the Meeting
The vendor should be ready with positions on:
- Data ownership and permitted use.
- Confidentiality and information security obligations.
- Breach notification windows and cooperation duties.
- Uptime, maintenance windows, support response times, and escalation paths.
- Data retention, exportability, and deletion after termination.
- Use of subprocessors such as cloud hosting, analytics, email, or payment vendors.
- Insurance and indemnity expectations, if requested.

## Procurement, Budget, and Deal Structure
Procurement rules vary widely by institution, but many schools require different purchasing paths depending on contract size, funding source, and risk. Some deals can move through a smaller departmental purchase, while others trigger competitive bidding, sole-source justification, or formal RFP procedures.

Because of this, the easiest first contract is often a modestly scoped pilot with a clear educational purpose and limited data exposure. A narrowly defined pilot can reduce institutional friction, allow the school to test value, and create internal proof that supports a later campus-wide rollout.

### Practical Deal Structures
Common structures include:
- Departmental pilot for one course, lab, office, or small student cohort.
- Annual SaaS subscription priced by seats, department, or campus segment.
- Institution-wide enterprise agreement after a successful pilot.
- Grant-funded or innovation-backed pilot where the school tests a new tool before standard procurement at scale.

## How Other Companies Win School Contracts
Public guidance for selling into education consistently emphasizes the same pattern: vendors succeed when they solve a real problem for a specific stakeholder, map the internal decision chain, and make adoption easy for the institution. Harvard Innovation Labs advises founders to understand the buyer, their pain points, the budget owner, and the institutional context rather than leading only with product enthusiasm.

EdSurge's guidance on selling to schools similarly warns against underestimating timelines and institutional complexity. It emphasizes that vendors need patience, authentic relationship-building, and a strong understanding of how educators actually work if they want sustained adoption rather than one-off interest.

Inside Higher Ed's discussion of selling to higher education also points to the importance of understanding campus culture and incentives. Products gain traction when they align with the mission and workflow of the institution rather than asking the school to reorganize itself around the startup.

### Common Success Patterns
Across the sources, successful education-software vendors tend to:
- Start with a defined pain point and measurable outcome.
- Find an internal champion with budget influence or implementation authority.
- Offer a pilot or limited-scope rollout before asking for full deployment.
- Reduce IT burden through SSO, low-friction implementation, and clear documentation.
- Arrive prepared for privacy and security review rather than treating them as afterthoughts.
- Build trust with responsiveness, references, and operational maturity.

## What a School IT Department Will Ask in a Meeting
A realistic IT meeting often shifts quickly from product vision to operational specifics. Even if the product is compelling, technical and administrative questions usually determine whether the conversation advances.

Likely questions include:
- What problem does this solve for the school, and for whom?
- What data do you collect, and is any of it FERPA-covered or otherwise sensitive?
- Where is the data stored, and what cloud providers or subprocessors are involved?
- Do you support SSO, role-based permissions, logging, and admin controls?
- Do you have a HECVAT, security policies, penetration test results, or SOC 2 roadmap?
- How accessible is the application for students and staff with disabilities?
- What does implementation look like, and who supports it after launch?
- How much does it cost, how is it licensed, and can it begin as a pilot?

## A Founder Readiness Checklist
Before presenting to a school's IT department, a vendor should ideally have the following materials prepared.

| Area | What to have ready | Why it matters |
|---|---|---|
| Product fit | 1-page use case summary tied to a campus pain point | Schools buy solutions to institutional problems, not just interesting apps. |
| Security | Security overview, architecture diagram, incident response summary | IT must assess risk before approving integration. |
| Privacy | Data inventory, FERPA-aware handling summary, deletion policy | Student-record handling is heavily scrutinized. |
| Identity | SSO/SAML capability summary and role mapping model | Campuses prefer integration with existing identity systems. |
| Accessibility | Accessibility statement, testing notes, VPAT status if available | Accessibility issues can block adoption. |
| Contracting | Draft terms on data ownership, subprocessors, support, and breach notice | Legal review often focuses here. |
| Procurement | Pilot pricing, scope, timeline, and success metrics | Limited pilots can reduce buying friction. |
| Operations | Support model, uptime targets, and backup/recovery summary | Schools want sustainable service, not a one-time demo. |

## Recommended Strategy for the Upcoming Meeting
For a meeting in two weeks, the strongest positioning is to present the software as a low-risk pilot with a defined academic or administrative use case, not as a vague full-system replacement. That approach aligns with how universities often adopt new tools: by testing them in a bounded environment with a champion, measurable outcomes, and manageable compliance exposure.

The presentation should therefore cover five things clearly: the problem solved, the user group, the technical architecture, the risk controls, and the pilot plan. If those five areas are handled well, the discussion is more likely to move toward next steps such as security review, stakeholder introductions, or a scoped trial.

### Best Near-Term Action Plan
1. Choose one primary app or workflow to pitch first, rather than several unrelated products.
2. Define the exact user group, such as one course, one department, or one student-services function.
3. Prepare a one-page architecture and data-flow diagram showing hosting, database, authentication, and subprocessors.
4. Draft concise answers for FERPA, data retention, breach response, and access control.
5. State whether SSO is available now, on the roadmap, or not yet supported.
6. Offer a pilot with limited scope, timeline, support commitment, and success metrics.
7. Bring a list of what is already implemented versus what would need institutional input to complete.

## Bottom Line
Winning a school software contract requires product quality, but the decisive factors are usually institutional fit, trust, compliance readiness, integration feasibility, and a procurement path that feels manageable to the university. The strongest vendors do not simply sell software; they reduce perceived risk for the institution while making the path to pilot and adoption easy to understand.

For an early-stage founder, that means the goal of the first IT meeting is not necessarily to close a campus-wide deal on the spot. The practical objective is to earn the right to the next step: a sponsor-backed pilot, a formal security review, or a structured procurement conversation grounded in documented controls and a real institutional use case.
