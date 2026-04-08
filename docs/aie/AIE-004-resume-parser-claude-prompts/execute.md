# Execute — Resume Parser + Claude Prompt Library

**AIE:** AIE-004

## Files Changed

| File | Action | What Changed |
|------|--------|-------------|
| `backend/app/resume_parser.py` | created | `parse_resume_pdf()` — PDF bytes to StudentProfile via Claude Vision. `review_parsed_profile()` — hallucination quality check. 107 lines. |
| `backend/app/prompts.py` | created | 3 prompt constants: RESUME_PARSER_PROMPT (146 lines with 3 worked examples), FIT_SCORE_QUALITATIVE_PROMPT (45 lines), PROFILE_REVIEW_PROMPT (31 lines). 228 lines total. |

## Outcome
Implementation matches the plan. Key details:

**Resume parser:**
- Base64 encodes the PDF and delegates to `claude_client.parse_resume_vision()`
- Manually constructs `PriorExperience` objects from raw dicts (defensive against malformed Claude output)
- Every `.get()` call has a sensible default (empty string, empty list, None) so partial Claude responses don't crash
- Structured logging captures user_id, parsed name, GPA, and experience count
- Neither function touches the database — enforced by design (no db import)

**Prompt library:**
- RESUME_PARSER_PROMPT includes 3 worked examples covering the main archetypes:
  1. Jane Smith — sophomore, minimal experience, Bryant University (the base case for Owen's target audience)
  2. Michael Chen — junior with Jefferies IB internship (the strong candidate case)
  3. Priya Patel — double-major Finance/Math at BC with AQR quant internship (the STEM crossover case)
- Each example shows the exact JSON output expected, reducing hallucination risk
- 5 explicit rules: only extract what's on the resume, infer target_roles from content, don't guess GPA, preserve bullet wording, use empty lists not null
- FIT_SCORE_QUALITATIVE_PROMPT includes the tier mapping and tells Claude to be honest ("A 54 is a 54")
- PROFILE_REVIEW_PROMPT checks for 5 hallucination patterns: unrealistic GPA, mismatched coursework, impossible dates, misread club names, hallucinated skills

## Side Effects
- Both modules import from `app.claude_client` which must provide `parse_resume_vision()` and `review_profile()` functions
- Prompts use `{profile_json}`, `{posting_json}`, `{base_score}` as template variables — the claude_client must format these

## Tests
No dedicated unit tests for the resume parser yet. The parser's correctness depends heavily on Claude Vision output quality, which is better tested via integration tests with sample PDFs.

## Follow-Up Required
- [ ] Future AIE needed: `claude_client.py` wrapping the Anthropic SDK
- [ ] Future AIE needed: Integration tests with sample resume PDFs
- [ ] Future AIE needed: Frontend resume upload + review/edit UI
