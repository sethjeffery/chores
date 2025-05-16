import { useContext } from "react";
import { OnboardingContext } from "../contexts/OnboardingContext";
import type { OnboardingContextType } from "../contexts/OnboardingContext";

// Custom hook to use the onboarding context
export function useOnboarding(): OnboardingContextType {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
