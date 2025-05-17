import { Routes, Route } from "react-router-dom";
import { AccountProvider } from "./features/account/providers/AccountProvider";
import { FamilyProvider } from "./features/family/providers/FamilyProvider";
import { ChoresProvider } from "./features/chores/providers/ChoresProvider";
import { OnboardingProvider } from "./features/onboarding/providers/OnboardingProvider";
import WelcomePage from "./features/onboarding/components/WelcomePage";
import AppContent from "./features/layout/components/AppContent";
import LoginPage from "./features/auth/components/LoginPage";
import AuthCallback from "./features/auth/components/AuthCallback";
import ProtectedRoute from "./features/auth/components/ProtectedRoute";
import AccountInvitationPage from "./features/account/components/AccountInvitationPage";
import ChildFriendlyContent from "./features/layout/components/ChildFriendlyContent";

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

      {/* Public shared view route - no login required */}
      <Route
        path="/shared/:shareToken"
        element={
          <AccountProvider>
            <FamilyProvider>
              <ChoresProvider>
                <ChildFriendlyContent />
              </ChoresProvider>
            </FamilyProvider>
          </AccountProvider>
        }
      />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        {/* Welcome/Onboarding route */}
        <Route
          path="/welcome"
          element={
            <AccountProvider>
              <FamilyProvider>
                <ChoresProvider>
                  <OnboardingProvider>
                    <WelcomePage />
                  </OnboardingProvider>
                </ChoresProvider>
              </FamilyProvider>
            </AccountProvider>
          }
        />

        {/* Main app route */}
        <Route
          path="/"
          element={
            <AccountProvider>
              <FamilyProvider>
                <ChoresProvider>
                  <OnboardingProvider>
                    <AppContent />
                  </OnboardingProvider>
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
