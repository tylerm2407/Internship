# Instruct — Pydantic Data Models (Phase 1)

**AIE:** AIE-002

## Directive
> Build the Pydantic models in `backend/app/models.py`. Every model from ARCHITECTURE.md, fully typed, every field documented. Use Pydantic v2 BaseModel with Field descriptions. Include: User, PriorExperience, StudentProfile, Firm, Posting, FitScore. Add an OpportunityResponse composite model for the dashboard API. Use Literal types for enums that match the database CHECK constraints. Add validation on FitScore.score (0-100 range). Default factories for list fields and timestamps.

## Context Provided
- ARCHITECTURE.md — complete data model definitions with all fields
- CLAUDE.md — code standards: type annotations required, all bodies are Pydantic models, docstrings with Args/Returns/Raises

## Scope
**In scope:** User, PriorExperience, StudentProfile, Firm, Posting, FitScore, OpportunityResponse models with full type annotations, field descriptions, and docstrings.

**Out of scope:** Application, Alumnus, PrepSession, PrepQuestion, PrepEvaluation models (Phase 2+). Database client module. API routes.
