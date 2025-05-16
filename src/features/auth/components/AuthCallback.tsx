import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../../supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      try {
        // Get auth info from URL
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setError(error.message);
          return;
        }

        if (!data.session) {
          setError("No session found. Please try again.");
          return;
        }

        // Check three possible sources of redirect:
        // 1. URL parameter redirectTo
        // 2. Session metadata originalRedirect (from magic link)
        // 3. Default redirect to home

        // First check URL params
        const params = new URLSearchParams(window.location.search);
        let redirectTo = params.get("redirectTo");

        // If no redirectTo in URL, check session metadata (for magic links)
        if (!redirectTo) {
          const originalRedirect =
            data.session.user.user_metadata?.originalRedirect;
          if (originalRedirect && typeof originalRedirect === "string") {
            console.log(
              "Found original redirect in metadata:",
              originalRedirect
            );
            redirectTo = originalRedirect;

            // Clean up the metadata since we don't need it anymore
            await supabase.auth.updateUser({
              data: { originalRedirect: null },
            });
          }
        }

        // If this is an invitation flow, handle it differently
        if (redirectTo && redirectTo.includes("/invite/")) {
          // Extract the token from the redirect URL
          const invitationToken = redirectTo.split("/invite/")[1];
          navigate(`/invite/${invitationToken}`);
          return;
        }

        try {
          setMigrationStatus("Migrating your data...");

          // Migrate any existing data
          // await migrateUserDataToAccount(data.session.user.id);

          // Always redirect to the home page where the onboarding provider will handle the flow
          navigate("/");
        } catch (migrationError) {
          console.error("Data migration error:", migrationError);
          // Continue anyway - even if migration fails, the user should be able to use the app
          navigate("/");
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("Authentication failed. Please try again.");
      }
    };

    handleAuthCallback();
  }, [navigate, location]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-cartoon max-w-md w-full text-center">
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
          <h2 className="text-xl font-medium text-gray-700">
            Authentication Error
          </h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-cartoon max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-medium text-gray-700">Signing you in...</h2>
        <p className="text-gray-500 mt-2">
          {migrationStatus || "Preparing your account"}
        </p>
      </div>
    </div>
  );
}
