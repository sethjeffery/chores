import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "../hooks/useOnboarding";
import { useAccount } from "../../account/hooks/useAccount";
import {
  ProfileStep,
  JoinStep,
  FamilyStep,
  ChoreStep,
  CompleteStep,
} from "./steps";

export default function WelcomePage() {
  const { currentStep, isOnboarding, startOnboarding } = useOnboarding();
  const { activeAccount } = useAccount();
  const navigate = useNavigate();

  // If user already has an account, redirect them to the dashboard
  useEffect(() => {
    if (activeAccount && !isOnboarding) {
      navigate("/");
    }
  }, [activeAccount, isOnboarding, navigate]);

  // Start onboarding if not already started
  useEffect(() => {
    if (!isOnboarding) {
      startOnboarding();
    }
  }, [isOnboarding, startOnboarding]);

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
      // Show loading state until we determine which step to show
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="spinner w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      );
  }
}
