import { useEffect } from "react";
import { useOnboarding } from "../../hooks/useOnboarding";
import OnboardingStepLayout from "../OnboardingStepLayout";

export default function CompleteStep() {
  const { completeOnboarding } = useOnboarding();

  // Automatically complete onboarding after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      completeOnboarding();
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, [completeOnboarding]);

  return (
    <OnboardingStepLayout
      title="All Set!"
      subtitle="You're all set up and ready to use Pocket Bunnies"
      currentStep={4}
      totalSteps={4}
      showSkip={false}
    >
      <div className="text-center py-8">
        <div className="flex justify-center mb-6">
          <div className="animate-bounce bg-indigo-100 p-4 rounded-full">
            <span className="text-4xl">🎉</span>
          </div>
        </div>

        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Welcome to Pocket Bunnies!
        </h3>
        <p className="text-gray-600 mb-6">
          You're all set up and ready to start managing chores for your family.
          Taking you to the dashboard...
        </p>

        <div className="w-full max-w-xs mx-auto">
          <button
            type="button"
            onClick={completeOnboarding}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </OnboardingStepLayout>
  );
}
