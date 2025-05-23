import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";

export default function LoginPage() {
  const {
    signInWithGoogle,
    signInWithMagicLink,
    error: authError,
    user,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get the redirect URL from the query parameters
  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get("redirect") || "/";

  // Redirect to redirect URL or home if already authenticated
  useEffect(() => {
    if (user) {
      navigate(redirectUrl);
    }
  }, [user, navigate, redirectUrl]);

  const handleGoogleSignIn = async () => {
    try {
      // For Google sign-in, we want to redirect to our auth callback first
      // with the original redirect URL as a parameter
      const callbackUrl = `${window.location.origin}/auth/callback`;

      // Add redirectTo parameter if we have a redirect URL
      const finalCallbackUrl =
        redirectUrl !== "/"
          ? `${callbackUrl}?redirectTo=${encodeURIComponent(redirectUrl)}`
          : callbackUrl;

      await signInWithGoogle({
        redirectTo: finalCallbackUrl,
      });

      // The redirect will happen in the useEffect hook when user is set
    } catch (err) {
      console.error("Google sign in error:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (!email.trim()) {
        setFormError("Please enter your email address");
        setIsSubmitting(false);
        return;
      }

      // For magic links:
      // 1. Always redirect to auth callback endpoint first
      // 2. Pass the original redirect URL so it can be stored in user metadata
      const options = {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Only include originalRedirect if we're not going to the home page
        ...(redirectUrl !== "/" && { originalRedirect: redirectUrl }),
      };

      const { error, sent } = await signInWithMagicLink(email, options);

      if (error) {
        setFormError(error);
      } else if (sent) {
        setMagicLinkSent(true);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const showEmailSignIn = () => {
    setShowEmailForm(true);
    setFormError(null);
    setMagicLinkSent(false);
  };

  const hideEmailForm = () => {
    setShowEmailForm(false);
    setFormError(null);
    setMagicLinkSent(false);
  };

  // Login form content
  const loginFormContent = (
    <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-cartoon">
      <div className="text-center">
        <img
          src="/pocket-bunnies-head.png"
          alt="Pocket Bunnies Logo"
          className="mx-auto h-24 w-auto"
        />
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 font-fancy">
          {showEmailForm ? "Sign In with Email" : "Welcome to Pocket Bunnies"}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to manage your family chores
        </p>
      </div>

      {(authError || formError) && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <p className="text-red-700 text-sm">{formError || authError}</p>
        </div>
      )}

      {!showEmailForm ? (
        <div className="mt-8 space-y-4">
          <button
            onClick={handleGoogleSignIn}
            type="button"
            className="group relative w-full flex justify-center py-3 px-4 border-transparent text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
          >
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M12 5.04c2.17 0 4.08.76 5.59 2.02l4.17-4.16C19.63 1.02 16.07 0 12 0 7.39 0 3.36 2.7 1.33 6.65l4.84 3.76c1.13-3.39 4.56-5.37 7.83-5.37z"
                />
                <path
                  fill="#34A853"
                  d="M23.59 12.25c0-.96-.15-1.88-.38-2.76H12v5.24h6.46c-.31 1.57-1.19 2.91-2.46 3.82l4.74 3.68c2.78-2.57 4.31-6.33 4.31-10.73z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.33 14.59l-4.84 3.76C2.7 21.3 7.39 24 12 24c4.07 0 7.49-1.31 9.99-3.57l-4.74-3.68c-1.3.87-2.99 1.34-5.24 1.34-3.27 0-6.09-1.86-7.17-5.16z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.82 0 3.49.65 4.78 1.8l4.06-4.06C18.71 1.01 15.64 0 12 0 7.39 0 3.36 2.7 1.33 6.65l4.84 3.76C7.1 6.65 10.53 5.04 12 5.04z"
                />
              </svg>
              Continue with Google
            </span>
          </button>

          <button
            onClick={showEmailSignIn}
            type="button"
            className="group relative w-full flex justify-center py-3 px-4 border-transparent text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
          >
            <span className="flex items-center">
              <svg
                className="w-5 h-5 mr-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="2"
                  y="4"
                  width="20"
                  height="16"
                  rx="2"
                  strokeWidth="2"
                />
                <path
                  d="M22 7L13.03 12.7C12.7213 12.8934 12.3679 13 12 13C11.6321 13 11.2787 12.8934 10.97 12.7L2 7"
                  strokeWidth="2"
                />
              </svg>
              Continue with Email
            </span>
          </button>
        </div>
      ) : magicLinkSent ? (
        <div className="mt-6 space-y-4">
          <div className="bg-green-50 p-6 rounded-lg text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-green-500 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
              />
            </svg>
            <h3 className="text-lg font-medium text-green-800 mb-2">
              Magic Link Sent!
            </h3>
            <p className="text-green-700">
              We've sent a magic link to <strong>{email}</strong>. Check your
              email and click the link to sign in.
            </p>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            <p>
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <button
              type="button"
              onClick={hideEmailForm}
              className="mt-4 text-indigo-600 hover:text-indigo-500 focus:outline-none"
            >
              ← Back to sign in options
            </button>
          </div>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700 block mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Email address"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Send Magic Link"
                )}
              </button>
            </div>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            <p>We'll send you a magic link to sign in without a password</p>
            <button
              type="button"
              onClick={hideEmailForm}
              className="mt-3 text-indigo-600 hover:text-indigo-500 focus:outline-none"
            >
              ← Back to sign in options
            </button>
          </div>
        </>
      )}

      <div className="mt-4 text-center text-xs text-gray-500">
        <p>
          By continuing, you agree to the Pocket Bunnies Terms of Service and
          Privacy Policy
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 px-4 py-12">
      {/* Single column layout */}
      <div className="flex justify-center w-full">{loginFormContent}</div>
    </div>
  );
}
