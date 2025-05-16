import { createContext } from "react";
import type { AuthSession, User } from "@supabase/supabase-js";

interface RedirectOptions {
  redirectTo?: string;
  originalRedirect?: string;
}

// Define the context type
export interface AuthContextType {
  session: AuthSession | null;
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: (options?: RedirectOptions) => Promise<void>;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: string | null }>;
  signInWithMagicLink: (
    email: string,
    options?: RedirectOptions
  ) => Promise<{ error: string | null; sent: boolean }>;
  signOut: () => Promise<void>;
  error: string | null;
}

// Create the context with a default value
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
