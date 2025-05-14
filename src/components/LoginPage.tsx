import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { signInWithGoogle, error } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-cartoon">
        <div className="text-center">
          <img
            src="/pocket-bunnies-head.png"
            alt="Pocket Bunnies Logo"
            className="mx-auto h-24 w-auto"
          />
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 font-fancy">
            Welcome to Pocket Bunnies
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to manage your family chores
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="mt-8 space-y-4">
          <button
            onClick={signInWithGoogle}
            className="group relative w-full flex justify-center py-4 px-4 border-transparent text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 shadow-sm transition-colors"
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
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>
            By continuing, you agree to the Pocket Bunnies Terms of Service and
            Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
