import { supabase } from "../../../supabase";

/**
 * Get the account's share token
 */
export async function getShareToken(
  accountId: string
): Promise<{ token: string; accessToken: string; refreshToken: string }> {
  // First, try to get an existing share token
  const { data: shareTokens } = await supabase
    .from("share_tokens")
    .select("token, access_token, refresh_token")
    .eq("account_id", accountId)
    .limit(1);

  // If token exists, return it
  if (shareTokens && shareTokens.length > 0) {
    return {
      token: shareTokens[0].token,
      accessToken: shareTokens[0].access_token,
      refreshToken: shareTokens[0].refresh_token,
    };
  }

  // If no token exists (and no error), we need to create one
  // First, get the guest user access tokens
  const { data: accountUsers, error: accountUsersError } = await supabase
    .from("account_users")
    .select("access_token, refresh_token")
    .eq("account_id", accountId)
    .eq("is_admin", false)
    .not("access_token", "is", null)
    .limit(1);

  if (accountUsersError) {
    throw accountUsersError;
  }

  if (!accountUsers || accountUsers.length === 0) {
    throw new Error("No guest user found for this account");
  }

  // Create a new share token
  const { data: newShareToken, error: insertError } = await supabase
    .from("share_tokens")
    .insert({
      account_id: accountId,
      access_token: accountUsers[0].access_token ?? "",
      refresh_token: accountUsers[0].refresh_token ?? "",
    })
    .select("token, access_token, refresh_token")
    .single();

  if (insertError) {
    throw insertError;
  }

  if (!newShareToken) {
    throw new Error("Failed to create share token");
  }

  return {
    token: newShareToken.token,
    accessToken: newShareToken.access_token,
    refreshToken: newShareToken.refresh_token,
  };
}

/**
 * Get account access details from a share token
 */
export async function getAccountFromShareToken(
  token: string
): Promise<{ accountId: string; accessToken: string; refreshToken: string }> {
  const { data, error } = await supabase
    .from("share_tokens")
    .select("account_id, access_token, refresh_token")
    .eq("token", token)
    .single();

  if (error) {
    throw error;
  }

  return {
    accountId: data.account_id,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

/**
 * Refresh the share token with new guest access credentials
 */
export async function refreshShareToken(accountId: string): Promise<boolean> {
  // Get the guest user access tokens
  const { data: accountUsers, error: accountUsersError } = await supabase
    .from("account_users")
    .select("access_token, refresh_token")
    .eq("account_id", accountId)
    .eq("is_admin", false)
    .not("access_token", "is", null)
    .limit(1);

  if (accountUsersError || !accountUsers || accountUsers.length === 0) {
    return false;
  }

  // Update the share token with new credentials
  const { error: updateError } = await supabase
    .from("share_tokens")
    .update({
      access_token: accountUsers[0].access_token ?? "",
      refresh_token: accountUsers[0].refresh_token ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", accountId);

  return !updateError;
}
