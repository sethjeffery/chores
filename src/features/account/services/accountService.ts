import { v4 as uuidv4 } from "uuid";
import { supabase } from "../../../supabase";

// Table names
export const ACCOUNTS_TABLE = "accounts";
export const ACCOUNT_USERS_TABLE = "account_users";

// Define the database record types
export interface AccountRecord {
  id: string;
  name: string;
  created_at?: string;
}

export interface AccountUserRecord {
  id: string;
  account_id: string;
  user_id: string;
  created_at?: string;
  is_admin: boolean;
}

// App-level types
export interface Account {
  id: string;
  name: string;
}

export interface AccountUser {
  id: string;
  accountId: string;
  userId: string;
  isAdmin: boolean;
}

// Conversion functions
export function toAccount(record: AccountRecord): Account {
  return {
    id: record.id,
    name: record.name,
  };
}

export function toAccountUser(record: AccountUserRecord): AccountUser {
  return {
    id: record.id,
    accountId: record.account_id,
    userId: record.user_id,
    isAdmin: record.is_admin,
  };
}

/**
 * Get the current user's accounts
 */
export async function getUserAccounts(): Promise<Account[]> {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get accounts the user belongs to
    const { data: accountUsers, error: accountUsersError } = await supabase
      .from(ACCOUNT_USERS_TABLE)
      .select("account_id")
      .eq("user_id", user.id);

    if (accountUsersError) {
      console.error(
        "Error fetching user's account associations:",
        accountUsersError
      );
      throw accountUsersError;
    }

    if (!accountUsers || accountUsers.length === 0) {
      return [];
    }

    // Get the accounts
    const accountIds = accountUsers.map((au) => au.account_id);
    const { data: accounts, error: accountsError } = await supabase
      .from(ACCOUNTS_TABLE)
      .select("*")
      .in("id", accountIds);

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError);
      throw accountsError;
    }

    return (accounts || []).map(toAccount);
  } catch (error) {
    console.error("Error getting user accounts:", error);
    throw error;
  }
}

/**
 * Get a specific account by ID
 */
export async function getAccountById(
  accountId: string
): Promise<Account | null> {
  try {
    const { data, error } = await supabase
      .from(ACCOUNTS_TABLE)
      .select("*")
      .eq("id", accountId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // not found
        return null;
      }
      console.error(`Error fetching account ${accountId}:`, error);
      throw error;
    }

    return data ? toAccount(data) : null;
  } catch (error) {
    console.error(`Error fetching account ${accountId}:`, error);
    throw error;
  }
}

/**
 * Create a new account and make the current user an admin
 */
export async function createAccount(name: string): Promise<Account> {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Create a new account
    const accountId = uuidv4();
    const { error: accountError } = await supabase.from(ACCOUNTS_TABLE).insert({
      id: accountId,
      name,
    });

    if (accountError) {
      console.error("Error creating account:", accountError);
      throw accountError;
    }

    // Add the current user as an admin of the account
    const { error: accountUserError } = await supabase
      .from(ACCOUNT_USERS_TABLE)
      .insert({
        account_id: accountId,
        user_id: user.id,
        is_admin: true,
      });

    if (accountUserError) {
      console.error("Error adding user to account:", accountUserError);
      // Try to rollback the account creation
      await supabase.from(ACCOUNTS_TABLE).delete().eq("id", accountId);
      throw accountUserError;
    }

    return (await getAccountById(accountId)) as Account;
  } catch (error) {
    console.error("Error creating account:", error);
    throw error;
  }
}

/**
 * Get all users in an account
 */
export async function getAccountUsers(
  accountId: string
): Promise<AccountUser[]> {
  try {
    const { data, error } = await supabase
      .from(ACCOUNT_USERS_TABLE)
      .select("*")
      .eq("account_id", accountId);

    if (error) {
      console.error(`Error fetching users for account ${accountId}:`, error);
      throw error;
    }

    return (data || []).map(toAccountUser);
  } catch (error) {
    console.error(`Error fetching users for account ${accountId}:`, error);
    throw error;
  }
}

/**
 * Add a user to an account
 */
export async function addUserToAccount(
  accountId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<string> {
  try {
    const id = uuidv4();
    const { error } = await supabase.from(ACCOUNT_USERS_TABLE).insert({
      id,
      account_id: accountId,
      user_id: userId,
      is_admin: isAdmin,
    });

    if (error) {
      console.error(
        `Error adding user ${userId} to account ${accountId}:`,
        error
      );
      throw error;
    }

    return id;
  } catch (error) {
    console.error(
      `Error adding user ${userId} to account ${accountId}:`,
      error
    );
    throw error;
  }
}

/**
 * Remove a user from an account
 */
export async function removeUserFromAccount(
  accountUserId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from(ACCOUNT_USERS_TABLE)
      .delete()
      .eq("id", accountUserId);

    if (error) {
      console.error(`Error removing account user ${accountUserId}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error removing account user ${accountUserId}:`, error);
    throw error;
  }
}

/**
 * Update a user's admin status in an account
 */
export async function updateUserAdminStatus(
  accountUserId: string,
  isAdmin: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from(ACCOUNT_USERS_TABLE)
      .update({ is_admin: isAdmin })
      .eq("id", accountUserId);

    if (error) {
      console.error(
        `Error updating admin status for account user ${accountUserId}:`,
        error
      );
      throw error;
    }
  } catch (error) {
    console.error(
      `Error updating admin status for account user ${accountUserId}:`,
      error
    );
    throw error;
  }
}

/**
 * Check if user is an admin of an account
 */
export async function isUserAccountAdmin(accountId: string): Promise<boolean> {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from(ACCOUNT_USERS_TABLE)
      .select("is_admin")
      .eq("account_id", accountId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return false;
    }

    return data.is_admin;
  } catch (error) {
    console.error(
      `Error checking admin status for account ${accountId}:`,
      error
    );
    return false;
  }
}
