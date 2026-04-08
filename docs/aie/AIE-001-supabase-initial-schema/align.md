# Align — Supabase Initial Schema (5 Tables with RLS)

**AIE:** AIE-001
**Date:** 2026-04-08
**Severity:** critical
**Domain:** database

## Problem
InternshipMatch needs a persistent data layer to store users, student profiles, firm data, job postings, and fit scores. Without a database schema, nothing else in the application can function — no resume uploads, no scoring, no dashboard. The schema must enforce data integrity, support Row Level Security so users can only access their own data, and match the Pydantic models exactly.

## Decision
Create a Supabase Postgres schema with 5 Phase 1 tables: `users`, `student_profiles`, `firms`, `postings`, and `fit_scores`. Enable RLS on every table. User-owned tables (users, student_profiles, fit_scores) restrict access to auth.uid() = id/user_id. Public-read tables (firms, postings) allow any authenticated user to read but restrict writes to service_role. Add indexes for common query patterns (postings by firm, open postings, fit scores by user and score).

## Why This Approach
Supabase was chosen (ADR 0001) as the single source of truth because InternshipMatch supports a 12-month recruiting cycle — users must find their data intact weeks or months later. RLS at the database level is more secure than application-level checks because it can't be bypassed by a rogue API call. The composite primary key on fit_scores (user_id, posting_id) enforces one score per user-posting pair at the database level rather than relying on application logic.

## Impact
- Every backend module depends on this schema existing
- Pydantic models in `models.py` must mirror these column definitions exactly
- The seed script, fit scorer, resume parser, and all API routes depend on these tables
- RLS policies affect how the Supabase client must authenticate (anon key for reads, service role for writes)

## Success Criteria
- All 5 tables created with correct column types and constraints
- RLS enabled on every table with policies matching the access pattern in ARCHITECTURE.md
- Indexes on postings(firm_id), postings(closed_at) WHERE NULL, fit_scores(user_id), and fit_scores(user_id, score DESC)
- Migration file is idempotent (uses IF NOT EXISTS)
