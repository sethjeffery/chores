import { createContext } from "react";

export type OnboardingStep =
  | "profile"
  | "family"
  | "join"
  | "chore"
  | "complete"
  | null;

// Define the context type
export interface OnboardingContextType {
  currentStep: OnboardingStep;
  isOnboarding: boolean;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  goToStep: (step: OnboardingStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

// Create the context with a default value
export const OnboardingContext = createContext<
  OnboardingContextType | undefined
>(undefined);
