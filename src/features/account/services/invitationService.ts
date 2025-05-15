import { v4 as uuidv4 } from "uuid";
import { supabase } from "../../../supabase";
import * as accountService from "./accountService";

// Table name for invitations
export const INVITATIONS_TABLE = "invitations";

// Define the database record type
export interface InvitationRecord {
  id: string;
  account_id: string;
  account_name: string;
  token: string;
  created_by: string;
  created_at?: string;
  expires_at: string;
  is_used: boolean;
}

// App-level type
export interface Invitation {
  id: string;
  accountId: string;
  accountName: string;
  token: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  isUsed: boolean;
}

// Conversion function
export function toInvitation(record: InvitationRecord): Invitation {
  return {
    id: record.id,
    accountId: record.account_id,
    accountName: record.account_name,
    token: record.token,
    createdBy: record.created_by,
    createdAt: record.created_at || new Date().toISOString(),
    expiresAt: record.expires_at,
    isUsed: record.is_used,
  };
}

/**
 * Create a new invitation for an account
 * @param accountId Account ID to invite to
 * @returns The created invitation with token
 */
export async function createInvitation(accountId: string): Promise<Invitation> {
  try {
    // Get current user
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      throw new Error("User not authenticated");
    }

    const userId = authData.user.id;

    // Get the account to store its name
    const account = await accountService.getAccountById(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    // Generate a unique token
    const token = uuidv4();
    const id = uuidv4();

    // Create an expiration date 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation: InvitationRecord = {
      id,
      account_id: accountId,
      account_name: account.name,
      token,
      created_by: userId,
      expires_at: expiresAt.toISOString(),
      is_used: false,
    };

    const { error } = await supabase.from(INVITATIONS_TABLE).insert(invitation);

    if (error) {
      console.error("Error creating invitation:", error);
      throw error;
    }

    return toInvitation(invitation);
  } catch (error) {
    console.error("Error creating invitation:", error);
    throw error;
  }
}

/**
 * Get an invitation by its token
 * @param token The invitation token
 * @returns The invitation or null if not found
 */
export async function getInvitationByToken(
  token: string
): Promise<Invitation | null> {
  try {
    const { data, error } = await supabase
      .from(INVITATIONS_TABLE)
      .select("*")
      .eq("token", token)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      console.error("Error fetching invitation:", error);
      throw error;
    }

    return data ? toInvitation(data) : null;
  } catch (error) {
    console.error("Error fetching invitation:", error);
    throw error;
  }
}

/**
 * Mark an invitation as used
 * @param token The invitation token
 */
export async function markInvitationAsUsed(token: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(INVITATIONS_TABLE)
      .update({ is_used: true })
      .eq("token", token);

    if (error) {
      console.error("Error marking invitation as used:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error marking invitation as used:", error);
    throw error;
  }
}

/**
 * Validate an invitation token
 * @param token The invitation token
 * @returns Object containing validity status and error message if invalid
 */
export async function validateInvitation(token: string): Promise<{
  valid: boolean;
  invitation: Invitation | null;
  error?: string;
}> {
  try {
    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return { valid: false, invitation: null, error: "Invitation not found" };
    }

    // Check if invitation is already used
    if (invitation.isUsed) {
      return {
        valid: false,
        invitation: null,
        error: "This invitation has already been used",
      };
    }

    // Check if invitation is expired
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);
    if (now > expiresAt) {
      return {
        valid: false,
        invitation: null,
        error: "This invitation has expired",
      };
    }

    return { valid: true, invitation };
  } catch (error) {
    console.error("Error validating invitation:", error);
    return {
      valid: false,
      invitation: null,
      error: "Failed to validate invitation",
    };
  }
}

/**
 * Get the latest active (non-expired, unused) invitation for an account
 * @param accountId Account ID to find invitations for
 * @returns The latest active invitation or null if none exists
 */
export async function getLatestActiveInvitation(
  accountId: string
): Promise<Invitation | null> {
  try {
    const now = new Date().toISOString();

    // Get the latest active invitation for this account
    const { data, error } = await supabase
      .from(INVITATIONS_TABLE)
      .select("*")
      .eq("account_id", accountId)
      .eq("is_used", false)
      .gt("expires_at", now) // Not expired
      .order("created_at", { ascending: false }) // Latest first
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found (single() throws when no records)
        return null;
      }
      console.error("Error fetching latest invitation:", error);
      throw error;
    }

    return data ? toInvitation(data) : null;
  } catch (error) {
    // If the error is from single() with no results, just return null
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "PGRST116"
    ) {
      return null;
    }
    console.error("Error fetching latest invitation:", error);
    throw error;
  }
}
