import { useState } from "react";
import { useAuth } from "../../../auth/hooks/useAuth";
import { useOnboarding } from "../../hooks/useOnboarding";
import { supabase } from "../../../../supabase";
import OnboardingStepLayout from "../../components/OnboardingStepLayout";

export default function ProfileStep() {
  const { user } = useAuth();
  const { goToNextStep } = useOnboarding();
  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Update user metadata with full name
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      if (error) {
        throw error;
      }

      // Move to the next step
      goToNextStep();
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingStepLayout
      title="Welcome to Pocket Bunnies!"
      subtitle="Let's start by setting up your profile"
      currentStep={1}
      totalSteps={4}
      showSkip={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Your Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm"
            placeholder="Enter your full name"
            required
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </button>
        </div>
      </form>
    </OnboardingStepLayout>
  );
}
