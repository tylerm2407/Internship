# ADR 0001 — Resume Upload with Claude Vision Parsing

**Status:** Accepted
**Date:** 2026-04-08
**Feature:** Resume Upload + AI Parsing
**Deciders:** Owen Ash

---

## Context

InternshipMatch needs to understand each user's academic and professional profile before it can do anything useful. Every downstream feature — fit scoring, timeline generation, alumni matching, prep coaching — depends on knowing the user's GPA, major, coursework, clubs, prior experience, and target roles. The question is how to get that information into the system.

The wrong answer is a 30-field signup form. Users abandon multi-step signup flows at a 60% clip, and a finance student has better things to do than retype their resume into text boxes. Forms also miss the qualitative stuff — the phrasing of a student's Excel modeling bullets, the specific named deals or transactions they reference, the club titles that signal SMIF membership versus general finance club attendance.

The right answer is "upload your resume, we figure out the rest." Users already have their resume in PDF form. They've already spent hours polishing it for finance recruiting. It contains every piece of information InternshipMatch needs, in a format they're comfortable sharing.

The technical question is how to get structured data out of that PDF.

---

## Decision

InternshipMatch uses Claude Vision (via `claude-sonnet-4-5`) to parse uploaded resumes. The user uploads a PDF through the homepage upload zone. The backend base64-encodes the file and sends it to Claude with a prompt specifically tuned for finance student resumes. Claude returns a strict JSON response matching the `StudentProfile` Pydantic schema.

The critical UX decision: **the parsed profile is never saved automatically.** After Claude returns its parse, the user sees an onboarding review screen with every field surfaced as an editable form. GPA, major, graduation year, coursework list, clubs, prior experience bullets — all editable. Only after the user clicks "Save profile" does InternshipMatch persist the data to Supabase.

The parser prompt includes three worked examples: a typical sophomore finance resume with some experience, a junior finance resume with an IB internship, and an edge case where a student is a double-major (Finance + Math). Temperature is 0 for deterministic parsing. The response is validated against the Pydantic schema before returning to the frontend; one retry is attempted on malformed JSON; further failures return a clean error that lets the user try again.

---

## Consequences

### Positive

- **Thirty seconds from landing page to filled profile.** Upload a PDF, review a pre-filled form, click save. No manual data entry. This matters because the alternative — a 30-field signup form — has an abandonment rate high enough to kill the product before it starts.
- **Captures qualitative detail.** Claude reads the actual bullet points from the user's experience section, not just job titles. "Built a 3-statement DCF for a $500M acquisition target" is a much stronger signal than "Investment Banking Intern" alone, and Claude preserves that signal in the parsed profile.
- **Works on any resume format.** Students use different resume templates — two-column layouts, chronological versus functional, fancy design templates, plain text. Regex-based parsing would break on anything unusual; Claude Vision handles all of them.
- **The review-and-edit step protects against hallucination.** Claude Vision sometimes misreads GPAs, guesses wrong on graduation years, or confuses club names with employers. Showing the parsed result to the user before saving turns hallucination from a silent data corruption bug into a minor inconvenience that takes 15 seconds to fix.

### Negative

- **Costs money per upload.** Each resume parse is one Claude Vision API call, roughly $0.02. At scale this adds up, but for the first thousand users it's trivial.
- **Latency is 2-4 seconds.** Users see a loading state, which is acceptable but not instant. Mitigated by an optimistic skeleton UI that shows the form structure before Claude returns.
- **Claude can hallucinate coursework.** If a student's resume mentions "finance courses including Financial Management and Investments," Claude might add FIN 201 and FIN 312 to the coursework list even though the student is actually still taking those courses. The review step catches this, but it's a real failure mode worth noting.
- **PDFs with heavy graphic design can confuse the parser.** Resumes with charts, icons, or unconventional layouts occasionally produce worse parses. Users with those resumes get a worse first impression. Flagged in the FAQ with a "use a standard PDF" recommendation.

### The review screen is not optional

I want to make this explicit because it's the most important design decision in this ADR: **there is no "skip review" option on the onboarding screen.** Every user must see the parsed profile and click through every section before saving. This is enforced at the backend level — uploaded PDFs are stored in Supabase Storage but the `student_profiles` row is not created until the user explicitly confirms via the review endpoint. Without this constraint, hallucinated data would flow silently into the fit scoring system and poison every downstream feature.

---

## Alternatives Considered

**Manual form with 30 fields.** Rejected for the abandonment reasons described above. Users don't want to type their resume into a database.

**Traditional OCR (Tesseract) + regex parsing.** Rejected because finance resumes have highly variable layouts. A regex approach would work for 60% of resumes and fail catastrophically on the other 40%. Claude Vision's semantic understanding handles layout variance for free.

**LinkedIn profile import via API.** Considered seriously. LinkedIn does have a (heavily restricted) profile API, but approval requires going through LinkedIn's developer program, and the data returned is shallower than what's on a finance resume (no coursework, no GPA, no detailed bullets). Worth revisiting in Phase 2 as a secondary input method, not a primary one.

**Resume builder integration (Teal, Enhancv).** Rejected as out of scope. InternshipMatch's job is to help users apply to internships, not to help them write resumes. Users bring their own polished resume.

**Claude text-only parsing from extracted PDF text.** Considered. The problem is that PDF text extraction (via pdfminer or similar) produces flat text that loses the layout structure Claude Vision preserves. The hierarchical relationships (experience section, education section, skills grouping) get flattened, and Claude has to reconstruct them from context. Vision parsing is more reliable and comparably priced.

---

## References

- `backend/app/resume_parser.py` — the implementation
- `backend/app/prompts.py` — the `RESUME_PARSER_PROMPT` constant with worked examples
- `frontend/app/onboarding/page.tsx` — the review-and-edit UI
