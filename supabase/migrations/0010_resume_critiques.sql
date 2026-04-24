-- Migration: Resume Coach — per-user resume critique cache
-- Stores the latest AI critique of a student's resume. One row per user;
-- regenerating overwrites the previous critique. Full history isn't useful
-- and would balloon storage, so we keep only the latest.

CREATE TABLE IF NOT EXISTS resume_critiques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    tier TEXT NOT NULL CHECK (tier IN ('strong', 'competitive', 'needs_work', 'major_gaps')),
    headline TEXT NOT NULL,
    category_scores JSONB NOT NULL DEFAULT '{}',
    priorities JSONB NOT NULL DEFAULT '[]',
    bullet_feedback JSONB NOT NULL DEFAULT '[]',
    strengths JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_resume_critiques_user ON resume_critiques(user_id);

ALTER TABLE resume_critiques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own critique" ON resume_critiques;
CREATE POLICY "Users can read their own critique"
    ON resume_critiques FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own critique" ON resume_critiques;
CREATE POLICY "Users can insert their own critique"
    ON resume_critiques FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own critique" ON resume_critiques;
CREATE POLICY "Users can update their own critique"
    ON resume_critiques FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own critique" ON resume_critiques;
CREATE POLICY "Users can delete their own critique"
    ON resume_critiques FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages critiques" ON resume_critiques;
CREATE POLICY "Service role manages critiques" ON resume_critiques
    FOR ALL USING (auth.role() = 'service_role');
