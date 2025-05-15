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
  user_id?: string | null;
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
 */
export async function getFamilyMembers(): Promise<FamilyMember[]> {
  try {
    console.log("Fetching family members from Supabase...");
    const { data, error } = await supabase
      .from(FAMILY_MEMBERS_TABLE)
      .select("*")
      .order("dob", { ascending: true }); // Order by dob ascending (oldest first)

    if (error) {
      console.error("Error fetching family members:", error);
      throw error;
    }

    console.log(`Successfully fetched ${data?.length ?? 0} family members`);
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
 */
export async function addFamilyMember(
  name: string,
  avatar: string | null = null,
  color: string | null = null,
  dob: string | null = null
): Promise<string> {
  try {
    const id = uuidv4();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase.from(FAMILY_MEMBERS_TABLE).insert({
      id,
      name,
      avatar,
      color,
      dob,
      user_id: user.id,
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
