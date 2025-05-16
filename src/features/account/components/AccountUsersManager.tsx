import { useAccount } from "../hooks/useAccount";
import { useAuth } from "../../auth/hooks/useAuth";
import * as accountService from "../services/accountService";
import * as invitationService from "../services/invitationService";
import useSWR from "swr";
import QRCode from "react-qr-code";
import { useState } from "react";

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
  const [copySuccess, setCopySuccess] = useState(false);

  // Use SWR to fetch and cache account users
  const {
    data: users = [],
    error: usersError,
    mutate: mutateUsers,
    isLoading: isLoadingUsers,
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

          // For the current user, we can use their profile directly if it's more complete
          if (isCurrentUser) {
            return {
              ...user,
              email: user.email || currentUser.email || "No Email",
              name:
                user.name ||
                currentUser.user_metadata?.full_name ||
                currentUser.user_metadata?.name ||
                "Current User",
              isCurrentUser: true,
            };
          }

          // For other users, use the information from account_users
          return {
            ...user,
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

  // Use SWR to fetch and cache the active invitation
  const {
    data: invitationUrl,
    error: invitationError,
    isLoading: isLoadingInvitation,
  } = useSWR(
    activeAccount && isAdmin ? `active-invitation-${activeAccount.id}` : null,
    async () => {
      if (!activeAccount) return null;

      // Try to get the latest active invitation
      let activeInvitation = await invitationService.getLatestActiveInvitation(
        activeAccount.id
      );

      // If none exists, create a new one
      if (!activeInvitation) {
        activeInvitation = await invitationService.createInvitation(
          activeAccount.id
        );
      }

      // Create and store the invitation URL
      const baseUrl = window.location.origin;
      return `${baseUrl}/invite/${activeInvitation.token}`;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
      errorRetryCount: 3,
      refreshInterval: 3600000, // Refresh every hour (3,600,000 ms)
    }
  );

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
    } catch (err) {
      console.error("Failed to remove user:", err);
      // Revalidate on error to get the correct state
      mutateUsers();
    }
  };

  // Copy invitation link to clipboard
  const copyInviteLink = () => {
    if (!invitationUrl) return;

    navigator.clipboard
      .writeText(invitationUrl)
      .then(() => {
        setCopySuccess(true);
        // Reset success state after 3 seconds
        setTimeout(() => setCopySuccess(false), 3000);
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
        alert(
          "Failed to copy link. Please try manually selecting and copying the QR code."
        );
      });
  };

  if (!activeAccount) return null;

  // Combine errors for display
  const error = usersError || invitationError;
  // Combine loading states
  const isLoading = isLoadingUsers;

  return (
    <div className="bg-white rounded-xl shadow-cartoon p-6">
      <h2 className="text-2xl font-fancy mb-4">Account Members</h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-md">
          <p className="text-red-700">Failed to load data.</p>
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
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-medium mb-4">
                Invite Family Members
              </h3>

              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* QR Code */}
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    {invitationUrl ? (
                      <QRCode value={invitationUrl} size={150} />
                    ) : (
                      <div className="h-[150px] w-[150px] flex items-center justify-center bg-gray-100">
                        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="flex-1">
                    <h4 className="text-md font-semibold mb-2">
                      How to invite family members:
                    </h4>
                    <ol className="list-decimal ml-5 text-sm text-gray-600 space-y-1 mb-4">
                      <li>Have your family member scan this QR code</li>
                      <li>
                        They'll need to create a Pocket Bunnies account if they
                        don't have one
                      </li>
                      <li>
                        After they login, they'll be joined to your family
                        account
                      </li>
                    </ol>

                    <button
                      onClick={copyInviteLink}
                      disabled={!invitationUrl || isLoadingInvitation}
                      className={`px-4 py-2 ${
                        copySuccess
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      } text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center`}
                    >
                      {copySuccess ? (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        "Copy Invite Link"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
