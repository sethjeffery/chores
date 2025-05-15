import { useCallback, useMemo } from "react";
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

  // Fetch user accounts
  const {
    data: accounts = [],
    error: accountsError,
    mutate: mutateAccounts,
    isLoading: isLoadingAccounts,
  } = useSWR(
    userId ? "user-accounts" : null,
    async () => await accountService.getUserAccounts(),
    {
      revalidateOnFocus: false,
      onError: (error) => console.error("Failed to load accounts:", error),
    }
  );

  // Get active account details (combines active account selection and admin check)
  const {
    data: activeAccountInfo,
    error: activeAccountError,
    mutate: mutateActiveAccount,
    isLoading: isLoadingActiveAccount,
  } = useSWR(
    accounts.length > 0 ? "active-account-info" : null,
    async () => {
      // Find or select active account
      const account = await getActiveAccount();
      return {
        account,
        isAdmin: account
          ? await accountService.isUserAccountAdmin(account.id)
          : false,
      };
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Helper function to get or create active account
  const getActiveAccount = async (): Promise<Account | null> => {
    const savedAccountId = localStorage.getItem("activeAccountId");

    // Try to find saved account
    if (savedAccountId) {
      const foundAccount = accounts.find((a) => a.id === savedAccountId);
      if (foundAccount) return foundAccount;
    }

    // Use first account if available
    if (accounts.length > 0) {
      return accounts[0];
    }

    // Create default account if no accounts exist and user is logged in
    if (userId) {
      try {
        const name = user?.user_metadata?.full_name
          ? `${user.user_metadata.full_name}'s Family`
          : "Family Account";

        const newAccount = await accountService.createAccount(name);
        await mutateAccounts();
        return newAccount;
      } catch (error) {
        console.error("Failed to create default account:", error);
      }
    }

    return null;
  };

  // Extract active account and isAdmin from combined data
  const activeAccount = activeAccountInfo?.account || null;
  const isAdmin = activeAccountInfo?.isAdmin || false;

  // Simplified loading state
  const isLoading =
    isLoadingAccounts || (isLoadingActiveAccount && accounts.length > 0);

  // Simplified error state
  const error =
    accountsError || activeAccountError
      ? String(accountsError || activeAccountError)
      : null;

  // Function to select an account
  const selectAccount = useCallback(
    async (account: Account) => {
      if (!account) return;

      try {
        localStorage.setItem("activeAccountId", account.id);
        const isAdmin = await accountService.isUserAccountAdmin(account.id);
        await mutateActiveAccount({ account, isAdmin });
      } catch (err) {
        console.error("Failed to select account:", err);
      }
    },
    [mutateActiveAccount]
  );

  // Function to create a new account
  const createAccount = useCallback(
    async (name: string) => {
      try {
        const account = await accountService.createAccount(name);
        await mutateAccounts();
        await selectAccount(account);
        return account;
      } catch (err) {
        console.error("Failed to create account:", err);
        throw err;
      }
    },
    [mutateAccounts, selectAccount]
  );

  // Set up real-time subscription to account changes
  useSWR(
    userId ? "account-subscription" : null,
    () => {
      // Subscribe to account changes
      const channelKey = `account-changes-${userId}`;
      return supabase
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: accountService.ACCOUNTS_TABLE,
          },
          () => mutateAccounts()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: accountService.ACCOUNT_USERS_TABLE,
            filter: `user_id=eq.${userId}`,
          },
          () => mutateAccounts()
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
      accounts,
      activeAccount,
      isLoading,
      error,
      selectAccount,
      createAccount,
      isAdmin,
    }),
    [
      accounts,
      activeAccount,
      isLoading,
      error,
      selectAccount,
      createAccount,
      isAdmin,
    ]
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}
