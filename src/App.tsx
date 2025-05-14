import { Routes, Route } from "react-router-dom";
import { FamilyProvider } from "./providers/FamilyProvider";
import AppContent from "./components/AppContent";
import LoginPage from "./components/LoginPage";
import AuthCallback from "./components/AuthCallback";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={
            <FamilyProvider>
              <AppContent />
            </FamilyProvider>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
