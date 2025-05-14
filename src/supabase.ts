import { createClient } from "@supabase/supabase-js";
import type { Chore, ColumnType } from "./types";

// Supabase configuration
// To get these values:
// 1. Go to your Supabase dashboard (https://app.supabase.io/)
// 2. Click on your project
// 3. Go to Project Settings > API
// 4. Copy the URL and anon key

// Replace these with your actual Supabase URL and key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "your-supabase-url";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_KEY || "your-supabase-anon-key";

// Create Supabase client with realtime subscription enabled
export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Enable realtime subscriptions for the chores table
export function enableRealtimeForChores() {
  supabase
    .channel("schema-db-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: CHORES_TABLE,
      },
      (payload) => {
        console.log("Realtime change received:", payload);
      }
    )
    .subscribe();
}

// Log configuration for debugging
console.log("Supabase client initialized");

// Define the table name for our chores
export const CHORES_TABLE = "chores";

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
  user_id: string | null;
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
