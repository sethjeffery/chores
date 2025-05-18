import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/database.types';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

// Create admin client with service role to bypass regular permissions
const supabase = createClient<Database>(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Missing access token' });
  }

  // 1. Validate the token and get the user
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // 2. Get account_id from the request body
  const { account_id } = req.body;
  if (!account_id) {
    return res.status(400).json({ error: 'Missing account_id in request body' });
  }

  // 3. Verify the user is an admin for this account
  const { data: adminCheck, error: adminCheckError } = await supabase
    .from('account_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('account_id', account_id)
    .eq('is_admin', true)
    .single();

  if (adminCheckError || !adminCheck) {
    return res.status(403).json({ error: 'User is not an admin for this account' });
  }

  try {
    // 4. Get the account name for creating a new guest user
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('name')
      .eq('id', account_id)
      .single();

    if (accountError || !accountData) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // 5. Get the current guest user to delete
    const { data: guestUsers, error: guestUserError } = await supabase
      .from('account_users')
      .select('user_id')
      .eq('account_id', account_id)
      .eq('is_admin', false)
      .not('access_token', 'is', null);

    if (guestUserError) {
      return res.status(500).json({ error: 'Failed to find guest users', details: guestUserError });
    }

    // 6. Use REST API directly to delete the share token (bypassing RLS)
    try {
      // Make a direct DELETE request to Supabase REST API
      const restUrl = `${process.env.VITE_SUPABASE_URL}/rest/v1/share_tokens?account_id=eq.${account_id}`;
      const response = await fetch(restUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      });

      if (!response.ok) {
        console.error('Failed to delete share token via REST API, falling back to standard method');
      }
    } catch (restError) {
      console.error('Error with REST deletion, falling back:', restError);
    }

    // Fallback method using standard API (may work if service role bypasses RLS)
    await supabase
      .from('share_tokens')
      .delete()
      .eq('account_id', account_id);

    // 7. Delete existing guest user associations and users
    if (guestUsers && guestUsers.length > 0) {
      // First delete from account_users
      await supabase
        .from('account_users')
        .delete()
        .eq('account_id', account_id)
        .eq('is_admin', false)
        .in('user_id', guestUsers.map(u => u.user_id));

      // Then delete the users themselves
      for (const guestUser of guestUsers) {
        await supabase.auth.admin.deleteUser(guestUser.user_id);
      }
    }

    // 8. Create a new guest user
    const accountName = accountData.name;
    const guestEmail = `guest-${account_id}-${Date.now()}@pocketbunnies.com`;
    const guestPassword = crypto.randomUUID(); // Random secure password

    const { data: { user: newGuestUser }, error: newGuestError } =
      await supabase.auth.admin.createUser({
        email: guestEmail,
        password: guestPassword,
        email_confirm: true,
        user_metadata: {
          full_name: `${accountName} Guest`,
          is_guest: true
        },
      });

    if (newGuestError || !newGuestUser) {
      return res.status(500).json({
        error: 'Failed to create new guest user',
        details: newGuestError
      });
    }

    // 9. Sign in as the new guest user to get tokens
    const { data: { session: guestSession }, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: guestEmail,
        password: guestPassword,
      });

    if (signInError || !guestSession) {
      return res.status(500).json({
        error: 'Failed to sign in as guest user',
        details: signInError
      });
    }

    // 10. Add the guest user to the account with tokens
    const { error: insertUserError } = await supabase
      .from('account_users')
      .insert({
        account_id: account_id,
        user_id: newGuestUser.id,
        is_admin: false,
        user_email: guestEmail,
        user_name: `${accountName} Guest`,
        access_token: guestSession.access_token,
        refresh_token: guestSession.refresh_token,
      });

    if (insertUserError) {
      return res.status(500).json({
        error: 'Failed to associate guest user with account',
        details: insertUserError
      });
    }

    // 11. Create a new share token using REST API to bypass RLS
    // Generate a user-friendly token using nanoid (10 characters is a good balance)
    const friendlyToken = nanoid(10);

    let newToken;

    try {
      // Make a direct POST request to Supabase REST API
      const restUrl = `${process.env.VITE_SUPABASE_URL}/rest/v1/share_tokens`;
      const response = await fetch(restUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          account_id: account_id,
          access_token: guestSession.access_token,
          refresh_token: guestSession.refresh_token,
          token: friendlyToken // Use the nanoid generated token
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`REST API error: ${errorText}`);
      }

      const result = await response.json();
      if (result && Array.isArray(result) && result.length > 0) {
        newToken = result[0].token;
      } else {
        throw new Error('Invalid response format from REST API');
      }
    } catch (restError) {
      console.error('Error with REST API, attempting standard method:', restError);

      // Fallback to standard method
      const { data: insertedToken, error: insertError } = await supabase
        .from('share_tokens')
        .insert({
          account_id: account_id,
          access_token: guestSession.access_token,
          refresh_token: guestSession.refresh_token,
          token: friendlyToken // Use the nanoid generated token
        })
        .select('token')
        .single();

      if (insertError || !insertedToken) {
        return res.status(500).json({
          error: 'Failed to create share token. RLS policy is preventing insertion with service role.',
          details: insertError || 'No token returned'
        });
      }

      newToken = insertedToken.token;
    }

    if (!newToken) {
      return res.status(500).json({
        error: 'Failed to create share token - no token generated'
      });
    }

    // Return success with the new token
    return res.status(200).json({
      success: true,
      token: newToken,
      message: 'Share token successfully rebuilt'
    });

  } catch (err) {
    console.error('Error rebuilding share token:', err);
    return res.status(500).json({ error: 'Internal server error', details: err });
  }
} 