-- CoreFlow Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  role TEXT DEFAULT 'User',
  phone TEXT,
  job_title TEXT,
  avatar_url TEXT,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  weekly_report BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  department TEXT DEFAULT 'General',
  location TEXT NOT NULL,
  type TEXT CHECK (type IN ('Full-time', 'Contract', 'Part-time')) DEFAULT 'Full-time',
  status TEXT CHECK (status IN ('Active', 'Closed', 'Draft')) DEFAULT 'Draft',
  applicants_count INTEGER DEFAULT 0,
  posted_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  description TEXT,
  company TEXT,
  salary_range TEXT,
  experience_level TEXT,
  remote BOOLEAN DEFAULT false,
  skills TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- CANDIDATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  stage TEXT CHECK (stage IN ('New', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected')) DEFAULT 'New',
  applied_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  location TEXT,
  resume_summary TEXT,
  ai_match_score INTEGER CHECK (ai_match_score >= 0 AND ai_match_score <= 100),
  ai_analysis TEXT,
  avatar_url TEXT,
  experience INTEGER,
  skills TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- INTERVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  job_title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  type TEXT CHECK (type IN ('Google Meet', 'Phone', 'In-Person')) DEFAULT 'Google Meet',
  interviewer TEXT,
  meeting_link TEXT,
  notes TEXT,
  status TEXT CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')) DEFAULT 'Scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  target_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- USER SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  max_active_jobs INTEGER DEFAULT 10,
  default_job_duration INTEGER DEFAULT 30,
  max_candidates_per_job INTEGER DEFAULT 50,
  auto_delete_jobs BOOLEAN DEFAULT false,
  billing_plan_name TEXT DEFAULT 'Free',
  billing_plan_price DECIMAL DEFAULT 0,
  billing_plan_interval TEXT CHECK (billing_plan_interval IN ('monthly', 'yearly')) DEFAULT 'monthly',
  billing_plan_active_jobs_limit INTEGER DEFAULT 10,
  billing_plan_candidates_limit INTEGER DEFAULT 20,
  billing_plan_currency TEXT DEFAULT '$',
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')) DEFAULT NULL,
  subscription_stripe_id TEXT DEFAULT NULL,
  subscription_current_period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- EMAIL TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  "desc" TEXT,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- INTEGRATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  "desc" TEXT,
  active BOOLEAN DEFAULT false,
  logo TEXT,
  connected_date TIMESTAMP WITH TIME ZONE,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  "desc" TEXT,
  type TEXT NOT NULL DEFAULT 'system',
  category TEXT,
  unread BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates(stage);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Jobs policies
CREATE POLICY "Users can view own jobs" ON jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs" ON jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Candidates policies
CREATE POLICY "Users can view own candidates" ON candidates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own candidates" ON candidates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own candidates" ON candidates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own candidates" ON candidates
  FOR DELETE USING (auth.uid() = user_id);

-- Interviews policies
CREATE POLICY "Users can view own interviews" ON interviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interviews" ON interviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interviews" ON interviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interviews" ON interviews
  FOR DELETE USING (auth.uid() = user_id);

-- Activity log policies
CREATE POLICY "Users can view own activity" ON activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Email templates policies
CREATE POLICY "Users can view own templates" ON email_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON email_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON email_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON email_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Integrations policies
CREATE POLICY "Users can view own integrations" ON integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations" ON integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations" ON integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations" ON integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile if it doesn't exist (handle duplicate signups)
  INSERT INTO public.profiles (id, name, email_notifications)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default settings with 'Free' plan (handle duplicates)
  INSERT INTO public.user_settings (user_id, billing_plan_name)
  VALUES (NEW.id, 'Free')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create default email templates (handle duplicates - use user-specific IDs)
  -- Templates include all required placeholders for their type
  INSERT INTO public.email_templates (id, user_id, title, "desc", type, subject, content)
  VALUES
    (NEW.id::text || '_screening', NEW.id, 'Screening Outreach', 'Sent when candidate is sourced', 'Sourcing',
     'Application Invitation – {job_title} Position at {company_name}',
     'Dear {candidate_name},\n\nWe are writing to express our interest in your professional profile and would like to invite you to apply for the {job_title} position at {company_name}.\n\nWe believe your skills and experience would be a great fit for our team. Please let us know if you are interested in moving forward.\n\nBest regards,\n{your_name}\n{company_name}'),
    (NEW.id::text || '_interview', NEW.id, 'Interview Invitation', 'Sent to schedule interviews', 'Interview',
     'Interview Invitation – {job_title} Position at {company_name}',
     'Dear {candidate_name},\n\nThank you for your interest in the {job_title} position at {company_name}. We were impressed with your application and would like to invite you for an interview.\n\n{interview_details}\n\nDate: {interview_date}\nTime: {interview_time}\nDuration: {interview_duration}\nType: {interview_type}\nInterviewer: {interviewer_name}\n{meeting_link}\n{address}\n\nPlease confirm your availability by replying to this email. If you have any questions or need to reschedule, please don''t hesitate to reach out.\n\nWe look forward to meeting with you!\n\nBest regards,\n{your_name}\n{company_name}'),
    (NEW.id::text || '_reschedule', NEW.id, 'Interview Reschedule', 'Sent when interview is rescheduled', 'Reschedule',
     'Interview Rescheduled – {job_title} Position at {company_name}',
     'Dear {candidate_name},\n\nWe wanted to inform you that your interview for the {job_title} position at {company_name} has been rescheduled.\n\n**Previous Interview Time:**\n{previous_interview_time}\n\n**New Interview Time:**\n{new_interview_time}\n\nDate: {interview_date}\nTime: {interview_time}\nDuration: {interview_duration}\nType: {interview_type}\n\n{meeting_link}\n{address}\n\nIf you have any questions or concerns about this change, please don''t hesitate to reach out to us.\n\nWe apologize for any inconvenience and look forward to speaking with you at the new scheduled time.\n\nBest regards,\n{your_name}'),
    (NEW.id::text || '_rejection', NEW.id, 'Rejection Letter', 'Sent to rejected candidates', 'Rejection',
     'Application Status Update – {job_title} Position at {company_name}',
     'Dear {candidate_name},\n\nThank you for your interest in the {job_title} position at {company_name} and for taking the time to apply.\n\nAfter careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.\n\nWe appreciate your interest in {company_name} and wish you the best in your job search.\n\nBest regards,\n{your_name}\n{company_name}'),
    (NEW.id::text || '_offer', NEW.id, 'Offer Letter', 'Sent with job offers', 'Offer',
     'Formal Job Offer – {position_title} at {company_name}',
     'Dear {candidate_name},\n\nWe are delighted to extend a formal job offer for the {position_title} position at {company_name}.\n\nOffer Details:\nPosition: {position_title}\nSalary: {salary} ({salary_amount} {salary_currency} {salary_period})\nStart Date: {start_date}\nExpires: {expires_at}\n\nBenefits:\n{benefits_list}\n\nWe were impressed with your qualifications and believe you will be a valuable addition to our team.\n\nPlease review the offer details and let us know if you have any questions. We look forward to welcoming you to {company_name}!\n\nBest regards,\n{your_name}\n{company_name}'),
    (NEW.id::text || '_hired', NEW.id, 'Hired Letter', 'Sent to hired candidates', 'Hired',
     'Welcome to {company_name} – Onboarding Information',
     'Dear {candidate_name},\n\nOn behalf of {company_name}, I am thrilled to officially welcome you to our team as our new {job_title}!\n\nWe are excited to have you join us and look forward to seeing the great contributions you will make.\n\nPlease review the attached onboarding materials and don''t hesitate to reach out if you have any questions before your start date.\n\nWelcome aboard!\n\nBest regards,\n{your_name}\n{company_name}'),
    (NEW.id::text || '_offer_accepted', NEW.id, 'Offer Accepted', 'Sent when recruiter accepts counter offer', 'Offer Accepted',
     'Counter Offer Accepted – {position_title} at {company_name}',
     'Dear {candidate_name},\n\nWe are pleased to inform you that we have accepted your counter offer for the {position_title} position at {company_name}!\n\nFinal Offer Details:\nPosition: {position_title}\nSalary: {salary} ({salary_amount} {salary_currency} {salary_period})\nStart Date: {start_date}\nExpires: {expires_at}\n\nBenefits:\n{benefits_list}\n\nWe are excited to move forward with these terms and look forward to welcoming you to {company_name}!\n\nPlease confirm your acceptance and we will proceed with the next steps.\n\nBest regards,\n{your_name}\n{company_name}'),
    (NEW.id::text || '_offer_declined', NEW.id, 'Offer Declined', 'Sent when recruiter declines counter offer', 'Offer Declined',
     'Counter Offer Update – {position_title} at {company_name}',
     'Dear {candidate_name},\n\nThank you for your counter offer regarding the {position_title} position at {company_name}.\n\nAfter careful consideration, we are unable to accept the terms of your counter offer at this time. However, our original offer of {salary} ({salary_amount} {salary_currency} {salary_period}) remains available if you would like to proceed.\n\nWe understand this may be disappointing, and we appreciate your interest in joining {company_name}. If you have any questions or would like to discuss further, please don''t hesitate to reach out.\n\nBest regards,\n{your_name}\n{company_name}'),
    (NEW.id::text || '_counter_offer_response', NEW.id, 'Counter Offer Response', 'Sent when recruiter responds with new terms', 'Counter Offer Response',
     'Updated Offer Terms – {position_title} at {company_name}',
     'Dear {candidate_name},\n\nThank you for your counter offer. We appreciate your interest in the {position_title} position at {company_name}.\n\nAfter reviewing your request, we would like to propose the following updated terms:\n\nUpdated Offer Details:\nPosition: {position_title}\nSalary: {salary} ({salary_amount} {salary_currency} {salary_period})\nStart Date: {start_date}\nExpires: {expires_at}\n\nBenefits:\n{benefits_list}\n\n{notes}\n\nWe hope these terms work for you. Please let us know if you would like to proceed or if you have any further questions.\n\nBest regards,\n{your_name}\n{company_name}')
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default integrations (handle duplicates - use user-specific IDs)
  INSERT INTO public.integrations (id, user_id, name, "desc", active, logo)
  VALUES
    (NEW.id::text || '_gcal', NEW.id, 'Google Calendar', 'Sync interviews bi-directionally.', false, 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg'),
    (NEW.id::text || '_meet', NEW.id, 'Google Meet', 'Auto-generate video links.', false, 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Google_Meet_icon_%282020%29.svg')
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


