-- Pre-generated interview question banks, keyed by (firm_id, session_type).
-- Rows with firm_id = NULL are "shared" across all firms.
-- Rows with firm_id set apply ONLY to that firm (in addition to shared).

CREATE TABLE IF NOT EXISTS bank_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
    firm_tier TEXT,
    session_type TEXT NOT NULL CHECK (session_type IN (
        'technical_accounting', 'technical_valuation', 'technical_ma',
        'technical_lbo', 'behavioral', 'firm_specific', 'market_awareness',
        'brain_teaser', 'market_sizing', 'pitch_a_stock', 'restructuring'
    )),
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_text TEXT NOT NULL,
    hint TEXT,
    ideal_answer_outline TEXT,
    tags JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bank_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read question bank" ON bank_questions;
CREATE POLICY "Authenticated users can read question bank"
    ON bank_questions FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage question bank" ON bank_questions;
CREATE POLICY "Service role can manage question bank"
    ON bank_questions FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_bank_questions_firm_session
    ON bank_questions(firm_id, session_type);
CREATE INDEX IF NOT EXISTS idx_bank_questions_tier_session
    ON bank_questions(firm_tier, session_type)
    WHERE firm_id IS NULL AND firm_tier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bank_questions_shared_session
    ON bank_questions(session_type)
    WHERE firm_id IS NULL AND firm_tier IS NULL;
