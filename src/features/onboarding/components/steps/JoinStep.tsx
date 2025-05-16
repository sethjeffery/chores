import { useState } from "react";
import { useOnboarding } from "../../hooks/useOnboarding";
import OnboardingStepLayout from "../OnboardingStepLayout";
import { UsersThreeIcon, HandWavingIcon } from "@phosphor-icons/react";
import { useAccount } from "../../../account/hooks/useAccount";
import { useAuth } from "../../../auth/hooks/useAuth";

export default function JoinStep() {
  const { goToNextStep } = useOnboarding();
  const { createAccount } = useAccount();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateFamily = async () => {
    try {
      setIsCreating(true);
      setError(null);

      // Generate a name for the family account based on the user's name
      const name = user?.user_metadata?.full_name
        ? `${user.user_metadata.full_name}'s Family`
        : "Family Account";

      // Create the account
      await createAccount(name);

      // Continue to the next step
      goToNextStep();
    } catch (err) {
      console.error("Error creating family account:", err);
      setError("Failed to create family account. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinFamily = () => {
    // Show instructions about joining
    setError(
      "To join a family, you need to ask the owner for an invitation link. Check back here once you have an invitation link."
    );
  };

  return (
    <OnboardingStepLayout
      title="Family Account"
      subtitle="Are you creating a new account or joining an existing one?"
      currentStep={2}
      totalSteps={4}
      showSkip={false}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <button
            type="button"
            onClick={handleCreateFamily}
            disabled={isCreating}
            className="p-4 border-2 rounded-xl flex items-center border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-50"
          >
            <div className="bg-indigo-100 rounded-full p-2 mr-3 w-12 h-12 flex items-center justify-center">
              <UsersThreeIcon
                size={28}
                weight="fill"
                className="text-indigo-600"
              />
            </div>
            <div className="text-left">
              <h3 className="font-medium">
                {isCreating ? "Creating..." : "Create a new family"}
              </h3>
              <p className="text-sm text-gray-500">
                Start fresh with your own family account
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleJoinFamily}
            disabled={isCreating}
            className="p-4 border-2 rounded-xl flex items-center border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-50"
          >
            <div className="bg-indigo-100 rounded-full p-2 mr-3 w-12 h-12 flex items-center justify-center">
              <HandWavingIcon
                size={28}
                weight="fill"
                className="text-indigo-600"
              />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Join an existing family</h3>
              <p className="text-sm text-gray-500">
                Connect to a family someone else created
              </p>
            </div>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800">
            {error}
          </div>
        )}
      </div>
    </OnboardingStepLayout>
  );
}
