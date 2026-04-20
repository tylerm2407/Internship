-- Migration: Add audit_log table for compliance and security logging

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    institution_id UUID REFERENCES institutions(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    ip_address TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_institution ON audit_log(institution_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- Service role only — users cannot read/write audit logs directly
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages audit_log" ON audit_log
    FOR ALL USING (auth.role() = 'service_role');
