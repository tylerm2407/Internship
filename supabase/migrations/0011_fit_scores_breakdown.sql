-- Migration: Add the missing `breakdown` JSONB column on fit_scores.
--
-- The FitScore Pydantic model and the frontend OpportunityCard both expect a
-- per-factor breakdown (gpa, class_year, role_match, coursework, geography,
-- experience). The table was created without this column, which made every
-- cache-write upsert 400 and left dashboards empty.

ALTER TABLE fit_scores
    ADD COLUMN IF NOT EXISTS breakdown JSONB NOT NULL DEFAULT '{}'::jsonb;
