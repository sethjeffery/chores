import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  // Show loading indicator while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-cartoon max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-medium text-gray-700">Loading ...</h2>
          <p className="text-gray-500 mt-2">Getting all the bunnies ready...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return <Outlet />;
}
