import { v4 as uuidv4 } from "uuid";
import { supabase, CHORES_TABLE } from "../../../supabase";
import type { Chore, ColumnType } from "../../../types";

// Database type for Supabase
export type ChoreTable = {
  id: string;
  title: string;
  // Now a UUID reference to family_members.id
  assignee: string | null;
  status: string;
  created_at: string;
  reward: number | null;
  icon: string | null;
  account_id: string | null;
};

// Convert from DB to app format
export function toChore(record: ChoreTable): Chore {
  return {
    id: record.id,
    title: record.title,
    assignee: record.assignee,
    column: record.status as ColumnType,
    createdAt: record.created_at,
    reward: record.reward,
    icon: record.icon,
  };
}

// Convert from app to DB format
export function fromChore(chore: Partial<Chore>): Partial<ChoreTable> {
  const result: Partial<ChoreTable> = {};

  if (chore.id !== undefined) result.id = chore.id;
  if (chore.title !== undefined) result.title = chore.title;
  if (chore.assignee !== undefined) result.assignee = chore.assignee;
  if (chore.column !== undefined) result.status = chore.column;
  if (chore.createdAt !== undefined) result.created_at = chore.createdAt;
  if (chore.reward !== undefined) result.reward = chore.reward;
  if (chore.icon !== undefined) result.icon = chore.icon;

  return result;
}

/**
 * Fetch all chores from Supabase for a specific account
 */
export async function getChores(accountId: string): Promise<Chore[]> {
  try {
    if (!accountId) {
      throw new Error("Account ID is required to fetch chores");
    }

    console.log(
      `Attempting to fetch chores for account ${accountId} from Supabase...`
    );
    const { data, error } = await supabase
      .from(CHORES_TABLE)
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching chores:", error);
      throw error;
    }

    console.log(
      `Successfully fetched ${
        data?.length ?? 0
      } chores for account ${accountId}`
    );
    return (data || []).map(toChore);
  } catch (error) {
    console.error("Error fetching chores:", error);

    // Handle first-time use where table might not exist yet
    if (error instanceof Error && error.message.includes("does not exist")) {
      console.log("Chores table does not exist yet. Returning empty array.");
      return [];
    }

    throw error;
  }
}

/**
 * Add a new chore to Supabase
 */
export async function addChore(
  chore: Partial<Chore> & { title: string },
  accountId: string
): Promise<string> {
  try {
    if (!accountId) {
      throw new Error("Account ID is required to add a chore");
    }

    const id = uuidv4();
    const column = chore.column || (chore.assignee ? "TODO" : "IDEAS");

    const { error } = await supabase.from(CHORES_TABLE).insert({
      id,
      title: chore.title,
      assignee: chore.assignee || null,
      status: column,
      reward: chore.reward || null,
      icon: chore.icon || null,
      created_at: new Date().toISOString(),
      account_id: accountId,
    });

    if (error) {
      console.error("Error adding chore:", error);
      throw error;
    }

    return id;
  } catch (error) {
    console.error("Error adding chore:", error);
    throw error;
  }
}

/**
 * Update an existing chore in Supabase
 */
export async function updateChore(
  id: string,
  updates: Partial<Chore>
): Promise<void> {
  try {
    // Convert to database format
    const dbUpdates = fromChore(updates);

    const { error } = await supabase
      .from(CHORES_TABLE)
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      console.error(`Error updating chore ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error updating chore ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a chore from Supabase
 */
export async function deleteChore(id: string): Promise<void> {
  try {
    const { error } = await supabase.from(CHORES_TABLE).delete().eq("id", id);

    if (error) {
      console.error(`Error deleting chore ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error deleting chore ${id}:`, error);
    throw error;
  }
}

/**
 * Move a chore to a different column
 */
export async function moveChore(id: string, column: ColumnType): Promise<void> {
  try {
    // If moving to IDEAS, also remove assignee
    if (column === "IDEAS") {
      await updateChore(id, { column, assignee: null });
    } else {
      await updateChore(id, { column });
    }
  } catch (error) {
    console.error(`Error moving chore ${id}:`, error);
    throw error;
  }
}

/**
 * Reassign a chore to a different family member
 */
export async function reassignChore(
  id: string,
  assigneeId: string, // UUID of the family member
  targetColumn?: ColumnType
): Promise<void> {
  try {
    // If target column is provided, use it
    if (targetColumn) {
      await updateChore(id, { assignee: assigneeId, column: targetColumn });
    } else {
      // Otherwise, get the current chore
      const { data, error } = await supabase
        .from(CHORES_TABLE)
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      // If chore was in IDEAS, move to TODO when assigned
      if (data && data.status === "IDEAS") {
        await updateChore(id, { assignee: assigneeId, column: "TODO" });
      } else {
        // Otherwise just update the assignee
        await updateChore(id, { assignee: assigneeId });
      }
    }
  } catch (error) {
    console.error(`Error reassigning chore ${id}:`, error);
    throw error;
  }
}

/**
 * Migrate chores from user_id to account_id
 * This is a one-time migration function to move existing data
 */
export async function migrateChoreToAccount(
  userId: string,
  accountId: string
): Promise<void> {
  try {
    // First check if the user_id column exists
    const { data: columnData, error: columnError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "chores")
      .eq("column_name", "user_id")
      .single();

    if (columnError || !columnData) {
      console.log("No user_id column in chores table, skipping migration");
      return;
    }

    // Update chores with the specified user_id to use the new account_id
    const { error } = await supabase
      .from(CHORES_TABLE)
      .update({ account_id: accountId })
      .eq("user_id", userId);

    if (error) {
      console.error("Error migrating chores:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error migrating chores:", error);
    throw error;
  }
}
