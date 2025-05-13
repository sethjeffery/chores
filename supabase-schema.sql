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
  dob DATE
);

-- Enable real-time capabilities for the family_members table
ALTER PUBLICATION supabase_realtime ADD TABLE family_members;

-- Create chores table with proper schema
CREATE TABLE chores (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  assignee TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reward NUMERIC,
  icon TEXT
);

-- Create an index for faster access by status
CREATE INDEX idx_chores_status ON chores(status);

-- Enable real-time capabilities for the chores table
ALTER PUBLICATION supabase_realtime ADD TABLE chores;

-- Add sample family members
INSERT INTO family_members (id, name, created_at, avatar, color, dob)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dad', NOW(), '👨', '#4f46e5', '1980-06-15'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mum', NOW(), '👩', '#d946ef', '1982-03-22'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Faith', NOW(), '👧', '#ec4899', '2010-11-05'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Harmony', NOW(), '👧', '#8b5cf6', '2012-07-30'), 
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Isaac', NOW(), '👦', '#3b82f6', '2014-09-18');

-- Add sample data (optional - comment this out if you don't want sample data)
INSERT INTO chores (id, title, assignee, status, created_at, reward, icon)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Take out trash', 'Dad', 'TODO', NOW(), 2, '🗑️'),
  ('22222222-2222-2222-2222-222222222222', 'Do homework', 'Faith', 'TODO', NOW(), 5, '📚'),
  ('33333333-3333-3333-3333-333333333333', 'Vacuum living room', NULL, 'IDEAS', NOW(), 3, '🧹'),
  ('44444444-4444-4444-4444-444444444444', 'Wash dishes', 'Mum', 'DONE', NOW(), 2, '🍽️'),
  ('55555555-5555-5555-5555-555555555555', 'Feed dog', 'Isaac', 'TODO', NOW(), 1, '🐕');

-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Click on SQL Editor
-- 3. Create a New Query
-- 4. Paste this entire file
-- 5. Click Run to execute the SQL and set up your database
-- 6. Enable real-time for your project in the Supabase dashboard:
--    - Go to Database > Replication
--    - Make sure "Real-time" is turned on
--    - In the table configuration, ensure both "chores" and "family_members" tables are enabled for real-time 