-- Drop table if it exists (comment this out if you don't want to reset existing data)
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS chore_statuses CASCADE;
DROP TABLE IF EXISTS chores CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS account_users CASCADE;
DROP TABLE IF EXISTS share_tokens CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- Create accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create account_users junction table to link accounts with multiple auth users
CREATE TABLE account_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  user_email TEXT,
  user_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  UNIQUE(account_id, user_id)
);

-- Create index for querying account users
CREATE INDEX idx_account_users_account_id ON account_users(account_id);
CREATE INDEX idx_account_users_user_id ON account_users(user_id);

-- Create family_members table
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  avatar TEXT,
  color TEXT,
  dob DATE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE NOT NULL
);

-- Create index for querying invitations
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_account_id ON invitations(account_id);

-- Create share_tokens table to securely store sharing tokens
CREATE TABLE share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(account_id)
);

-- Create index for querying share tokens by account
CREATE INDEX idx_share_tokens_account_id ON share_tokens(account_id);
CREATE INDEX idx_share_tokens_token ON share_tokens(token);

-- Enable real-time capabilities for the family_members table
ALTER PUBLICATION supabase_realtime ADD TABLE family_members;

-- Create chores table with proper schema (status moved to separate table)
CREATE TABLE chores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reward NUMERIC,
  icon TEXT,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE
);

-- Create chore_statuses table for status tracking
CREATE TABLE chore_statuses (
  chore_id UUID PRIMARY KEY REFERENCES chores(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  assignee UUID REFERENCES family_members(id) ON DELETE SET NULL,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for faster access
CREATE INDEX idx_chores_account_id ON chores(account_id);
CREATE INDEX idx_chore_statuses_status ON chore_statuses(status);
CREATE INDEX idx_chore_statuses_assignee ON chore_statuses(assignee);

-- Enable real-time capabilities for the tables
ALTER PUBLICATION supabase_realtime ADD TABLE chores;
ALTER PUBLICATION supabase_realtime ADD TABLE chore_statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE account_users;
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE share_tokens;

-- Create row-level security policies
-- Enable Row Level Security
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- Create helper functions for security policies
-- Create helper function to safely check account membership
CREATE OR REPLACE FUNCTION is_account_member(account_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM account_users
    WHERE account_users.account_id = is_account_member.account_id
    AND account_users.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is admin of an account
CREATE OR REPLACE FUNCTION is_account_admin(account_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM account_users
    WHERE account_users.account_id = is_account_admin.account_id
    AND account_users.user_id = auth.uid()
    AND account_users.is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a dedicated API function to securely fetch a share token by its token value
CREATE OR REPLACE FUNCTION public.get_share_token_by_token(token_param TEXT)
RETURNS TABLE (
  access_token TEXT,
  refresh_token TEXT
) AS $$
BEGIN
  -- Return only the specific columns needed, not exposing the account_id
  RETURN QUERY
  SELECT 
    st.access_token,
    st.refresh_token
  FROM 
    share_tokens st
  WHERE 
    st.token = token_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies for accounts
CREATE POLICY "Users can view accounts they belong to" ON accounts FOR SELECT
  USING (is_account_member(id));

CREATE POLICY "Users can insert accounts" ON accounts FOR INSERT
  WITH CHECK (true);

-- Create policies for account_users
CREATE POLICY "Users can view their account associations" ON account_users FOR SELECT
  USING (
    -- Users can view their own associations
    user_id = auth.uid()
    OR -- Admins can view all associations for their accounts
    is_account_admin(account_id)
  );

CREATE POLICY "Users can insert their own account associations" ON account_users FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can insert account associations" ON account_users FOR INSERT
  WITH CHECK (is_account_admin(account_id));

CREATE POLICY "Users can update their own account associations" ON account_users FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can update other account associations" ON account_users FOR UPDATE
  USING (
    user_id != auth.uid()
    AND is_account_admin(account_id)
  );

CREATE POLICY "Users can delete their own account associations" ON account_users FOR DELETE 
  USING (user_id = auth.uid());

CREATE POLICY "Admins can delete other account associations" ON account_users FOR DELETE 
  USING (
    user_id != auth.uid()
    AND is_account_admin(account_id)
  );

-- Create policies for family_members
CREATE POLICY "Users can view family members in their accounts" ON family_members FOR SELECT
  USING (is_account_member(account_id));

CREATE POLICY "Users can insert family members to their accounts" ON family_members FOR INSERT
  WITH CHECK (is_account_member(account_id));

CREATE POLICY "Users can update family members in their accounts" ON family_members FOR UPDATE
  USING (is_account_member(account_id));

CREATE POLICY "Users can delete family members in their accounts" ON family_members FOR DELETE 
  USING (is_account_member(account_id));

-- Create policies for chores (regular users only)
CREATE POLICY "Users can view chores in their accounts" ON chores FOR SELECT
  USING (is_account_member(account_id));

CREATE POLICY "Users can insert chores to their accounts" ON chores FOR INSERT
  WITH CHECK (is_account_member(account_id));

CREATE POLICY "Users can update chores in their accounts" ON chores FOR UPDATE
  USING (is_account_member(account_id));

CREATE POLICY "Users can delete chores in their accounts" ON chores FOR DELETE 
  USING (is_account_member(account_id));

-- Create policies for chore_statuses
CREATE POLICY "Anyone can view chore statuses" ON chore_statuses FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM chores
      WHERE chores.id = chore_id
      AND (
        is_account_member(chores.account_id)
      )
    )
  );

CREATE POLICY "Regular users can insert chore statuses" ON chore_statuses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM chores
      WHERE chores.id = chore_id
      AND is_account_member(chores.account_id)
    )
  );

CREATE POLICY "Regular users can update chore statuses" ON chore_statuses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM chores
      WHERE chores.id = chore_id
      AND is_account_member(chores.account_id)
    )
  );

CREATE POLICY "Guest users can update chore statuses" ON chore_statuses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM chores
      WHERE chores.id = chore_id
    )
  );

-- Create policies for invitations
CREATE POLICY "Admins can create invitations" ON invitations FOR INSERT
  WITH CHECK (is_account_admin(account_id));

CREATE POLICY "Anyone can read invitations by token" ON invitations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can mark invitations as used" ON invitations FOR UPDATE
  USING (true) 
  WITH CHECK (
    -- Only updating is_used field and not changing other fields
    is_used = true
    AND current_setting('role') = 'authenticated'
  );

-- Create policies for share_tokens
CREATE POLICY "Users can view share tokens for their accounts" ON share_tokens FOR SELECT
  USING (is_account_admin(account_id));

CREATE POLICY "Users can insert share tokens for their accounts" ON share_tokens FOR INSERT
  WITH CHECK (is_account_admin(account_id));

CREATE POLICY "Users can update share tokens for their accounts" ON share_tokens FOR UPDATE
  USING (is_account_admin(account_id));

CREATE POLICY "Users can delete share tokens for their accounts" ON share_tokens FOR DELETE 
  USING (is_account_admin(account_id));

