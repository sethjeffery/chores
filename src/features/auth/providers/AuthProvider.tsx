import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { supabase } from "../../../supabase";
import { AuthContext } from "../contexts/AuthContext";
import useSWR from "swr";

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
      suspense: false,
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
  const signInWithGoogle = useCallback(async () => {
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;

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
  }, []);

  // Sign in with email and password
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        return { error: error ? new Error(error.message) : null };
      } catch (error) {
        console.error("Email sign-in error:", error);
        return {
          error: error instanceof Error ? error : new Error(String(error)),
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

        return { error: error ? new Error(error.message) : null };
      } catch (error) {
        console.error("Email sign-up error:", error);
        return {
          error: error instanceof Error ? error : new Error(String(error)),
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
      signOut,
      error,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
