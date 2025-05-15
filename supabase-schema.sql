-- Drop table if it exists (comment this out if you don't want to reset existing data)
DROP TABLE IF EXISTS chores;
DROP TABLE IF EXISTS family_members;
DROP TABLE IF EXISTS account_users;
DROP TABLE IF EXISTS accounts;

-- Create accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create account_users junction table to link accounts with multiple auth users
CREATE TABLE account_users (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  UNIQUE(account_id, user_id)
);

-- Create index for querying account users
CREATE INDEX idx_account_users_account_id ON account_users(account_id);
CREATE INDEX idx_account_users_user_id ON account_users(user_id);

-- Create family_members table
CREATE TABLE family_members (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  avatar TEXT,
  color TEXT,
  dob DATE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE
);

-- Create index for querying family members by account
CREATE INDEX idx_family_members_account_id ON family_members(account_id);

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
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE
);

-- Create indexes for faster access
CREATE INDEX idx_chores_status ON chores(status);
CREATE INDEX idx_chores_account_id ON chores(account_id);
CREATE INDEX idx_chores_assignee ON chores(assignee);

-- Enable real-time capabilities for the chores table
ALTER PUBLICATION supabase_realtime ADD TABLE chores;
ALTER PUBLICATION supabase_realtime ADD TABLE account_users;
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;

-- Create row-level security policies
-- Enable Row Level Security
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_users ENABLE ROW LEVEL SECURITY;

-- Create helper function to safely check account membership
CREATE OR REPLACE FUNCTION is_account_member(account_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM account_users
    WHERE account_users.account_id = is_account_member.account_id
    AND account_users.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is admin of an account
CREATE OR REPLACE FUNCTION is_account_admin(account_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM account_users
    WHERE account_users.account_id = is_account_admin.account_id
    AND account_users.user_id = auth.uid()
    AND account_users.is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies for accounts
CREATE POLICY "Users can view accounts they belong to" ON accounts 
  FOR SELECT USING (is_account_member(id));
  
CREATE POLICY "Users can insert accounts" ON accounts 
  FOR INSERT WITH CHECK (true);

-- Create policies for account_users
CREATE POLICY "Users can view their account associations" ON account_users 
  FOR SELECT USING (
    -- Users can view their own associations
    user_id = auth.uid() OR 
    -- Admins can view all associations for their accounts
    is_account_admin(account_id)
  );
  
CREATE POLICY "Users can insert their own account associations" ON account_users 
  FOR INSERT WITH CHECK (user_id = auth.uid());
  
CREATE POLICY "Admins can insert account associations" ON account_users 
  FOR INSERT WITH CHECK (
    is_account_admin(account_id)
  );
  
CREATE POLICY "Users can update their own account associations" ON account_users 
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can update other account associations" ON account_users 
  FOR UPDATE USING (
    user_id != auth.uid() AND is_account_admin(account_id)
  );
  
CREATE POLICY "Users can delete their own account associations" ON account_users 
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Admins can delete other account associations" ON account_users 
  FOR DELETE USING (
    user_id != auth.uid() AND is_account_admin(account_id)
  );

-- Create policies for family_members
CREATE POLICY "Users can view family members in their accounts" ON family_members 
  FOR SELECT USING (is_account_member(account_id));
  
CREATE POLICY "Users can insert family members to their accounts" ON family_members 
  FOR INSERT WITH CHECK (is_account_member(account_id));
  
CREATE POLICY "Users can update family members in their accounts" ON family_members 
  FOR UPDATE USING (is_account_member(account_id));
  
CREATE POLICY "Users can delete family members in their accounts" ON family_members 
  FOR DELETE USING (is_account_member(account_id));

-- Create policies for chores
CREATE POLICY "Users can view chores in their accounts" ON chores 
  FOR SELECT USING (is_account_member(account_id));
  
CREATE POLICY "Users can insert chores to their accounts" ON chores 
  FOR INSERT WITH CHECK (is_account_member(account_id));
  
CREATE POLICY "Users can update chores in their accounts" ON chores 
  FOR UPDATE USING (is_account_member(account_id));
  
CREATE POLICY "Users can delete chores in their accounts" ON chores 
  FOR DELETE USING (is_account_member(account_id));

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
--    - In the table configuration, ensure the tables are enabled for real-time 