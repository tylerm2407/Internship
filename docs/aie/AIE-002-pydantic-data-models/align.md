# Align — Pydantic Data Models (Phase 1)

**AIE:** AIE-002
**Date:** 2026-04-08
**Severity:** major
**Domain:** backend

## Problem
Every layer of InternshipMatch — the API routes, the fit scorer, the resume parser, the frontend types — needs a shared definition of what a User, StudentProfile, Firm, Posting, and FitScore look like. Without strict typing, data shape mismatches between the parser output, the scorer input, and the API response will cause silent bugs that erode trust in the fit scores.

## Decision
Define all Phase 1 data models in `backend/app/models.py` using Pydantic v2 BaseModel. Every field has type annotations, Field descriptions, and sensible defaults. The models are: User, PriorExperience, StudentProfile, Firm, Posting, FitScore, and OpportunityResponse (composite API response). These models serve as the contract between every module in the backend, and the TypeScript types in the frontend must mirror them exactly.

## Why This Approach
Pydantic v2 was chosen because it gives runtime validation (catching bad data from Claude Vision or scrapers), automatic JSON serialization for API responses, and self-documenting field descriptions. Raw dicts are banned per CLAUDE.md code standards. The alternative — dataclasses — lacks runtime validation and JSON schema generation.

## Impact
- Every backend module imports from `models.py`
- The fit scorer's type signatures depend on StudentProfile, Firm, Posting, and FitScore
- The resume parser returns a StudentProfile
- API routes use these as request/response types
- Frontend `lib/types.ts` must mirror these models

## Success Criteria
- All 7 models defined with complete type annotations and Field descriptions
- Models match the data model section of ARCHITECTURE.md
- FitScore.score has ge=0, le=100 validation
- Firm.tier and Posting.class_year_target use Literal types matching the database CHECK constraints
- OpportunityResponse composes Posting + Firm + FitScore for the dashboard API
