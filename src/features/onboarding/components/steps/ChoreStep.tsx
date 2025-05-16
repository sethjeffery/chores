import { useState } from "react";
import { useOnboarding } from "../../hooks/useOnboarding";
import OnboardingStepLayout from "../../components/OnboardingStepLayout";
import { useChoresContext } from "../../../chores/hooks/useChoresContext";
import { useFamilyContext } from "../../../family/hooks/useFamilyContext";
import ChoreFormFields from "../../../chores/components/ChoreFormFields";
import type { ChoreFormData } from "../../../chores/components/ChoreFormFields";

export default function ChoreStep() {
  const { completeOnboarding } = useOnboarding();
  const { addChore } = useChoresContext();
  const { familyMembers } = useFamilyContext();

  const [formData, setFormData] = useState<ChoreFormData>({
    title: "",
    icon: "🧹",
    assigneeId: undefined,
    reward: undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError("Please enter a chore title");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Add the chore to the database
      await addChore(
        formData.title,
        formData.assigneeId,
        typeof formData.reward === "string"
          ? parseFloat(formData.reward)
          : formData.reward,
        formData.icon
      );

      // Complete the onboarding process
      completeOnboarding();
    } catch (err) {
      console.error("Error adding chore:", err);
      setError(err instanceof Error ? err.message : "Failed to add chore");
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingStepLayout
      title="Create Your First Chore"
      subtitle="Let's create your first task to get started"
      currentStep={4}
      totalSteps={4}
      onSkip={completeOnboarding}
    >
      <ChoreFormFields
        data={formData}
        onChange={setFormData}
        familyMembers={familyMembers}
        error={error}
        submitLabel="Create Chore & Finish"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </OnboardingStepLayout>
  );
}
