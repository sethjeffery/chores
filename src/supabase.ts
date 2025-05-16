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
    headers: {},
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

// Configure Supabase client to use a token for public read-only access
export function setupTokenAuth(token: string): void {
  // Set auth token for realtime subscription
  supabase.realtime.setAuth(token);

  // Set authorization header for requests
  // Note: In Supabase, RLS policies check the 'request.headers' object for 'share-token'
  // This is automatically extracted from Authorization header by the Postgres JWT verification
  supabase.auth.setSession({
    access_token: token,
    refresh_token: "",
  });
}

// Log configuration for debugging
console.log("Supabase client initialized");
