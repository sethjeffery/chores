import { useState, useEffect } from "react";
import { useAccount } from "../hooks/useAccount";
import * as accountService from "../services/accountService";
import { supabase } from "../../../supabase";

interface AccountUser {
  id: string;
  userId: string;
  email?: string;
  isAdmin: boolean;
}

export default function AccountUsersManager() {
  const { activeAccount, isAdmin } = useAccount();
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load account users when active account changes
  useEffect(() => {
    if (!activeAccount) return;

    const loadUsers = async () => {
      setLoading(true);
      try {
        const accountUsers = await accountService.getAccountUsers(
          activeAccount.id
        );

        // Get the emails for each user
        const usersWithEmails = await Promise.all(
          accountUsers.map(async (user) => {
            // Get user profile from Supabase
            const { data, error } = await supabase.auth.admin.getUserById(
              user.userId
            );

            if (error || !data.user) {
              console.error("Error fetching user:", error);
              return {
                ...user,
                email: "Unknown User",
              };
            }

            return {
              ...user,
              email: data.user.email || "No Email",
            };
          })
        );

        setUsers(usersWithEmails);
        setError(null);
      } catch (err) {
        console.error("Failed to load account users:", err);
        setError("Failed to load account users.");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [activeAccount]);

  // Add a new user to the account
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount || !newUserEmail.trim() || !isAdmin) return;

    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      // First, find the user by email
      const { data, error } = await supabase.auth.admin.listUsers();

      if (error) {
        throw new Error("Failed to search for user");
      }

      const matchingUser = data.users.find(
        (user) => user.email?.toLowerCase() === newUserEmail.toLowerCase()
      );

      if (!matchingUser) {
        setError("No user found with that email address.");
        return;
      }

      // Check if user is already in the account
      const existingUser = users.find(
        (user) => user.userId === matchingUser.id
      );
      if (existingUser) {
        setError("This user is already a member of this account.");
        return;
      }

      // Add the user to the account
      await accountService.addUserToAccount(
        activeAccount.id,
        matchingUser.id,
        false // Not an admin by default
      );

      // Refresh the user list
      const accountUsers = await accountService.getAccountUsers(
        activeAccount.id
      );
      const updatedUsers = [
        ...users,
        {
          id: accountUsers[accountUsers.length - 1].id,
          userId: matchingUser.id,
          email: matchingUser.email || "No Email",
          isAdmin: false,
        },
      ];

      setUsers(updatedUsers);
      setNewUserEmail("");
      setSuccess("User added successfully.");
    } catch (err) {
      console.error("Failed to add user:", err);
      setError("Failed to add user to account.");
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

    try {
      await accountService.updateUserAdminStatus(accountUserId, !currentStatus);

      // Update local state
      setUsers((prev) =>
        prev.map((user) =>
          user.id === accountUserId
            ? { ...user, isAdmin: !currentStatus }
            : user
        )
      );
    } catch (err) {
      console.error("Failed to update admin status:", err);
      setError("Failed to update admin status.");
    }
  };

  // Remove a user from the account
  const removeUser = async (accountUserId: string) => {
    if (!activeAccount || !isAdmin) return;

    if (
      !confirm("Are you sure you want to remove this user from the account?")
    ) {
      return;
    }

    try {
      await accountService.removeUserFromAccount(accountUserId);

      // Update local state
      setUsers((prev) => prev.filter((user) => user.id !== accountUserId));
      setSuccess("User removed successfully.");
    } catch (err) {
      console.error("Failed to remove user:", err);
      setError("Failed to remove user from account.");
    }
  };

  if (!activeAccount) return null;

  return (
    <div className="bg-white rounded-xl shadow-cartoon p-6">
      <h2 className="text-2xl font-fancy mb-4">Account Members</h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded-md">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {loading ? (
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
                        <button
                          onClick={() =>
                            toggleAdminStatus(user.id, user.isAdmin)
                          }
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          {user.isAdmin ? "Remove Admin" : "Make Admin"}
                        </button>
                        <button
                          onClick={() => removeUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
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
