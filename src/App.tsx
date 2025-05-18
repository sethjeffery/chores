import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AccountProvider } from "./features/account/providers/AccountProvider";
import { FamilyProvider } from "./features/family/providers/FamilyProvider";
import { ChoresProvider } from "./features/chores/providers/ChoresProvider";
import { OnboardingProvider } from "./features/onboarding/providers/OnboardingProvider";
import ProtectedRoute from "./features/auth/components/ProtectedRoute";
import LoadingState from "./features/layout/components/LoadingState";

// Lazy-loaded components
const WelcomePage = lazy(
  () => import("./features/onboarding/components/WelcomePage")
);
const AppContent = lazy(
  () => import("./features/layout/components/AppContent")
);
const LoginPage = lazy(() => import("./features/auth/components/LoginPage"));
const AuthCallback = lazy(
  () => import("./features/auth/components/AuthCallback")
);
const AccountInvitationPage = lazy(
  () => import("./features/account/components/AccountInvitationPage")
);
const ChildFriendlyContent = lazy(
  () => import("./features/layout/components/ChildFriendlyContent")
);

function App() {
  return (
    <Suspense fallback={<LoadingState />}>
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
    </Suspense>
  );
}

export default App;
