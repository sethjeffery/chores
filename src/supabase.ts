import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

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

// Check if we're in sharing mode (URL contains /shared/{token})
const shareTokenMatch = location.href.match(/\/shared\/([a-zA-Z0-9-]+)/);
const shareToken = shareTokenMatch ? shareTokenMatch[1] : null;

export function createSupabaseClient() {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

export const supabase = createSupabaseClient();

// If there's a share token in the URL, try to use it for auth
if (shareToken) {
  // Get access and refresh tokens directly to avoid circular dependency
  // with ShareService that imports supabase
  (async () => {
    try {
      const { data } = await supabase
        .rpc("get_share_token_by_token", { token_param: shareToken })
        .single()
        .throwOnError();

      // We're using the token for authentication
      // This lets us use Supabase's built-in Row Level Security
      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
      }
    } catch (error) {
      console.error("Failed to authenticate via share token:", error);
    }
  })();
}

// Log configuration for debugging
console.log("Supabase client initialized");
