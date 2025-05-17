-- Drop table if it exists (comment this out if you don't want to reset existing data)
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS chores CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS account_users CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS share_tokens CASCADE;

-- Create accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create account_users junction table to link accounts with multiple auth users
CREATE TABLE account_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  user_email TEXT,
  user_name TEXT,
  UNIQUE(account_id, user_id)
);

-- Create index for querying account users
CREATE INDEX idx_account_users_account_id ON account_users(account_id);
CREATE INDEX idx_account_users_user_id ON account_users(user_id);

-- Create family_members table
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  avatar TEXT,
  color TEXT,
  dob DATE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE
);

-- Create index for querying family members by account
CREATE INDEX idx_family_members_account_id ON family_members(account_id);

-- Create invitations table for account invites via QR code
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL, -- Store account name for invitees without account access
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE NOT NULL
);

-- Create index for querying invitations
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_account_id ON invitations(account_id);

-- Enable real-time capabilities for the family_members table
ALTER PUBLICATION supabase_realtime ADD TABLE family_members;

-- Create chores table with proper schema
CREATE TABLE chores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  assignee UUID REFERENCES family_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reward NUMERIC,
  icon TEXT,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE
);

-- Create share_tokens table for public read-only access
CREATE TABLE share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create index for querying tokens
CREATE INDEX idx_share_tokens_token ON share_tokens(token);
CREATE INDEX idx_share_tokens_account_id ON share_tokens(account_id);
CREATE UNIQUE INDEX idx_share_tokens_one_per_account ON share_tokens(account_id);

-- Create indexes for faster access
CREATE INDEX idx_chores_status ON chores(status);
CREATE INDEX idx_chores_account_id ON chores(account_id);
CREATE INDEX idx_chores_assignee ON chores(assignee);

-- Enable real-time capabilities for the tables
ALTER PUBLICATION supabase_realtime ADD TABLE chores;
ALTER PUBLICATION supabase_realtime ADD TABLE account_users;
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE share_tokens;

-- Create row-level security policies
-- Enable Row Level Security
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- Create helper functions for security policies

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

-- Create helper function to check if user is admin of an account
CREATE OR REPLACE FUNCTION is_account_share_token(account_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM share_tokens
    WHERE share_tokens.account_id = is_account_share_token.account_id
    AND share_tokens.token = get_share_token()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get the current token from the JWT
CREATE OR REPLACE FUNCTION current_token() RETURNS TEXT AS $$
DECLARE
  jwt_claims JSON;
BEGIN
  -- Get JWT claims from the current request
  jwt_claims := current_setting('request.jwt.claims', true)::json;
  
  -- Extract the access token (which is the session token)
  IF jwt_claims IS NOT NULL THEN
    -- JWT token or session token
    RETURN jwt_claims ->> 'jti';
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_share_token() RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('request.headers', true)::json->>'x-share-token';
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies for accounts
CREATE POLICY "Users can view accounts they belong to" ON accounts 
  FOR SELECT USING (is_account_member(id) OR is_account_share_token(id));
  
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
  FOR SELECT USING (
    is_account_member(account_id) OR is_account_share_token(account_id)
  );
  
CREATE POLICY "Users can insert family members to their accounts" ON family_members 
  FOR INSERT WITH CHECK (is_account_member(account_id));
  
CREATE POLICY "Users can update family members in their accounts" ON family_members 
  FOR UPDATE USING (is_account_member(account_id));
  
CREATE POLICY "Users can delete family members in their accounts" ON family_members 
  FOR DELETE USING (is_account_member(account_id));

-- Create policies for chores
CREATE POLICY "Users can view chores in their accounts" ON chores 
  FOR SELECT USING (
    is_account_member(account_id) OR is_account_share_token(account_id)
  );
  
CREATE POLICY "Users can insert chores to their accounts" ON chores 
  FOR INSERT WITH CHECK (is_account_member(account_id));
  
CREATE POLICY "Users can update chores in their accounts" ON chores 
  FOR UPDATE USING (is_account_member(account_id));
  
CREATE POLICY "Users can delete chores in their accounts" ON chores 
  FOR DELETE USING (is_account_member(account_id));

-- Create policies for invitations
CREATE POLICY "Users can create invitations" ON invitations
  FOR INSERT
  WITH CHECK (
    -- Only account admins can create invitations
    is_account_admin(account_id)
  );

CREATE POLICY "Anyone can read invitations by token" ON invitations
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can mark invitations as used" ON invitations
  FOR UPDATE
  USING (true)
  WITH CHECK (
    -- Only updating is_used field and not changing other fields
    is_used = true AND
    current_setting('role') = 'authenticated'
  );

-- Create policies for share_tokens
CREATE POLICY "Users can view share tokens they created" ON share_tokens
  FOR SELECT USING (
    created_by = auth.uid() OR
    is_account_admin(account_id)
  );

CREATE POLICY "Admins can create share tokens" ON share_tokens
  FOR INSERT WITH CHECK (
    is_account_admin(account_id)
  );

CREATE POLICY "Admins can update their share tokens" ON share_tokens
  FOR UPDATE USING (
    created_by = auth.uid() AND
    is_account_admin(account_id)
  );

CREATE POLICY "Admins can delete their share tokens" ON share_tokens
  FOR DELETE USING (
    created_by = auth.uid() AND
    is_account_admin(account_id)
  );

CREATE POLICY "Users can view share tokens via share token" ON share_tokens
  FOR SELECT USING (
    token = get_share_token()
  );

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

-- 8. Enable passwordless authentication (magic link sign-in):
--    - Go to Authentication > Providers > Email
--    - Turn OFF "Enable Email Signup" 
--    - Turn ON "Enable email confirmations" (this is for magic links)
--    - Under "Customize the email template", personalize the message as needed
--    - Save changes
--
--    In your application code, to implement magic link sign-in:
--    - Use the Supabase client's auth.signInWithOtp() method:
--      await supabase.auth.signInWithOtp({ 
--        email: 'user@example.com',
--        options: { redirectTo: 'https://yourapp.com/auth/callback' }
--      });
--    - This will send a magic link to the user's email
--    - When they click the link, they'll be signed in without needing a password 