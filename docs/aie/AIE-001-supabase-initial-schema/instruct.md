# Instruct — Supabase Initial Schema (5 Tables with RLS)

**AIE:** AIE-001

## Directive
> Write the initial Supabase migration at `infra/supabase/migrations/0001_initial_schema.sql`. Create tables for users, student_profiles, firms, postings, and fit_scores matching the data model in ARCHITECTURE.md. Enable RLS on every table. Users can only read/write their own rows. Firms and postings are public-read for authenticated users, service_role for writes. Add indexes for the common query patterns. Make it idempotent with IF NOT EXISTS.

## Context Provided
- ARCHITECTURE.md — full data model with all field definitions
- CLAUDE.md — code standards requiring all schema changes go through migrations, RLS on every user-owned table, service role key stays server-side

## Scope
**In scope:** 5 Phase 1 tables (users, student_profiles, firms, postings, fit_scores), RLS policies, performance indexes, uuid-ossp extension.

**Out of scope:** Application, Alumni, PrepSession tables (Phase 2+). Seed data (separate AIE). Supabase Storage configuration for resume PDFs.
