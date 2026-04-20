-- Alumni search enhancement: add contact info, search indexes, and import tracking

ALTER TABLE alumni ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS current_company TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'seed' CHECK (source IN ('seed', 'csv_import', 'manual'));

-- Indexes for search
CREATE INDEX IF NOT EXISTS idx_alumni_school_lower ON alumni(LOWER(school));
CREATE INDEX IF NOT EXISTS idx_alumni_company_lower ON alumni(LOWER(current_company));
CREATE INDEX IF NOT EXISTS idx_alumni_name_lower ON alumni(LOWER(name));

-- Allow authenticated users to insert alumni they add
CREATE POLICY "Users can insert alumni" ON alumni FOR INSERT WITH CHECK (auth.uid() = added_by);
