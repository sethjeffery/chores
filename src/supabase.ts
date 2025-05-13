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
  assignee: string | null;
  status: string;
  created_at: string;
  reward: number | null;
  icon: string | null;
};

// Helper function to convert database record to app Chore type
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

// Helper function to convert app Chore type to database record
export function fromChore(chore: Partial<Chore>): Partial<ChoreTable> {
  const record: Partial<ChoreTable> = {};

  if (chore.id !== undefined) record.id = chore.id;
  if (chore.title !== undefined) record.title = chore.title;
  if (chore.assignee !== undefined) record.assignee = chore.assignee;
  if (chore.column !== undefined) record.status = chore.column;
  if (chore.createdAt !== undefined) record.created_at = chore.createdAt;
  if (chore.reward !== undefined) record.reward = chore.reward;
  if (chore.icon !== undefined) record.icon = chore.icon;

  return record;
}
