import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useSWRConfig } from "swr";
import * as invitationService from "../services/invitationService";
import * as accountService from "../services/accountService";

export default function AccountInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mutate: globalMutate } = useSWRConfig();
  const [invitationStatus, setInvitationStatus] = useState<
    "loading" | "valid" | "invalid" | "processing" | "success" | "error"
  >("loading");
  const [error, setError] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string>("");

  // Validate the invitation when the component mounts
  useEffect(() => {
    async function validateInvitation() {
      if (!token) return;

      try {
        const { valid, invitation, error } =
          await invitationService.validateInvitation(token);

        if (!valid || !invitation) {
          setInvitationStatus("invalid");
          setError(error || "Invalid invitation");
          return;
        }

        // Get the account name directly from the invitation
        setAccountName(invitation.accountName);

        // Set invitation as valid
        setInvitationStatus("valid");
      } catch (err) {
        console.error("Error validating invitation:", err);
        setInvitationStatus("invalid");
        setError("Failed to validate invitation");
      }
    }

    validateInvitation();
  }, [token]);

  // Refresh all data after joining an account
  const refreshAllData = async () => {
    // Invalidate all relevant caches
    globalMutate("user-account"); // Account data
    globalMutate((key) => Array.isArray(key) && key[0] === "family-members"); // Family members
    globalMutate((key) => Array.isArray(key) && key[0] === "chores-data"); // Chores data

    // Give a little time for the server changes to propagate
    // before redirecting to the main page
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  // Handle joining the account
  const handleJoinAccount = async () => {
    if (!token || !user) {
      // If user is not logged in, redirect to login page
      // We'll pass the invitation token so we can redirect back after login
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }

    setInvitationStatus("processing");
    setError(null);

    try {
      // Validate the invitation again
      const { valid, invitation } = await invitationService.validateInvitation(
        token
      );

      if (!valid || !invitation) {
        setInvitationStatus("invalid");
        setError("Invalid invitation");
        return;
      }

      // Transfer the user to the new account
      await accountService.transferUserToAccount(
        user.id,
        invitation.accountId,
        false // Not an admin by default
      );

      // Mark the invitation as used
      await invitationService.markInvitationAsUsed(token);

      // Refresh all data caches
      await refreshAllData();

      // Success!
      setInvitationStatus("success");

      // After a short delay, redirect to the home page
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      console.error("Error joining account:", err);
      setInvitationStatus("error");
      setError("Failed to join account");
    }
  };

  // Redirect to login page with return URL
  const handleLogin = () => {
    if (token) {
      navigate(`/login?redirect=/invite/${token}`);
    } else {
      navigate("/login");
    }
  };

  // Return to homepage
  const handleCancel = () => {
    navigate("/");
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 px-4 py-12">
        <div className="bg-white rounded-2xl shadow-cartoon p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-fancy mb-4">Invalid Invitation</h2>
          <p className="text-gray-600 mb-6">
            The invitation link is invalid or has expired.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-cartoon p-8 max-w-md w-full">
        {invitationStatus === "loading" && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-medium text-gray-700">
              Checking invitation...
            </h2>
          </div>
        )}

        {invitationStatus === "invalid" && (
          <div className="text-center">
            <div className="bg-red-100 p-3 rounded-full inline-flex mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-fancy text-gray-700 mb-4">
              Invalid Invitation
            </h2>
            <p className="text-gray-600 mb-6">
              {error || "This invitation link is invalid or has expired."}
            </p>
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Return Home
            </button>
          </div>
        )}

        {invitationStatus === "valid" && !user && (
          <div className="text-center">
            <img
              src="/pocket-bunnies-head.png"
              alt="Pocket Bunnies Logo"
              className="mx-auto h-16 w-auto mb-4"
            />
            <h2 className="text-2xl font-fancy mb-4">Join Family Account</h2>
            <p className="text-gray-600 mb-6">
              You've been invited to join{" "}
              <span className="font-semibold">{accountName}</span>!
            </p>
            <p className="text-gray-600 mb-8">
              To join this family account, you'll need to login or create an
              account first.
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleLogin}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Login or Create Account
              </button>
              <button
                onClick={handleCancel}
                className="w-full px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {invitationStatus === "valid" && user && (
          <div className="text-center">
            <img
              src="/pocket-bunnies-head.png"
              alt="Pocket Bunnies Logo"
              className="mx-auto h-16 w-auto mb-4"
            />
            <h2 className="text-2xl font-fancy mb-4">Join Family Account</h2>
            <p className="text-gray-600 mb-6">
              You've been invited to join{" "}
              <span className="font-semibold">{accountName}</span>!
            </p>
            <p className="text-gray-600 mb-8">
              Joining this account will move you from your current account.
              You'll still keep your user profile, but you'll now share chores
              with this family.
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleJoinAccount}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Join Account
              </button>
              <button
                onClick={handleCancel}
                className="w-full px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {invitationStatus === "processing" && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-medium text-gray-700">
              Joining account...
            </h2>
          </div>
        )}

        {invitationStatus === "success" && (
          <div className="text-center">
            <div className="bg-green-100 p-3 rounded-full inline-flex mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-fancy text-gray-700 mb-4">Success!</h2>
            <p className="text-gray-600 mb-6">
              You've successfully joined {accountName}. Redirecting to your
              dashboard...
            </p>
          </div>
        )}

        {invitationStatus === "error" && (
          <div className="text-center">
            <div className="bg-red-100 p-3 rounded-full inline-flex mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-fancy text-gray-700 mb-4">Error</h2>
            <p className="text-gray-600 mb-6">
              {error ||
                "There was an error joining the account. Please try again."}
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleJoinAccount}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleCancel}
                className="w-full px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
