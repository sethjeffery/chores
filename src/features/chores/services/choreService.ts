import { supabase } from "../../../supabase";
import type { Chore, ChoreStatus, ColumnType } from "../../../types";
import type { Database } from "../../../database.types";

type DbChore = Database["public"]["Tables"]["chores"]["Row"];
type DbChoreStatus = Database["public"]["Tables"]["chore_statuses"]["Row"];

type DbChoreUpdate = Database["public"]["Tables"]["chores"]["Update"];
type DbChoreStatusUpdate = Database["public"]["Tables"]["chore_statuses"]["Update"];

export type InsertChore = Pick<Chore, "title" | "reward" | "icon"> & { status?: Pick<ChoreStatus, 'assignee'> }

// Convert from DB to app format
export function toChoreStatus(record: DbChoreStatus): ChoreStatus {
  return {
    choreId: record.chore_id,
    status: record.status as ColumnType,
    assignee: record.assignee,
    lastUpdatedAt: record.last_updated_at,
  };
}

// Convert from DB to app format
export function toChore(
  record: DbChore,
  statusRecord?: DbChoreStatus
): Chore {
  const result: Chore = {
    id: record.id,
    title: record.title,
    createdAt: record.created_at ?? '',
    reward: record.reward,
    icon: record.icon,
    status: statusRecord ? toChoreStatus(statusRecord) : undefined,
  };

  if (statusRecord) {
    result.status = toChoreStatus(statusRecord);
  }

  return result;
}

export function fromChoreStatus(choreStatus: Partial<ChoreStatus>): DbChoreStatusUpdate {
  const result: DbChoreStatusUpdate = {}

  if (choreStatus.status !== undefined) result.status = choreStatus.status;
  if (choreStatus.assignee !== undefined) result.assignee = choreStatus.assignee;

  result.last_updated_at = new Date().toISOString();
  return result;
}

// Convert from app to DB format
export function fromChore(chore: Partial<Chore>): DbChoreUpdate {
  const result: DbChoreUpdate = {}

  if (chore.id !== undefined) result.id = chore.id;
  if (chore.title !== undefined) result.title = chore.title;
  if (chore.createdAt !== undefined) result.created_at = chore.createdAt;
  if (chore.reward !== undefined) result.reward = chore.reward;
  if (chore.icon !== undefined) result.icon = chore.icon;

  return result;
}

/**
 * Fetch all chores from Supabase for a specific account
 */
export async function getChores(accountId: string): Promise<Chore[]> {
  if (!accountId) {
    throw new Error("Account ID is required to fetch chores");
  }

  const { data: choresData } = await supabase
    .from('chores')
    .select("*, chore_statuses(*)")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .throwOnError();

  return choresData.map((chore) => toChore(chore, chore.chore_statuses ?? undefined));
}

/**
 * Add a new chore to Supabase
 */
export async function addChore(
  chore: InsertChore,
  accountId: string
): Promise<Chore> {
  // Insert the chore
  const { data } = await supabase.from('chores').insert({
    title: chore.title,
    reward: chore.reward || null,
    icon: chore.icon || null,
    created_at: new Date().toISOString(),
    account_id: accountId,
  }).select().single().throwOnError();

  const { data: statusData, error: statusError } = await supabase
    .from('chore_statuses')
    .insert({
      chore_id: data.id,
      status: chore.status?.assignee ? "TODO" : "IDEAS",
      assignee: chore.status?.assignee ?? null,
      last_updated_at: new Date().toISOString(),
    }).select().single();

  if (statusError) {
    console.error("Error adding chore status:", statusError);
    await supabase.from('chores').delete().eq("id", data.id);
    throw statusError;
  }

  return toChore(data, statusData!);
}

/**
 * Delete a chore from Supabase
 */
export async function deleteChore(id: string): Promise<void> {
  await supabase.from('chores').delete().eq("id", id).throwOnError();
}

/**
 * Move a chore to a different column
 */
export async function moveChore(id: string, column: ColumnType): Promise<void> {
  await supabase
    .from('chore_statuses')
    .update(column === "IDEAS" ? { assignee: null, status: column } : { status: column })
    .eq("chore_id", id)
    .throwOnError();
}

/**
 * Reassign a chore to a different family member
 */
export async function reassignChore(
  id: string,
  assigneeId: string, // UUID of the family member
  targetColumn?: ColumnType
): Promise<ChoreStatus> {
  const { data: choreStatusData } = await supabase
    .from('chore_statuses')
    .select('assignee, status')
    .eq('chore_id', id)
    .throwOnError()
    .single();

  if (!choreStatusData) throw new Error("Chore not found");
  if (!targetColumn) {
    targetColumn = choreStatusData.status as ColumnType;
    if (!assigneeId && targetColumn !== "IDEAS")
      targetColumn = "IDEAS";
    if (assigneeId && targetColumn === "IDEAS")
      targetColumn = "TODO";
  }

  const { data } = await supabase
    .from('chore_statuses')
    .update({ assignee: assigneeId, status: targetColumn })
    .eq("chore_id", id)
    .throwOnError().select().single();

  return toChoreStatus(data!);
}
