import { v4 as uuidv4 } from "uuid";
import { supabase } from "../../../supabase";
import type { FamilyMember } from "../../../types";
import { DEFAULT_FAMILY_MEMBERS } from "../constants/defaultMembers";

// Table name
export const FAMILY_MEMBERS_TABLE = "family_members";

// Define the database record type
export interface FamilyMemberRecord {
  id: string;
  name: string;
  avatar?: string | null;
  color?: string | null;
  dob?: string | null;
  created_at?: string;
  account_id?: string | null;
}

// Convert from DB to app format
export function toFamilyMember(record: FamilyMemberRecord): FamilyMember {
  return {
    id: record.id,
    name: record.name,
    avatar: record.avatar || null,
    color: record.color || null,
    dob: record.dob || null,
  };
}

// Convert from app to DB format
export function fromFamilyMember(
  member: Partial<FamilyMember>
): Partial<FamilyMemberRecord> {
  const result: Partial<FamilyMemberRecord> = {};

  if (member.id !== undefined) result.id = member.id;
  if (member.name !== undefined) result.name = member.name;
  if (member.avatar !== undefined) result.avatar = member.avatar;
  if (member.color !== undefined) result.color = member.color;
  if (member.dob !== undefined) result.dob = member.dob;

  return result;
}

/**
 * Fetch all family members from Supabase, ordered by age (oldest to youngest)
 * Now requires an accountId parameter to fetch family members for a specific account
 */
export async function getFamilyMembers(
  accountId: string
): Promise<FamilyMember[]> {
  try {
    if (!accountId) {
      throw new Error("Account ID is required to fetch family members");
    }

    console.log(
      `Fetching family members for account ${accountId} from Supabase...`
    );
    const { data, error } = await supabase
      .from(FAMILY_MEMBERS_TABLE)
      .select("*")
      .eq("account_id", accountId)
      .order("dob", { ascending: true }); // Order by dob ascending (oldest first)

    if (error) {
      console.error("Error fetching family members:", error);
      throw error;
    }

    console.log(
      `Successfully fetched ${
        data?.length ?? 0
      } family members for account ${accountId}`
    );
    return (data || []).map(toFamilyMember);
  } catch (error) {
    console.error("Error fetching family members:", error);

    // Handle first-time use where table might not exist yet
    if (error instanceof Error && error.message.includes("does not exist")) {
      console.log(
        "Family members table does not exist yet. Returning default members."
      );
      return DEFAULT_FAMILY_MEMBERS;
    }

    throw error;
  }
}

/**
 * Add a new family member to Supabase
 * Now requires an accountId parameter to associate the family member with an account
 */
export async function addFamilyMember(
  member: Partial<FamilyMember>,
  accountId: string
): Promise<string> {
  try {
    if (!accountId) {
      throw new Error("Account ID is required to add a family member");
    }

    if (!member.name) {
      throw new Error("Name is required to add a family member");
    }

    const id = uuidv4();

    const { error } = await supabase.from(FAMILY_MEMBERS_TABLE).insert({
      id,
      name: member.name,
      avatar: member.avatar || null,
      color: member.color || null,
      dob: member.dob || null,
      account_id: accountId,
    });

    if (error) {
      console.error("Error adding family member:", error);
      throw error;
    }

    return id;
  } catch (error) {
    console.error("Error adding family member:", error);
    throw error;
  }
}

/**
 * Update an existing family member in Supabase
 */
export async function updateFamilyMember(
  id: string,
  updates: Partial<FamilyMember>
): Promise<void> {
  try {
    // Convert to database format
    const dbUpdates = fromFamilyMember(updates);

    const { error } = await supabase
      .from(FAMILY_MEMBERS_TABLE)
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      console.error(`Error updating family member ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error updating family member ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a family member from Supabase
 */
export async function deleteFamilyMember(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(FAMILY_MEMBERS_TABLE)
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`Error deleting family member ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error deleting family member ${id}:`, error);
    throw error;
  }
}

/**
 * Migrate family members from user_id to account_id
 * This is a one-time migration function to move existing data
 */
export async function migrateFamilyMembersToAccount(
  userId: string,
  accountId: string
): Promise<void> {
  try {
    // First check if the user_id column exists
    const { data: columnData, error: columnError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "family_members")
      .eq("column_name", "user_id")
      .single();

    if (columnError || !columnData) {
      console.log(
        "No user_id column in family_members table, skipping migration"
      );
      return;
    }

    // Update family members with the specified user_id to use the new account_id
    const { error } = await supabase
      .from(FAMILY_MEMBERS_TABLE)
      .update({ account_id: accountId })
      .eq("user_id", userId);

    if (error) {
      console.error("Error migrating family members:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error migrating family members:", error);
    throw error;
  }
}
