# Instruct — Resume Parser + Claude Prompt Library

**AIE:** AIE-004

## Directive
> Build the resume parser at `backend/app/resume_parser.py` and the prompt library at `backend/app/prompts.py`. The parser takes PDF bytes, base64-encodes them, calls Claude Vision via parse_resume_vision(), and constructs a StudentProfile from the JSON response. It must NEVER save to the database — the user reviews first. Add a review_parsed_profile() function that calls Claude to check for hallucinations. The prompts file must contain: RESUME_PARSER_PROMPT with 3 worked examples (sophomore, junior IB intern, quant double-major), FIT_SCORE_QUALITATIVE_PROMPT matching the scoring spec from ARCHITECTURE.md, and PROFILE_REVIEW_PROMPT for the quality checker. All prompts instruct Claude to return JSON only.

## Context Provided
- ARCHITECTURE.md — StudentProfile schema, resume parsing flow description
- CLAUDE.md — "The Vision resume parser can be flaky" section, review-before-save requirement, code standards
- ADR 0001 — resume upload + AI parsing design rationale
- `backend/app/models.py` — StudentProfile, PriorExperience models

## Scope
**In scope:** resume_parser.py (parse_resume_pdf, review_parsed_profile), prompts.py (3 prompt constants with worked examples), structured logging.

**Out of scope:** `claude_client.py` (assumed interface). The API route that calls the parser. The frontend upload UI. Supabase Storage for PDF files.
