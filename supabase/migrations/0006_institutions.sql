-- Migration: Add institutions table and institution_id to users
-- Supports multi-tenant model for selling to universities

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Bryant University
INSERT INTO institutions (name, domain, config) VALUES
    ('Bryant University', 'bryant.edu', '{"pilot": true}');

-- Add institution_id to users (nullable for backward compatibility)
ALTER TABLE users ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);

-- Backfill existing users to Bryant University
UPDATE users SET institution_id = (SELECT id FROM institutions WHERE name = 'Bryant University')
WHERE institution_id IS NULL;

-- RLS: authenticated users can read institutions
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read institutions" ON institutions
    FOR SELECT USING (auth.role() = 'authenticated');
