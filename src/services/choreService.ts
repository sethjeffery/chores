import { v4 as uuidv4 } from "uuid";
import { supabase, CHORES_TABLE, toChore, fromChore } from "../supabase";
import type { Chore, ColumnType } from "../types";

/**
 * Fetch all chores from Supabase
 */
export async function getChores(): Promise<Chore[]> {
  try {
    console.log("Attempting to fetch chores from Supabase...");
    const { data, error } = await supabase
      .from(CHORES_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching chores:", error);
      throw error;
    }

    console.log(`Successfully fetched ${data?.length ?? 0} chores`);
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
  title: string,
  assignee: string | null = null,
  reward: number | null = null,
  icon: string | null = null,
  column: ColumnType = assignee ? "TODO" : "IDEAS"
): Promise<string> {
  try {
    // Generate a UUID for the new chore
    const id = uuidv4();

    // Create a new chore object
    const newChore: Chore = {
      id,
      title,
      assignee,
      column,
      createdAt: new Date().toISOString(),
      reward,
      icon,
    };

    // Convert to database format
    const dbChore = fromChore(newChore);

    console.log("Adding new chore:", dbChore);
    const { error } = await supabase.from(CHORES_TABLE).insert(dbChore);

    if (error) {
      console.error("Error adding chore:", error);
      throw error;
    }

    console.log("Chore added with ID:", id);
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
  assigneeId: string,
  targetColumn?: ColumnType
): Promise<void> {
  try {
    // Get the current chore data
    const chores = await getChores();
    const chore = chores.find((c) => c.id === id);

    if (chore) {
      // If we have a target column specified, use that
      if (targetColumn) {
        await updateChore(id, { assignee: assigneeId, column: targetColumn });
      }
      // Otherwise, if assigning to someone, also move from IDEAS to TODO if needed
      else if (chore.column === "IDEAS") {
        await updateChore(id, { assignee: assigneeId, column: "TODO" });
      } else {
        // Keep the current column for other cases
        await updateChore(id, { assignee: assigneeId });
      }
    }
  } catch (error) {
    console.error(`Error reassigning chore ${id}:`, error);
    throw error;
  }
}
