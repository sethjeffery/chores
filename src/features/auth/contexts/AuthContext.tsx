import { createContext } from "react";
import type { AuthSession, User } from "@supabase/supabase-js";

// Define the context type
export interface AuthContextType {
  session: AuthSession | null;
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  error: string | null;
}

// Create the context with a default value
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
