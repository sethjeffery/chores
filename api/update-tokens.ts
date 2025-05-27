import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/database.types';

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
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { access_token, refresh_token, is_share_token } = req.body;

  if (!access_token || !refresh_token) {
    return res.status(400).json({ error: 'Missing token values in body' });
  }

  let updateError;

  if (is_share_token) {
    // Handle share token update
    // First, try to find the share token that uses the old access token
    let shareTokenToUpdate;
    let findError;

    if (req.body.old_access_token) {
      const { data: shareTokens, error: findByOldTokenError } = await supabase
        .from('share_tokens')
        .select('id, account_id')
        .eq('access_token', req.body.old_access_token)
        .limit(1);

      if (!findByOldTokenError && shareTokens && shareTokens.length > 0) {
        shareTokenToUpdate = shareTokens[0];
      } else {
        findError = findByOldTokenError;
      }
    }

    // If we couldn't find by old token, try to find by the current access token
    // This handles cases where the token might have already been updated
    if (!shareTokenToUpdate) {
      const { data: shareTokens, error: findByCurrentTokenError } = await supabase
        .from('share_tokens')
        .select('id, account_id')
        .eq('access_token', access_token)
        .limit(1);

      if (!findByCurrentTokenError && shareTokens && shareTokens.length > 0) {
        shareTokenToUpdate = shareTokens[0];
      } else {
        findError = findByCurrentTokenError;
      }
    }

    if (!shareTokenToUpdate) {
      return res.status(404).json({
        error: 'Share token not found',
        details: findError,
        debug: {
          old_access_token: req.body.old_access_token ? 'provided' : 'missing',
          new_access_token: access_token ? 'provided' : 'missing'
        }
      });
    }

    // Update the share token with new credentials
    const { error: updateShareError } = await supabase
      .from('share_tokens')
      .update({
        access_token,
        refresh_token,
        updated_at: new Date().toISOString()
      })
      .eq('id', shareTokenToUpdate.id);

    updateError = updateShareError;
  } else {
    // Handle regular user token update in account_users table
    const { error: updateUserError } = await supabase
      .from('account_users')
      .update({
        access_token,
        refresh_token
      })
      .eq('user_id', user.id);

    updateError = updateUserError;
  }

  if (updateError) {
    console.error('Failed to update tokens:', updateError);
    return res.status(500).json({ error: 'Failed to update tokens', details: updateError });
  }

  console.log('Successfully updated tokens for', is_share_token ? 'share token' : 'user');
  return res.status(200).json({ success: true });
}
