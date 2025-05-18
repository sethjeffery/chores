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
    .limit(1)
    .throwOnError();

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
  const { data: accountUsers } = await supabase
    .from("account_users")
    .select("access_token, refresh_token")
    .eq("account_id", accountId)
    .eq("is_admin", false)
    .not("access_token", "is", null)
    .limit(1)
    .throwOnError();

  if (!accountUsers || accountUsers.length === 0) {
    throw new Error("No guest user found for this account");
  }

  // Create a new share token
  const { data: newShareToken } = await supabase
    .from("share_tokens")
    .insert({
      account_id: accountId,
      access_token: accountUsers[0].access_token ?? "",
      refresh_token: accountUsers[0].refresh_token ?? "",
    })
    .select("token, access_token, refresh_token")
    .single()
    .throwOnError();

  return {
    token: newShareToken.token,
    accessToken: newShareToken.access_token,
    refreshToken: newShareToken.refresh_token,
  };
}
