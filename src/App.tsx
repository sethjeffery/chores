import { Routes, Route } from "react-router-dom";
import { AccountProvider } from "./features/account/providers/AccountProvider";
import { FamilyProvider } from "./features/family/providers/FamilyProvider";
import { ChoresProvider } from "./features/chores/providers/ChoresProvider";
import AppContent from "./features/layout/components/AppContent";
import LoginPage from "./features/auth/components/LoginPage";
import AuthCallback from "./features/auth/components/AuthCallback";
import ProtectedRoute from "./features/auth/components/ProtectedRoute";
import AccountInvitationPage from "./features/account/components/AccountInvitationPage";

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/invite/:token"
        element={
          <AccountProvider>
            <AccountInvitationPage />
          </AccountProvider>
        }
      />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={
            <AccountProvider>
              <FamilyProvider>
                <ChoresProvider>
                  <AppContent />
                </ChoresProvider>
              </FamilyProvider>
            </AccountProvider>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
