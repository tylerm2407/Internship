-- InternshipMatch Initial Schema
-- Phase 1: users, student_profiles, firms, postings, fit_scores
-- All user-owned tables have RLS enabled.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    school TEXT NOT NULL DEFAULT 'Bryant University',
    graduation_year INTEGER NOT NULL,
    current_class_year TEXT NOT NULL CHECK (current_class_year IN ('freshman', 'sophomore', 'junior', 'senior')),
    onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own row"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own row"
    ON users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own row"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================================
-- STUDENT PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS student_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    school TEXT NOT NULL,
    major TEXT NOT NULL,
    minor TEXT,
    gpa REAL,
    target_roles JSONB NOT NULL DEFAULT '[]',
    target_geographies JSONB NOT NULL DEFAULT '[]',
    technical_skills JSONB NOT NULL DEFAULT '[]',
    coursework_completed JSONB NOT NULL DEFAULT '[]',
    coursework_in_progress JSONB NOT NULL DEFAULT '[]',
    clubs JSONB NOT NULL DEFAULT '[]',
    certifications JSONB NOT NULL DEFAULT '[]',
    prior_experience JSONB NOT NULL DEFAULT '[]',
    diversity_status TEXT,
    languages JSONB NOT NULL DEFAULT '[]',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
    ON student_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON student_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON student_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================
-- FIRMS (public read, admin write)
-- ============================================================
CREATE TABLE IF NOT EXISTS firms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('bulge_bracket', 'elite_boutique', 'middle_market', 'boutique', 'regional', 'buy_side', 'quant')),
    roles_offered JSONB NOT NULL DEFAULT '[]',
    headquarters TEXT NOT NULL,
    offices JSONB NOT NULL DEFAULT '[]',
    gpa_floor_estimated REAL NOT NULL,
    recruiting_profile TEXT NOT NULL,
    careers_url TEXT NOT NULL,
    scraper_adapter TEXT,
    last_scraped_at TIMESTAMPTZ
);

ALTER TABLE firms ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read firms
CREATE POLICY "Authenticated users can read firms"
    ON firms FOR SELECT
    USING (auth.role() = 'authenticated');

-- Service role can insert/update firms (for seeding and scraper updates)
CREATE POLICY "Service role can manage firms"
    ON firms FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- POSTINGS (public read, admin write)
-- ============================================================
CREATE TABLE IF NOT EXISTS postings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    role_type TEXT NOT NULL,
    class_year_target TEXT NOT NULL CHECK (class_year_target IN ('freshman', 'sophomore', 'junior', 'senior')),
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements JSONB NOT NULL DEFAULT '[]',
    application_url TEXT NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deadline TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    estimated_effort_minutes INTEGER NOT NULL DEFAULT 45
);

ALTER TABLE postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read postings"
    ON postings FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage postings"
    ON postings FOR ALL
    USING (auth.role() = 'service_role');

-- Index for fast lookups by firm
CREATE INDEX IF NOT EXISTS idx_postings_firm_id ON postings(firm_id);

-- Index for filtering open postings
CREATE INDEX IF NOT EXISTS idx_postings_open ON postings(closed_at) WHERE closed_at IS NULL;

-- ============================================================
-- FIT SCORES (user-owned, cached)
-- ============================================================
CREATE TABLE IF NOT EXISTS fit_scores (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    posting_id UUID NOT NULL REFERENCES postings(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    tier TEXT NOT NULL CHECK (tier IN ('strong_match', 'reach', 'long_shot', 'not_recommended')),
    rationale TEXT NOT NULL,
    strengths JSONB NOT NULL DEFAULT '[]',
    gaps JSONB NOT NULL DEFAULT '[]',
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, posting_id)
);

ALTER TABLE fit_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own fit scores"
    ON fit_scores FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fit scores"
    ON fit_scores FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fit scores"
    ON fit_scores FOR UPDATE
    USING (auth.uid() = user_id);

-- Service role can also manage fit scores (for backend scoring)
CREATE POLICY "Service role can manage fit scores"
    ON fit_scores FOR ALL
    USING (auth.role() = 'service_role');

-- Index for fast score lookups per user
CREATE INDEX IF NOT EXISTS idx_fit_scores_user_id ON fit_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_fit_scores_score ON fit_scores(user_id, score DESC);
