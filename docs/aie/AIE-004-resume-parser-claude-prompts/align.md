# Align — Resume Parser + Claude Prompt Library

**AIE:** AIE-004
**Date:** 2026-04-08
**Severity:** major
**Domain:** ai

## Problem
InternshipMatch's entry point is a resume upload. The PDF must be converted into a structured StudentProfile that the fit scorer can process. Claude Vision handles the extraction, but it can hallucinate GPAs, misread club names, and invent coursework. Additionally, every Claude prompt in the system (resume parsing, fit scoring qualitative pass, profile review) needs to live in a single auditable file rather than scattered across business logic.

## Decision
Build two modules:
1. `backend/app/resume_parser.py` — takes PDF bytes, base64-encodes them, sends to Claude Vision via `claude_client.parse_resume_vision()`, constructs a validated StudentProfile from the response, and returns it for user review. Never auto-saves to the database.
2. `backend/app/prompts.py` — all Claude prompt strings as named constants: RESUME_PARSER_PROMPT (with 3 worked examples), FIT_SCORE_QUALITATIVE_PROMPT, PROFILE_REVIEW_PROMPT.

Additionally, build `review_parsed_profile()` that runs a quality check to flag potential hallucinations before the user sees the parsed data.

## Why This Approach
Centralizing prompts in one file means any prompt change is a single-file diff, easy to review and version. The parser deliberately does NOT save to the database — per CLAUDE.md, the user must review and correct every field. Three worked examples in the resume prompt (sophomore with minimal experience, junior with IB internship, double-major quant candidate) dramatically reduce Vision hallucinations by showing the expected output format for common resume layouts.

## Impact
- The resume parser is the first thing every new user interacts with
- If parsing is wrong and the user doesn't catch it, all downstream fit scores are wrong
- The prompts file is imported by `claude_client.py` for all API calls
- The profile review function adds a safety layer against Vision hallucinations

## Success Criteria
- `parse_resume_pdf()` returns a valid StudentProfile for any well-formatted finance resume
- The function never writes to the database
- All 3 worked examples in the prompt cover the main resume archetypes (early-career, experienced, quant)
- `review_parsed_profile()` flags obviously wrong data (GPA > 4.0, future dates, mismatched coursework)
- Structured logging captures user_id, name, GPA, and experience count for debugging
