# InternshipMatch -- Accessibility Statement and VPAT Roadmap

**Document version:** 1.0
**Last updated:** 2026-04-20
**Prepared by:** Owen Ash, Bryant University
**Contact:** accessibility@internshipmatch.app

---

## 1. Commitment

InternshipMatch is committed to providing an accessible experience for all students, including those with disabilities. We are working toward conformance with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA, published by the World Wide Web Consortium (W3C).

This document describes our current accessibility implementation, known limitations, testing approach, and roadmap toward a complete Voluntary Product Accessibility Template (VPAT).

---

## 2. Conformance Target

| Standard | Level | Status |
|----------|-------|--------|
| WCAG 2.1 | Level A | Substantially conformant |
| WCAG 2.1 | Level AA | Partially conformant (in progress) |
| WCAG 2.1 | Level AAA | Not targeted at this time |
| Section 508 | Applicable criteria | Aligned with WCAG 2.1 AA target |

**Definition of conformance levels used in this document:**

- **Supports:** The functionality of the product has at least one method that meets the criterion without known defects or meets with equivalent facilitation.
- **Partially supports:** Some functionality of the product does not meet the criterion.
- **Does not support:** The majority of product functionality does not meet the criterion.
- **Not applicable:** The criterion is not relevant to the product.

---

## 3. Current Implementation

### 3.1 Semantic HTML

All pages are built with semantic HTML5 elements:

- `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>` used for page structure
- Heading hierarchy (`<h1>` through `<h4>`) is logically ordered on every page
- Form inputs use associated `<label>` elements
- Data tables use `<th>` with `scope` attributes
- Lists use `<ul>`, `<ol>`, and `<li>` for grouped content

### 3.2 ARIA Support via shadcn/ui

The frontend uses shadcn/ui components, which are built on Radix UI primitives. These provide:

- Proper ARIA roles, states, and properties on interactive components (dialogs, dropdowns, tabs, tooltips)
- `aria-expanded`, `aria-selected`, `aria-checked`, and `aria-disabled` states managed automatically
- `aria-live` regions for dynamic content updates (e.g., fit score loading, form validation messages)
- `role="alert"` for error messages
- `aria-label` and `aria-describedby` on icon-only buttons and complex controls

### 3.3 Keyboard Navigation

- All interactive elements (buttons, links, form fields, dropdowns, modals) are reachable via Tab key
- Focus order follows the visual reading order (left-to-right, top-to-bottom)
- Focus is visually indicated with a visible outline (not suppressed via `outline: none`)
- Modal dialogs trap focus and return focus to the trigger element on close
- Escape key closes modals and dropdowns
- Arrow keys navigate within component groups (tabs, radio groups, dropdown menus)

### 3.4 Language Attribute

The `<html>` element includes `lang="en"` on all pages, enabling screen readers to use the correct pronunciation engine.

### 3.5 Color and Contrast

- Primary text (`#0A0A0A`) on background (`#FAFAFA`) achieves a contrast ratio of approximately 19.2:1 (exceeds AA requirement of 4.5:1)
- Secondary text (`#6B6B6B`) on background (`#FAFAFA`) achieves a contrast ratio of approximately 4.8:1 (meets AA requirement of 4.5:1)
- Accent color (`#0B2545` deep navy) on white background achieves a contrast ratio of approximately 14.5:1
- Color is never the sole means of conveying information (e.g., form errors include text labels, not just red borders)

### 3.6 Text Resizing

- The application uses relative units (`rem`) for font sizes
- Content remains functional and readable when browser text size is increased to 200%
- No horizontal scrolling is required at 200% zoom on a 1280px viewport

### 3.7 Motion and Animation

- The application uses minimal animation (CSS transitions under 200ms for hover states)
- No auto-playing video or audio content
- No flashing content that could trigger photosensitive reactions

---

## 4. Known Limitations

The following areas have been identified as needing improvement and are on the accessibility roadmap:

| Area | Limitation | WCAG Criteria | Remediation Plan |
|------|-----------|---------------|-----------------|
| Resume upload | Drag-and-drop zone lacks full screen reader announcement of upload status | 4.1.3 Status Messages | Add `aria-live="polite"` region for upload progress |
| Fit score charts | Score visualization relies partially on color | 1.4.1 Use of Color | Add text labels and patterns to all chart elements |
| Timeline view | Calendar component keyboard navigation is incomplete for month/year switching | 2.1.1 Keyboard | Implement full keyboard support for date navigation |
| PDF viewer | Inline resume preview may not be fully accessible | 1.1.1 Non-text Content | Provide text alternative alongside PDF preview |
| Error messages | Some validation errors are not programmatically associated with their fields | 1.3.1 Info and Relationships | Add `aria-describedby` linking errors to inputs |

**No formal third-party accessibility audit has been completed.** The limitations above were identified through internal testing. A formal audit is planned (see Section 7).

---

## 5. Testing Approach

### 5.1 Automated Testing

| Tool | What It Tests | Frequency |
|------|-------------|-----------|
| axe-core (via browser extension) | WCAG violations, ARIA misuse, contrast issues | Every major UI change |
| Lighthouse Accessibility audit | WCAG conformance scoring, best practices | Every deployment |
| ESLint jsx-a11y plugin | Missing alt text, invalid ARIA, form label issues | Every build (CI) |

### 5.2 Manual Testing

| Method | What It Tests | Frequency |
|--------|-------------|-----------|
| Keyboard-only navigation | Tab order, focus visibility, keyboard traps | Monthly |
| Screen reader spot checks (NVDA on Windows, VoiceOver on macOS) | Content readability, ARIA announcements, form usability | Quarterly |
| Browser zoom (200%) | Layout integrity, text readability | Monthly |
| High contrast mode (Windows) | Visibility of borders, focus indicators, icons | Quarterly |

### 5.3 Test Coverage by Page

| Page | Automated | Keyboard | Screen Reader |
|------|-----------|----------|---------------|
| Homepage / Landing | Yes | Yes | Yes |
| Login / Signup | Yes | Yes | Yes |
| Resume Upload | Yes | Yes | Partial |
| Dashboard | Yes | Yes | Partial |
| Opportunity Detail | Yes | Yes | Not yet |
| Timeline | Yes | Partial | Not yet |
| Application Tracker | Yes | Yes | Not yet |
| Alumni / Networking | Yes | Yes | Not yet |
| Interview Prep | Yes | Partial | Not yet |

---

## 6. Reporting Accessibility Issues

If you encounter an accessibility barrier while using InternshipMatch, please contact us:

**Email:** accessibility@internshipmatch.app

When reporting an issue, please include:

- The page or feature where you encountered the barrier
- The assistive technology you were using (e.g., screen reader name and version)
- A description of what you expected to happen and what actually happened
- Your browser and operating system

**Response commitment:** We will acknowledge accessibility reports within 2 business days and provide an estimated remediation timeline within 10 business days.

---

## 7. Roadmap to Full VPAT

| Milestone | Target Date | Description |
|-----------|------------|-------------|
| Internal accessibility audit | Q3 2026 | Systematic page-by-page review against WCAG 2.1 AA criteria |
| Remediate known limitations | Q3 2026 | Address all items in Section 4 |
| Third-party accessibility audit | Q4 2026 | Engage an independent accessibility firm to conduct a formal audit |
| Publish VPAT (Revised Section 508) | Q1 2027 | Complete Voluntary Product Accessibility Template based on audit results |
| Ongoing monitoring | Continuous | Integrate accessibility checks into CI/CD pipeline, quarterly manual reviews |

### 7.1 VPAT Format

The VPAT will follow the ITI VPAT 2.5 Revised Section 508 Edition format, covering:

- WCAG 2.1 Level A and AA success criteria
- Revised Section 508 functional performance criteria
- Documentation of conformance level for each criterion
- Remarks and explanations for partially supported criteria

---

## 8. Third-Party Component Accessibility

| Component | Provider | Accessibility Notes |
|-----------|----------|-------------------|
| shadcn/ui (Radix UI) | Open source | Built on WAI-ARIA patterns, tested with major screen readers |
| Supabase Auth UI | Supabase | Standard form components with label support |
| Vercel hosting | Vercel | No impact on application-level accessibility |

---

## 9. Applicable Standards Reference

- [WCAG 2.1](https://www.w3.org/TR/WCAG21/) -- Web Content Accessibility Guidelines
- [Section 508 of the Rehabilitation Act](https://www.section508.gov/) -- US federal accessibility requirements
- [ADA Title II and III](https://www.ada.gov/) -- Americans with Disabilities Act
- [ITI VPAT 2.5](https://www.itic.org/policy/accessibility/vpat) -- Voluntary Product Accessibility Template
