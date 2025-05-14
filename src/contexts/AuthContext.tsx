import { createContext } from "react";
import type { AuthSession, User } from "@supabase/supabase-js";

// Define the context type
export interface AuthContextType {
  session: AuthSession | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

// Create the context with a default value
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
