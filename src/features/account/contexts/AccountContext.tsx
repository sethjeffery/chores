import { createContext } from "react";
import type { Account } from "../services/accountService";

// Define the context type
export interface AccountContextType {
  accounts: Account[];
  activeAccount: Account | null;
  isLoading: boolean;
  error: string | null;
  createAccount: (name: string) => Promise<Account>;
  isAdmin: boolean;
}

// Create the context with a default undefined value
export const AccountContext = createContext<AccountContextType | undefined>(
  undefined
);
