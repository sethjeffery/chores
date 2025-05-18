import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { supabase } from "../../../supabase";
import { AuthContext } from "../contexts/AuthContext";
import useSWR from "swr";
import { getError } from "../../../shared/utils/getError";

// Provider component that wraps parts of the app that need auth
export function AuthProvider({ children }: { children: ReactNode }) {
  // Use SWR for handling authentication state
  const {
    data: sessionData,
    error: fetchError,
    mutate: mutateSession,
    isLoading,
  } = useSWR(
    "auth-session",
    async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    {
      revalidateOnFocus: false,
      suspense: true,
    }
  );

  const session = sessionData ?? null;
  const user = session?.user ?? null;
  const error = fetchError ? String(fetchError) : null;

  // Subscribe to auth changes
  useSWR("auth-subscription", () => {
    const { data } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await mutateSession(session);
      }
    );

    // Return unsubscribe function for SWR to clean up
    return data.subscription;
  });

  // Sign in with Google
  const signInWithGoogle = useCallback(
    async (options?: { redirectTo?: string }) => {
      try {
        const redirectTo =
          options?.redirectTo || `${window.location.origin}/auth/callback`;

        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });

        if (error) {
          throw error;
        }
      } catch (error) {
        console.error("Google sign-in error:", error);
      }
    },
    []
  );

  // Sign in with email and password
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        return { error: getError(error) };
      } catch (error) {
        console.error("Email sign-in error:", error);
        return {
          error: getError(error),
        };
      }
    },
    []
  );

  // Sign in with magic link (passwordless)
  const signInWithMagicLink = useCallback(
    async (
      email: string,
      options?: { redirectTo?: string; originalRedirect?: string }
    ) => {
      try {
        const redirectTo =
          options?.redirectTo || `${window.location.origin}/auth/callback`;

        // For email verification/magic links, we need to use emailRedirectTo
        const { error, data } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
            // When redirecting from magic links we still need to hit callback endpoint first
            // Never redirect directly to sensitive routes
            data:
              options?.originalRedirect ||
              options?.redirectTo !== `${window.location.origin}/auth/callback`
                ? {
                    // Store the original redirect URL as metadata to be used in the callback
                    originalRedirect:
                      options?.originalRedirect || options?.redirectTo,
                  }
                : undefined,
          },
        });

        return {
          error: getError(error),
          sent: !error && !!data,
        };
      } catch (error) {
        console.error("Magic link sign-in error:", error);
        return {
          error: getError(error),
          sent: false,
        };
      }
    },
    []
  );

  // Sign up with email, password, and full name
  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        return { error: getError(error) };
      } catch (error) {
        console.error("Email sign-up error:", error);
        return {
          error: getError(error),
        };
      }
    },
    []
  );

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      await mutateSession(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, [mutateSession]);

  // Provider value
  const value = useMemo(
    () => ({
      session,
      user,
      isLoading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signInWithMagicLink,
      signOut,
      error,
    }),
    [
      session,
      user,
      isLoading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signInWithMagicLink,
      signOut,
      error,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
