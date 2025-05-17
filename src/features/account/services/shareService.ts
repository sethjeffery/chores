import { v4 as uuidv4 } from "uuid";
import { supabase } from "../../../supabase";

// Table name
export const SHARE_TOKENS_TABLE = "share_tokens";

// Define the database record types
export interface ShareTokenRecord {
  id: string;
  account_id: string;
  token: string;
  created_by: string;
  created_at?: string;
  last_used_at?: string | null;
}

// App-level types
export interface ShareToken {
  id: string;
  accountId: string;
  token: string;
  createdBy: string;
  createdAt?: string;
  lastUsedAt?: string | null;
}

// Conversion functions
export function toShareToken(record: ShareTokenRecord): ShareToken {
  return {
    id: record.id,
    accountId: record.account_id,
    token: record.token,
    createdBy: record.created_by,
    createdAt: record.created_at,
    lastUsedAt: record.last_used_at,
  };
}

/**
 * Get the account's share token, creating one if it doesn't exist
 */
export async function getOrCreateShareToken(
  accountId: string
): Promise<ShareToken> {
  try {
    // First check if there's already a token for this account
    const { data: existingTokens, error: fetchError } = await supabase
      .from(SHARE_TOKENS_TABLE)
      .select("*")
      .eq("account_id", accountId)
      .limit(1);

    if (fetchError) {
      console.error("Error fetching share token:", fetchError);
      throw fetchError;
    }

    // If token exists, return it
    if (existingTokens && existingTokens.length > 0) {
      return toShareToken(existingTokens[0]);
    }

    // Otherwise create a new one
    const id = uuidv4();
    // Generate a secure random token
    const token = uuidv4().replace(/-/g, "");

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from(SHARE_TOKENS_TABLE)
      .insert({
        id,
        account_id: accountId,
        token,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating share token:", error);
      throw error;
    }

    return toShareToken(data);
  } catch (error) {
    console.error("Error managing share token:", error);
    throw error;
  }
}

/**
 * Get account details using a share token
 */
export async function getAccountByToken(
  token: string
): Promise<{ id: string; name: string } | null> {
  try {
    // Get the token record first to find the account ID
    const { data: tokenData, error: tokenError } = await supabase
      .from(SHARE_TOKENS_TABLE)
      .select("account_id")
      .eq("token", token)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error("Invalid share token or token error:", tokenError);
      return null;
    }

    // Now get the account details
    const accountId = tokenData.account_id;
    const { data: accountData, error: accountError } = await supabase
      .from("accounts")
      .select("id, name")
      .eq("id", accountId)
      .maybeSingle();

    if (accountError || !accountData) {
      console.error("Error fetching account for token:", accountError);
      return null;
    }

    // Update the last used timestamp
    await supabase
      .from(SHARE_TOKENS_TABLE)
      .update({ last_used_at: new Date().toISOString() })
      .eq("token", token);

    return { id: accountData.id, name: accountData.name };
  } catch (error) {
    console.error("Error validating share token:", error);
    return null;
  }
}
