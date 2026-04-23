-- Migration: RLS hardening pass
-- 1. Alumni INSERT policy rejects NULL added_by so seed/service inserts must
--    go through the service role.
-- 2. Fill in missing DELETE policies on user-owned tables.
-- 3. Explicit service-role-only write/delete on institutions.
-- 4. Add indexes on frequently filtered columns to avoid table scans.

-- ---------- Alumni: tighten INSERT ----------
DROP POLICY IF EXISTS "Users can insert alumni" ON alumni;
CREATE POLICY "Users can insert alumni" ON alumni
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND added_by IS NOT NULL
        AND auth.uid() = added_by
    );

-- ---------- application_status_history: DELETE policy ----------
DROP POLICY IF EXISTS "Users can delete their own status history" ON application_status_history;
CREATE POLICY "Users can delete their own status history"
    ON application_status_history FOR DELETE USING (auth.uid() = user_id);

-- ---------- readiness_scores: DELETE policy ----------
DROP POLICY IF EXISTS "Users can delete their own readiness" ON readiness_scores;
CREATE POLICY "Users can delete their own readiness"
    ON readiness_scores FOR DELETE USING (auth.uid() = user_id);

-- ---------- prep_answers: UPDATE and DELETE policies ----------
DROP POLICY IF EXISTS "Users can update their own prep answers" ON prep_answers;
CREATE POLICY "Users can update their own prep answers"
    ON prep_answers FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own prep answers" ON prep_answers;
CREATE POLICY "Users can delete their own prep answers"
    ON prep_answers FOR DELETE USING (auth.uid() = user_id);

-- ---------- institutions: explicit write/delete lockdown ----------
DROP POLICY IF EXISTS "Service role manages institutions" ON institutions;
CREATE POLICY "Service role manages institutions" ON institutions
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ---------- Indexes for common hot paths ----------
-- fit_scores TTL check in get_fit_scores() filters on computed_at
CREATE INDEX IF NOT EXISTS idx_fit_scores_user_computed
    ON fit_scores(user_id, computed_at DESC);

-- Prep answers per-user filters (complements existing idx_prep_answers_user_cat)
CREATE INDEX IF NOT EXISTS idx_prep_answers_user ON prep_answers(user_id);

-- Applications filtered by non-terminal status is a common dashboard query
CREATE INDEX IF NOT EXISTS idx_applications_active
    ON applications(user_id, status)
    WHERE status NOT IN ('rejected', 'ghosted', 'withdrawn');
