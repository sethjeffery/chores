import { useMemo } from "react";
import type { ReactNode } from "react";
import { AccountContext } from "../contexts/AccountContext";
import * as accountService from "../services/accountService";
import { useAuth } from "../../auth/hooks/useAuth";
import { supabase } from "../../../supabase";
import type { Account } from "../services/accountService";
import useSWR from "swr";

// Provider component that wraps parts of the app that need account data
export function AccountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  // Fetch the user's account (no longer auto-creating)
  const {
    data: accountData,
    error,
    isLoading,
  } = useSWR(
    userId ? "user-account" : null,
    async () => {
      try {
        // Get accounts the user belongs to
        const userAccounts = await accountService.getUserAccounts();

        // If user has an account, use it
        if (userAccounts.length > 0) {
          const account = userAccounts[0];
          const isAdmin = await accountService.isUserAccountAdmin(account.id);
          return { account, isAdmin };
        }

        // No longer auto-creating accounts - this is now handled by onboarding
        return { account: null, isAdmin: false };
      } catch (err) {
        console.error("Failed to get account:", err);
        throw err;
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // Prevent excessive refetching
    }
  );

  // Extract account and admin status
  const activeAccount = accountData?.account || null;
  const isAdmin = accountData?.isAdmin || false;

  // Set up real-time subscription to account changes
  useSWR(
    userId && activeAccount ? "account-subscription" : null,
    () => {
      // Subscribe to account user changes for this specific account
      const channelKey = `account-changes-${userId}`;

      // Since we checked activeAccount is not null in the useSWR key, we can safely use it here
      const accountId = activeAccount!.id;

      return supabase
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: accountService.ACCOUNT_USERS_TABLE,
            filter: `account_id=eq.${accountId}`,
          },
          (payload) => {
            console.log("Account user change detected:", payload);
            // We'll keep the same mutate function but simplified logic
            // Since we only have one account now
          }
        )
        .subscribe();
    },
    {
      suspense: false,
      dedupingInterval: 1000,
      onSuccess: (channel) => {
        // Return cleanup function
        return () => {
          if (channel) supabase.removeChannel(channel);
        };
      },
    }
  );

  // For backwards compatibility, we'll keep the same context shape
  // but simplify the implementation since we only have one account
  const value = useMemo(
    () => ({
      // For backwards compatibility, return an array with the single account
      accounts: activeAccount ? [activeAccount] : [],
      activeAccount,
      isLoading,
      error: error ? error?.message ?? String(error) : null,
      // These functions are simplified since we don't support multiple accounts
      selectAccount: async () => {
        console.warn(
          "Account switching is disabled - only one account per user is supported"
        );
        return Promise.resolve();
      },
      createAccount: async (name: string) => {
        if (activeAccount) {
          console.warn(
            "Creating multiple accounts is disabled - only one account per user is supported"
          );
          return Promise.resolve(activeAccount as Account);
        }

        // Allow manual account creation through this method for the onboarding flow
        const newAccount = await accountService.createAccount(name);
        return newAccount;
      },
      isAdmin,
    }),
    [activeAccount, isLoading, error, isAdmin]
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}
