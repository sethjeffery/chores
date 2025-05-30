import { useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingContext } from "../contexts/OnboardingContext";
import type { OnboardingStep } from "../contexts/OnboardingContext";

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
