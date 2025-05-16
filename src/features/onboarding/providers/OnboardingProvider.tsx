import { useState, useCallback, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { OnboardingContext } from "../contexts/OnboardingContext";
import type { OnboardingStep } from "../contexts/OnboardingContext";
import { useAuth } from "../../auth/hooks/useAuth";
import { supabase } from "../../../supabase";

// Define the step order for navigation
const STEP_ORDER: OnboardingStep[] = [
  "profile",
  "join",
  "family",
  "chore",
  "complete",
];

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Start the onboarding process
  const startOnboarding = useCallback(() => {
    setIsOnboarding(true);
    setCurrentStep("profile");
  }, []);

  // Complete the onboarding process
  const completeOnboarding = useCallback(() => {
    setIsOnboarding(false);
    setCurrentStep(null);
    navigate("/");
  }, [navigate]);

  // Skip the onboarding process
  const skipOnboarding = useCallback(() => {
    setIsOnboarding(false);
    setCurrentStep(null);
    navigate("/");
  }, [navigate]);

  // Go to a specific step
  const goToStep = useCallback((step: OnboardingStep) => {
    setCurrentStep(step);
  }, []);

  // Go to the next step
  const goToNextStep = useCallback(() => {
    setCurrentStep((prevStep) => {
      if (!prevStep) return "profile";

      const currentIndex = STEP_ORDER.indexOf(prevStep);
      if (currentIndex < 0 || currentIndex >= STEP_ORDER.length - 1) {
        return "complete";
      }

      return STEP_ORDER[currentIndex + 1];
    });
  }, []);

  // Go to the previous step
  const goToPreviousStep = useCallback(() => {
    setCurrentStep((prevStep) => {
      if (!prevStep) return null;

      const currentIndex = STEP_ORDER.indexOf(prevStep);
      if (currentIndex <= 0) {
        return "profile";
      }

      return STEP_ORDER[currentIndex - 1];
    });
  }, []);

  // Check if the user needs onboarding when they log in
  useEffect(() => {
    const checkOnboardingNeeded = async () => {
      // Skip if we're already on the welcome page or we're not logged in
      if (!user || location.pathname === "/welcome") return;

      // Check if the user has full_name in metadata
      const needsProfile = !user.user_metadata?.full_name;

      // Get account info to see if they're in an existing account
      const { data: accountData } = await supabase
        .from("account_users")
        .select("*")
        .eq("user_id", user.id);

      const hasNoAccount = !accountData || accountData.length === 0;

      // Determine if we need to redirect to welcome
      if (needsProfile || hasNoAccount) {
        // Redirect to welcome instead of auto-starting onboarding
        navigate("/welcome");
      }
    };

    checkOnboardingNeeded();
  }, [user, navigate, location.pathname]);

  // Create the context value
  const value = useMemo(
    () => ({
      currentStep,
      isOnboarding,
      startOnboarding,
      completeOnboarding,
      skipOnboarding,
      goToStep,
      goToNextStep,
      goToPreviousStep,
    }),
    [
      currentStep,
      isOnboarding,
      startOnboarding,
      completeOnboarding,
      skipOnboarding,
      goToStep,
      goToNextStep,
      goToPreviousStep,
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
