import type { Database } from "../src/database.types";

import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { nanoid } from "nanoid";

const supabase = createClient<Database>(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1]; // "Bearer <token>"

    if (!token) {
      return res.status(401).json({ error: "Missing access token" });
    }

    // Extract name from request body
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // 1. Verify the user's identity via token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Invalid token", details: userError });
    }

    // 2. Check that this user already has an account, and if so, return the account
    const { data: accountExists } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (accountExists) {
      return res.status(200).json({ account: accountExists, exists: true });
    }

    // Create the user's account
    const { data: accountData } = await supabase.from('accounts').insert({
      name: name,
    }).select().single().throwOnError();

    // Add the current user as an admin of the account
    await supabase
      .from('account_users')
      .insert({
        account_id: accountData.id,
        user_id: user.id,
        is_admin: true,
      }).throwOnError();

    // Create a guest user for the account with token-based auth
    const guestEmail = `guest-${accountData.id}@pocketbunnies.com`;
    const guestPassword = crypto.randomUUID(); // Random secure password

    const { data: { user: guestUser }, error: guestAuthError, } =
      await supabase.auth.admin.createUser({
        email: guestEmail,
        password: guestPassword,
        email_confirm: true,
        user_metadata: {
          full_name: `${name} Guest`,
          is_guest: true
        },
      });

    if (guestAuthError || !guestUser) {
      console.error("Error creating guest user:", guestAuthError);
      // Continue anyway since the main account is created
    } else {
      const { data: { session: guestSession } } = await supabase.auth.signInWithPassword({
        email: guestEmail,
        password: guestPassword,
      });

      // Add the guest user to the account with non-admin status
      if (guestSession) {
        await supabase.from('account_users').insert({
          account_id: accountData.id,
          user_id: guestUser.id,
          is_admin: false,
          user_email: guestEmail,
          user_name: `${name} Guest`,
          access_token: guestSession.access_token,
          refresh_token: guestSession.refresh_token,
        });

        await supabase
          .from('share_tokens')
          .insert({
            account_id: accountData.id,
            access_token: guestSession.access_token,
            refresh_token: guestSession.refresh_token,
            token: nanoid(10)
          });
      }
    }

    return res.status(200).json({ account: accountData });
  } catch (error) {
    console.error("Error creating account:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
