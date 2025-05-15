import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
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

        // Run the migration
        try {
          setMigrationStatus("Migrating your data...");

          // Migrate any existing data
          // await migrateUserDataToAccount(data.session.user.id);

          // Redirect to the home page after successful authentication and migration
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
  }, [navigate]);

  // Show a loading indicator
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-cartoon max-w-md w-full">
        {!error ? (
          <>
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
              <h2 className="text-xl font-medium text-gray-700">
                Signing you in...
              </h2>
              <p className="text-gray-500 mt-2">
                {migrationStatus ||
                  "Just a moment while we complete the authentication"}
              </p>
            </div>
          </>
        ) : (
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
        )}
      </div>
    </div>
  );
}
