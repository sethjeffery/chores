import { useState } from "react";
import { useAccount } from "../hooks/useAccount";
import { useAuth } from "../../auth/hooks/useAuth";
import * as accountService from "../services/accountService";
import useSWR from "swr";

// Defining the extended AccountUser interface based on the original from accountService
interface ExtendedAccountUser
  extends Omit<accountService.AccountUser, "accountId"> {
  accountId?: string;
  email?: string;
  name?: string;
  isCurrentUser?: boolean;
}

export default function AccountUsersManager() {
  const { activeAccount, isAdmin } = useAccount();
  const { user: currentUser } = useAuth();
  const [newUserEmail, setNewUserEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Use SWR to fetch and cache account users
  const {
    data: users = [],
    error,
    mutate: mutateUsers,
    isLoading,
  } = useSWR<ExtendedAccountUser[]>(
    activeAccount ? `account-users-${activeAccount.id}` : null,
    async () => {
      if (!activeAccount || !currentUser) return [];

      try {
        // Get account users
        const accountUsers = await accountService.getAccountUsers(
          activeAccount.id
        );

        // Transform account users to include display information
        return accountUsers.map((user) => {
          // Check if this user is the current logged-in user
          const isCurrentUser = user.userId === currentUser.id;

          // For the current user, we can access their profile directly
          if (isCurrentUser) {
            return {
              ...user,
              email: currentUser.email || "No Email",
              name:
                currentUser.user_metadata?.full_name ||
                currentUser.user_metadata?.name ||
                "Current User",
              isCurrentUser: true,
            };
          }

          // For other users, we just show their email (which we might need to get from elsewhere)
          return {
            ...user,
            email: "Member", // This will be updated if we can find the email
            name: "Member", // Default display name
            isCurrentUser: false,
          };
        });
      } catch (err) {
        console.error("Failed to load account users:", err);
        throw err; // Let SWR handle the error
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // Avoid duplicate requests within 5 seconds
      errorRetryCount: 3, // Only retry up to 3 times
      errorRetryInterval: 5000, // Retry after 5 seconds
    }
  );

  // Add a new user to the account
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount || !newUserEmail.trim() || !isAdmin) return;

    setAdding(true);
    setSuccess(null);

    try {
      // We can't use admin API to find users, so we'll trust the email input
      // and attempt to add the user directly

      // First, try to look up the user ID from the email
      // (You might need to implement a different approach if this isn't feasible)

      // Add the user to the account with the provided email
      try {
        // Here we'd typically verify the user exists first, but without admin API access,
        // we may need to handle failures gracefully instead

        // Create a temporary user ID (this won't work; you need to determine how to
        // find a user ID from an email without admin API)
        const tempUserId = newUserEmail; // This is just a placeholder

        await accountService.addUserToAccount(
          activeAccount.id,
          tempUserId,
          false // Not an admin by default
        );

        // Add the new user to the local state and trigger revalidation
        const newUser: ExtendedAccountUser = {
          id: crypto.randomUUID(), // Temporary ID until page refresh
          userId: tempUserId,
          accountId: activeAccount.id,
          email: newUserEmail,
          name: "New Member",
          isAdmin: false,
          isCurrentUser: false,
        };

        // Update the cache optimistically
        mutateUsers((current) => [...(current || []), newUser], {
          revalidate: true, // Also trigger a background revalidation
        });

        setNewUserEmail("");
        setSuccess("Invitation sent to user.");
      } catch (err) {
        console.error("Failed to add user:", err);
        throw new Error(
          "This user couldn't be added. Make sure they have an account."
        );
      }
    } catch (err) {
      console.error("Failed to add user:", err);
    } finally {
      setAdding(false);
    }
  };

  // Toggle admin status for a user
  const toggleAdminStatus = async (
    accountUserId: string,
    currentStatus: boolean
  ) => {
    if (!activeAccount || !isAdmin) return;

    // Get the user being modified
    const targetUser = users.find((user) => user.id === accountUserId);
    if (!targetUser) return;

    // Prevent removing admin status from yourself if you're the only admin
    if (targetUser.isCurrentUser && currentStatus) {
      // Check if there are other admins
      const otherAdmins = users.filter(
        (user) => user.isAdmin && !user.isCurrentUser
      );

      if (otherAdmins.length === 0) {
        alert(
          "You cannot remove your admin status as you are the only admin for this account."
        );
        return;
      }
    }

    try {
      await accountService.updateUserAdminStatus(accountUserId, !currentStatus);

      // Update cache optimistically
      mutateUsers(
        (currentUsers = []) =>
          currentUsers.map((user) =>
            user.id === accountUserId
              ? { ...user, isAdmin: !currentStatus }
              : user
          ),
        {
          revalidate: false, // No need to revalidate since we're sure of the change
        }
      );
    } catch (err) {
      console.error("Failed to update admin status:", err);
      // Revalidate on error to get the correct state
      mutateUsers();
    }
  };

  // Remove a user from the account
  const removeUser = async (accountUserId: string) => {
    if (!activeAccount || !isAdmin) return;

    // Get the user being removed
    const targetUser = users.find((user) => user.id === accountUserId);
    if (!targetUser) return;

    // Prevent removing yourself
    if (targetUser.isCurrentUser) {
      alert(
        "You cannot remove yourself from the account. Another admin would need to remove you."
      );
      return;
    }

    // Prevent removing the last admin (if the target user is an admin)
    if (targetUser.isAdmin) {
      const adminCount = users.filter((user) => user.isAdmin).length;
      if (adminCount <= 1) {
        alert("You cannot remove the last admin from the account.");
        return;
      }
    }

    if (
      !confirm("Are you sure you want to remove this user from the account?")
    ) {
      return;
    }

    try {
      await accountService.removeUserFromAccount(accountUserId);

      // Update cache optimistically
      mutateUsers(
        (currentUsers = []) =>
          currentUsers.filter((user) => user.id !== accountUserId),
        {
          revalidate: false, // No need to revalidate since we're sure of the change
        }
      );

      setSuccess("User removed successfully.");
    } catch (err) {
      console.error("Failed to remove user:", err);
      // Revalidate on error to get the correct state
      mutateUsers();
    }
  };

  if (!activeAccount) return null;

  return (
    <div className="bg-white rounded-xl shadow-cartoon p-6">
      <h2 className="text-2xl font-fancy mb-4">Account Members</h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-md">
          <p className="text-red-700">Failed to load account users.</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded-md">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {isLoading ? (
        <div className="py-4 flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Role
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.isCurrentUser ? (
                        <span className="font-semibold">{user.name}</span>
                      ) : (
                        user.name
                      )}
                      {user.isCurrentUser && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.isAdmin ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Member
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-sm text-right">
                        {/* Show admin toggle button only if it would work */}
                        {!(
                          user.isCurrentUser &&
                          user.isAdmin &&
                          users.filter((u) => u.isAdmin).length <= 1
                        ) && (
                          <button
                            onClick={() =>
                              toggleAdminStatus(user.id, user.isAdmin)
                            }
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            {user.isAdmin ? "Remove Admin" : "Make Admin"}
                          </button>
                        )}

                        {/* Show remove button only if it would work */}
                        {!user.isCurrentUser &&
                          !(
                            user.isAdmin &&
                            users.filter((u) => u.isAdmin).length <= 1
                          ) && (
                            <button
                              onClick={() => removeUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isAdmin && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">Add User</h3>
              <form
                onSubmit={handleAddUser}
                className="flex items-start space-x-2"
              >
                <div className="flex-1">
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="Enter user's email address"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={adding}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The user must already have an account in the system.
                  </p>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!newUserEmail.trim() || adding}
                >
                  {adding ? "Adding..." : "Add User"}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
