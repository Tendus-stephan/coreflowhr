-- Job templates: save job config for reuse (title, skills, location, description, etc.)
CREATE TABLE IF NOT EXISTS job_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  department TEXT DEFAULT 'General',
  location TEXT,
  type TEXT CHECK (type IN ('Full-time', 'Contract', 'Part-time')) DEFAULT 'Full-time',
  description TEXT DEFAULT '',
  experience_level TEXT,
  remote BOOLEAN DEFAULT false,
  skills TEXT[] DEFAULT '{}',
  is_builtin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_job_templates_user_id ON job_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_job_templates_is_builtin ON job_templates(is_builtin) WHERE is_builtin = true;

ALTER TABLE job_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own templates" ON job_templates;
CREATE POLICY "Users can view own templates" ON job_templates FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own templates" ON job_templates;
CREATE POLICY "Users can insert own templates" ON job_templates FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own templates" ON job_templates;
CREATE POLICY "Users can update own templates" ON job_templates FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own templates" ON job_templates;
CREATE POLICY "Users can delete own templates" ON job_templates FOR DELETE USING (auth.uid() = user_id);
