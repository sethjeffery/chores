import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { AccountContext } from "../contexts/AccountContext";
import * as accountService from "../services/accountService";
import { useAuth } from "../../auth/hooks/useAuth";
import { supabase } from "../../../supabase";
import type { Account } from "../services/accountService";
import useSWR from "swr";
import { useNavigate, useLocation } from "react-router-dom";

// Provider component that wraps parts of the app that need account data
export function AccountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch the user's account (no longer auto-creating)
  const {
    data: accountData,
    error,
    isLoading,
    mutate,
  } = useSWR(
    userId ? ["account", userId] : null,
    async () => {
      if (userId) {
        // Get accounts the user belongs to
        const userAccounts = await accountService.getUserAccounts(userId);

        // If user has an account, use it
        if (userAccounts.length > 0) {
          return userAccounts[0];
        }
      }

      // No longer auto-creating accounts - this is now handled by onboarding
      return { account: null, isAdmin: false };
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // Prevent excessive refetching
    }
  );

  // Check if the user needs onboarding when they log in
  useEffect(() => {
    if (isLoading || location.pathname !== "/") return;

    const needsProfile = user && !user?.user_metadata?.full_name;
    const hasNoAccount = !accountData;

    // Determine if we need to redirect to welcome
    if (needsProfile || hasNoAccount) {
      // Redirect to welcome instead of auto-starting onboarding
      navigate("/welcome");
    }
  }, [user, navigate, location.pathname, isLoading, accountData]);

  // Extract account and admin status
  const activeAccount = accountData?.account || null;
  const isAdmin = accountData?.isAdmin || false;

  // Set up real-time subscription to account changes
  useSWR(
    userId && activeAccount ? "account-subscription" : null,
    () => {
      // Subscribe to account user changes for this specific account
      const channelKey = `account-changes-${activeAccount?.id}`;

      // Since we checked activeAccount is not null in the useSWR key, we can safely use it here
      const accountId = activeAccount!.id;

      return supabase
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "account_users",
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

  const value = useMemo(
    () => ({
      // For backwards compatibility, return an array with the single account
      accounts: activeAccount ? [activeAccount] : [],
      activeAccount,
      isLoading,
      error: error ? error?.message ?? String(error) : null,
      createAccount: async (name: string) => {
        if (activeAccount) {
          console.warn(
            "Creating multiple accounts is disabled - only one account per user is supported"
          );
          return Promise.resolve(activeAccount as Account);
        }

        // Allow manual account creation through this method for the onboarding flow
        const newAccount = await accountService.createAccount(name);

        mutate({
          account: newAccount,
          isAdmin: true,
        });

        return newAccount;
      },
      isAdmin,
    }),
    [activeAccount, isLoading, error, isAdmin, mutate]
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}
