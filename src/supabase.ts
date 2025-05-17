import { createClient } from "@supabase/supabase-js";

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
  global: {
    // Add support for custom headers (for shared tokens)
    headers: {
      "X-Share-Token": location.href.match(/\/shared\/(\w+)/)?.[1] ?? "",
    },
  },
});

// Define the table name for our chores
export const CHORES_TABLE = "chores";

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
