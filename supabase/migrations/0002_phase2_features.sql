-- InternshipMatch Phase 2 Schema (idempotent)
-- Adds: applications, alumni, networking_contacts, prep_sessions, prep_answers, timeline_events
-- All user-owned tables have RLS enabled.

-- ============================================================
-- APPLICATIONS (user-owned)
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    posting_id UUID NOT NULL REFERENCES postings(id) ON DELETE CASCADE,
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'researching' CHECK (status IN (
        'researching', 'networking', 'applied', 'hirevue', 'phone_screen',
        'first_round', 'superday', 'offer', 'accepted', 'declined',
        'rejected', 'ghosted'
    )),
    group_division TEXT,
    applied_at TIMESTAMPTZ,
    notes TEXT NOT NULL DEFAULT '',
    next_action TEXT,
    next_action_date TIMESTAMPTZ,
    resume_version TEXT,
    recruiter_name TEXT,
    recruiter_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, posting_id)
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own applications" ON applications;
CREATE POLICY "Users can read their own applications"
    ON applications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own applications" ON applications;
CREATE POLICY "Users can insert their own applications"
    ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own applications" ON applications;
CREATE POLICY "Users can update their own applications"
    ON applications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own applications" ON applications;
CREATE POLICY "Users can delete their own applications"
    ON applications FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_firm ON applications(user_id, firm_id);

-- ============================================================
-- APPLICATION STATUS HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS application_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own status history" ON application_status_history;
CREATE POLICY "Users can read their own status history"
    ON application_status_history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own status history" ON application_status_history;
CREATE POLICY "Users can insert their own status history"
    ON application_status_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_status_history_app ON application_status_history(application_id);

-- ============================================================
-- ALUMNI
-- ============================================================
CREATE TABLE IF NOT EXISTS alumni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    "current_role" TEXT NOT NULL,
    division TEXT,
    graduation_year INTEGER NOT NULL,
    school TEXT NOT NULL DEFAULT 'Bryant University',
    major TEXT,
    connection_hooks JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE alumni ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read alumni" ON alumni;
CREATE POLICY "Authenticated users can read alumni"
    ON alumni FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Service role can manage alumni" ON alumni;
CREATE POLICY "Service role can manage alumni"
    ON alumni FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_alumni_firm ON alumni(firm_id);
CREATE INDEX IF NOT EXISTS idx_alumni_school ON alumni(school);

-- ============================================================
-- NETWORKING CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS networking_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alumni_id UUID REFERENCES alumni(id) ON DELETE SET NULL,
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    contact_role TEXT,
    contact_division TEXT,
    connection_type TEXT NOT NULL CHECK (connection_type IN (
        'alumni', 'career_fair', 'professor_referral', 'cold_outreach',
        'referral', 'club_connection', 'other'
    )),
    referred_by_id UUID REFERENCES networking_contacts(id) ON DELETE SET NULL,
    outreach_status TEXT NOT NULL DEFAULT 'not_contacted' CHECK (outreach_status IN (
        'not_contacted', 'message_sent', 'followed_up', 'responded',
        'call_scheduled', 'call_completed', 'thank_you_sent'
    )),
    outreach_date TIMESTAMPTZ,
    follow_up_date TIMESTAMPTZ,
    call_date TIMESTAMPTZ,
    call_notes TEXT,
    thank_you_sent_at TIMESTAMPTZ,
    next_action TEXT,
    next_action_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE networking_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own contacts" ON networking_contacts;
CREATE POLICY "Users can read their own contacts"
    ON networking_contacts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own contacts" ON networking_contacts;
CREATE POLICY "Users can insert their own contacts"
    ON networking_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own contacts" ON networking_contacts;
CREATE POLICY "Users can update their own contacts"
    ON networking_contacts FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own contacts" ON networking_contacts;
CREATE POLICY "Users can delete their own contacts"
    ON networking_contacts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON networking_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_firm ON networking_contacts(user_id, firm_id);
CREATE INDEX IF NOT EXISTS idx_contacts_followup ON networking_contacts(user_id, follow_up_date)
    WHERE follow_up_date IS NOT NULL;

-- ============================================================
-- PREP SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS prep_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL,
    session_type TEXT NOT NULL CHECK (session_type IN (
        'technical_accounting', 'technical_valuation', 'technical_ma',
        'technical_lbo', 'behavioral', 'firm_specific', 'market_awareness'
    )),
    questions_asked INTEGER NOT NULL DEFAULT 0,
    questions_correct INTEGER NOT NULL DEFAULT 0,
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    claude_feedback TEXT,
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE prep_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own prep sessions" ON prep_sessions;
CREATE POLICY "Users can read their own prep sessions"
    ON prep_sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own prep sessions" ON prep_sessions;
CREATE POLICY "Users can insert their own prep sessions"
    ON prep_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own prep sessions" ON prep_sessions;
CREATE POLICY "Users can update their own prep sessions"
    ON prep_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_prep_sessions_user ON prep_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_prep_sessions_firm ON prep_sessions(user_id, firm_id);

-- ============================================================
-- PREP ANSWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS prep_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES prep_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_category TEXT NOT NULL CHECK (question_category IN (
        'accounting', 'valuation', 'ma', 'lbo', 'behavioral',
        'firm_specific', 'market_awareness', 'brain_teaser'
    )),
    question_difficulty TEXT NOT NULL CHECK (question_difficulty IN ('easy', 'medium', 'hard')),
    user_answer TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    feedback TEXT NOT NULL,
    strengths JSONB NOT NULL DEFAULT '[]',
    improvements JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE prep_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own prep answers" ON prep_answers;
CREATE POLICY "Users can read their own prep answers"
    ON prep_answers FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own prep answers" ON prep_answers;
CREATE POLICY "Users can insert their own prep answers"
    ON prep_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_prep_answers_session ON prep_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_prep_answers_user_cat ON prep_answers(user_id, question_category);

-- ============================================================
-- READINESS SCORES
-- ============================================================
CREATE TABLE IF NOT EXISTS readiness_scores (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN (
        'accounting', 'valuation', 'ma', 'lbo', 'behavioral',
        'firm_specific', 'market_awareness', 'brain_teaser'
    )),
    mastery_score REAL NOT NULL DEFAULT 0.0 CHECK (mastery_score >= 0.0 AND mastery_score <= 5.0),
    questions_attempted INTEGER NOT NULL DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    needs_review BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id, category)
);

ALTER TABLE readiness_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own readiness" ON readiness_scores;
CREATE POLICY "Users can read their own readiness"
    ON readiness_scores FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can upsert their own readiness" ON readiness_scores;
CREATE POLICY "Users can upsert their own readiness"
    ON readiness_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own readiness" ON readiness_scores;
CREATE POLICY "Users can update their own readiness"
    ON readiness_scores FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- TIMELINE EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'application_open', 'application_deadline', 'diversity_program',
        'networking_task', 'prep_milestone', 'interview_scheduled',
        'follow_up_reminder', 'custom'
    )),
    title TEXT NOT NULL,
    description TEXT,
    firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
    posting_id UUID REFERENCES postings(id) ON DELETE SET NULL,
    event_date TIMESTAMPTZ NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own timeline" ON timeline_events;
CREATE POLICY "Users can read their own timeline"
    ON timeline_events FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own timeline events" ON timeline_events;
CREATE POLICY "Users can insert their own timeline events"
    ON timeline_events FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own timeline events" ON timeline_events;
CREATE POLICY "Users can update their own timeline events"
    ON timeline_events FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own timeline events" ON timeline_events;
CREATE POLICY "Users can delete their own timeline events"
    ON timeline_events FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role can manage timeline events" ON timeline_events;
CREATE POLICY "Service role can manage timeline events"
    ON timeline_events FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_timeline_user ON timeline_events(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_timeline_upcoming ON timeline_events(user_id, event_date)
    WHERE completed = FALSE;
