-- Drop table if it exists (comment this out if you don't want to reset existing data)
DROP TABLE IF EXISTS chores;
DROP TABLE IF EXISTS family_members;

-- Create family_members table
CREATE TABLE family_members (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  avatar TEXT,
  color TEXT,
  dob DATE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for querying family members by user
CREATE INDEX idx_family_members_user_id ON family_members(user_id);

-- Enable real-time capabilities for the family_members table
ALTER PUBLICATION supabase_realtime ADD TABLE family_members;

-- Create chores table with proper schema
CREATE TABLE chores (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  assignee UUID REFERENCES family_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reward NUMERIC,
  icon TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for faster access
CREATE INDEX idx_chores_status ON chores(status);
CREATE INDEX idx_chores_user_id ON chores(user_id);
CREATE INDEX idx_chores_assignee ON chores(assignee);

-- Enable real-time capabilities for the chores table
ALTER PUBLICATION supabase_realtime ADD TABLE chores;

-- Create row-level security policies
-- Enable Row Level Security
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;

-- Create policies for family_members
CREATE POLICY "Users can view their own family members" ON family_members 
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own family members" ON family_members 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own family members" ON family_members 
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own family members" ON family_members 
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for chores
CREATE POLICY "Users can view their own chores" ON chores 
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own chores" ON chores 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own chores" ON chores 
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own chores" ON chores 
  FOR DELETE USING (auth.uid() = user_id);

-- Optional: Add sample data (comment this out in production)
-- This will only be useful for development
/*
-- Add sample family members
INSERT INTO family_members (id, name, created_at, avatar, color, dob, user_id)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dad', NOW(), '👨', '#4f46e5', '1980-06-15', NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mum', NOW(), '👩', '#d946ef', '1982-03-22', NULL),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Faith', NOW(), '👧', '#ec4899', '2010-11-05', NULL),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Harmony', NOW(), '👧', '#8b5cf6', '2012-07-30', NULL), 
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Isaac', NOW(), '👦', '#3b82f6', '2014-09-18', NULL);

-- Add sample data
INSERT INTO chores (id, title, assignee, status, created_at, reward, icon, user_id)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Take out trash', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TODO', NOW(), 2, '🗑️', NULL),
  ('22222222-2222-2222-2222-222222222222', 'Do homework', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'TODO', NOW(), 5, '📚', NULL),
  ('33333333-3333-3333-3333-333333333333', 'Vacuum living room', NULL, 'IDEAS', NOW(), 3, '🧹', NULL),
  ('44444444-4444-4444-4444-444444444444', 'Wash dishes', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'DONE', NOW(), 2, '🍽️', NULL),
  ('55555555-5555-5555-5555-555555555555', 'Feed dog', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'TODO', NOW(), 1, '🐕', NULL);
*/

-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Click on SQL Editor
-- 3. Create a New Query
-- 4. Paste this entire file
-- 5. Click Run to execute the SQL and set up your database
-- 6. Set up authentication providers in Supabase:
--    - Go to Authentication > Providers
--    - Enable the providers you want (Google, GitHub, Discord, etc.)
--    - Configure the OAuth credentials for each provider
-- 7. Enable real-time for your project in the Supabase dashboard:
--    - Go to Database > Replication
--    - Make sure "Real-time" is turned on
--    - In the table configuration, ensure both "chores" and "family_members" tables are enabled for real-time 