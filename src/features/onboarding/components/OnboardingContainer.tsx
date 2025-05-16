import { useOnboarding } from "../hooks/useOnboarding";
import {
  ProfileStep,
  JoinStep,
  FamilyStep,
  ChoreStep,
  CompleteStep,
} from "./steps";

export default function OnboardingContainer() {
  const { currentStep, isOnboarding } = useOnboarding();

  // If not in onboarding state, don't render anything
  if (!isOnboarding) {
    return null;
  }

  // Render the appropriate step based on currentStep
  switch (currentStep) {
    case "profile":
      return <ProfileStep />;
    case "join":
      return <JoinStep />;
    case "family":
      return <FamilyStep />;
    case "chore":
      return <ChoreStep />;
    case "complete":
      return <CompleteStep />;
    default:
      return null;
  }
}
