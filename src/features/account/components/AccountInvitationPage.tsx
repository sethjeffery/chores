import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useSWRConfig } from "swr";
import * as invitationService from "../services/invitationService";
import * as accountService from "../services/accountService";
import { supabase } from "../../../supabase";
import { CheckIcon, ExclamationMarkIcon } from "@phosphor-icons/react";

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

  // User profile information
  const [userName, setUserName] = useState<string>("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);
  const [needsProfileUpdate, setNeedsProfileUpdate] = useState<boolean>(false);

  // Check if user profile needs updating
  useEffect(() => {
    if (user) {
      const userFullName = user.user_metadata?.full_name;
      setUserName(userFullName || "");
      setNeedsProfileUpdate(!userFullName);
    }
  }, [user]);

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

  // Update user profile
  const updateUserProfile = async () => {
    if (!user || !userName.trim()) {
      setError("Please enter your name");
      return false;
    }

    setIsUpdatingProfile(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: userName.trim() },
      });

      if (error) {
        throw error;
      }

      return true;
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile");
      return false;
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle joining the account
  const handleJoinAccount = async () => {
    if (!token || !user) {
      // If user is not logged in, redirect to login page
      // We'll pass the invitation token so we can redirect back after login
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }

    // If user needs to update their profile first
    if (needsProfileUpdate) {
      const profileUpdated = await updateUserProfile();
      if (!profileUpdated) return;
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
              <ExclamationMarkIcon
                className="h-6 w-6 text-red-500"
                weight="bold"
              />
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

        {invitationStatus === "valid" && user && needsProfileUpdate && (
          <div className="text-center">
            <img
              src="/pocket-bunnies-head.png"
              alt="Pocket Bunnies Logo"
              className="mx-auto h-16 w-auto mb-4"
            />
            <h2 className="text-2xl font-fancy mb-4">Almost There!</h2>
            <p className="text-gray-600 mb-6">
              Before you join{" "}
              <span className="font-semibold">{accountName}</span>, please tell
              us your name.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700 text-left mb-1"
              >
                Your Name
              </label>
              <input
                type="text"
                id="fullName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your name"
                disabled={isUpdatingProfile}
              />
            </div>

            <div className="flex flex-col space-y-3">
              <button
                onClick={handleJoinAccount}
                disabled={isUpdatingProfile}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-70"
              >
                {isUpdatingProfile ? "Saving..." : "Continue"}
              </button>
              <button
                onClick={handleCancel}
                disabled={isUpdatingProfile}
                className="w-full px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-70"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {invitationStatus === "valid" && user && !needsProfileUpdate && (
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
            <p className="text-gray-500 mt-2">This will just take a moment.</p>
          </div>
        )}

        {invitationStatus === "success" && (
          <div className="text-center">
            <div className="bg-green-100 p-3 rounded-full inline-flex mb-4">
              <CheckIcon className="h-6 w-6 text-green-500" weight="bold" />
            </div>
            <h2 className="text-xl font-fancy text-gray-700 mb-4">
              Welcome to {accountName}!
            </h2>
            <p className="text-gray-600 mb-6">
              You have successfully joined the account. You'll be redirected to
              the dashboard in a moment.
            </p>
          </div>
        )}

        {invitationStatus === "error" && (
          <div className="text-center">
            <div className="bg-red-100 p-3 rounded-full inline-flex mb-4">
              <ExclamationMarkIcon
                className="h-6 w-6 text-red-500"
                weight="bold"
              />
            </div>
            <h2 className="text-xl font-fancy text-gray-700 mb-4">
              Something Went Wrong
            </h2>
            <p className="text-gray-600 mb-6">
              {error || "There was an error joining the account."}
            </p>
            <button
              onClick={handleJoinAccount}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
