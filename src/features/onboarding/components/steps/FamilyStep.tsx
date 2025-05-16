import { useState } from "react";
import { useOnboarding } from "../../hooks/useOnboarding";
import OnboardingStepLayout from "../../components/OnboardingStepLayout";
import EmojiPicker from "../../../../shared/components/EmojiPicker";
import {
  ONBOARDING_AVATARS,
  ONBOARDING_AVATAR_CATEGORIES,
} from "../../constants/onboardingAvatars";
import { COLORS } from "../../../family/constants/avatars";
import { useFamilyContext } from "../../../family/hooks/useFamilyContext";
import { CaretDownIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";

interface FamilyMemberForm {
  name: string;
  avatar: string;
  dob: string;
  isExpanded: boolean;
  color: string;
}

const NEW_FAMILY_MEMBER = {
  name: "",
  avatar: "👧",
  dob: "",
  isExpanded: true,
  color: COLORS[Math.floor(Math.random() * COLORS.length)],
};

export default function FamilyStep() {
  const { goToNextStep, skipOnboarding } = useOnboarding();
  const { addFamilyMember } = useFamilyContext();

  const [familyMembers, setFamilyMembers] = useState<FamilyMemberForm[]>([
    { ...NEW_FAMILY_MEMBER },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMember = () => {
    // Collapse all existing members
    const updatedMembers = familyMembers.map((member) => ({
      ...member,
      isExpanded: false,
    }));

    // Add a new expanded member with random color
    const newMember = {
      ...NEW_FAMILY_MEMBER,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    setFamilyMembers([...updatedMembers, newMember]);

    setError(null);
  };

  const handleInputChange = (
    index: number,
    field: keyof Omit<FamilyMemberForm, "isExpanded" | "color">,
    value: string
  ) => {
    const updatedMembers = [...familyMembers];
    updatedMembers[index] = {
      ...updatedMembers[index],
      [field]: value,
    };
    setFamilyMembers(updatedMembers);
    setError(null);
  };

  const handleRemoveMember = (index: number) => {
    if (familyMembers.length === 1) {
      setError("You need at least one family member");
      return;
    }

    const updatedMembers = familyMembers.filter((_, i) => i !== index);

    // If we removed the only expanded member, expand the first one
    if (
      familyMembers[index].isExpanded &&
      !updatedMembers.some((m) => m.isExpanded)
    ) {
      updatedMembers[0].isExpanded = true;
    }

    setFamilyMembers(updatedMembers);
    setError(null);
  };

  const expandMember = (index: number) => {
    // Expand the targeted member and collapse all others
    const updatedMembers = familyMembers.map((member, i) => ({
      ...member,
      isExpanded: i === index ? true : false,
    }));
    setFamilyMembers(updatedMembers);
  };

  const toggleExpand = (index: number) => {
    const currentIsExpanded = familyMembers[index].isExpanded;
    const updatedMembers = familyMembers.map((member, i) => ({
      ...member,
      isExpanded: i === index ? !currentIsExpanded : false,
    }));
    setFamilyMembers(updatedMembers);
  };

  const handleSubmit = async () => {
    // Validate all members have names and DOBs
    const invalidMember = familyMembers.find(
      (member) => member.name.trim() === "" || member.dob.trim() === ""
    );

    if (invalidMember) {
      setError("All family members must have a name and date of birth");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Add family members to the database
      for (const member of familyMembers) {
        if (member.name.trim()) {
          await addFamilyMember(
            member.name,
            member.avatar,
            member.color,
            member.dob
          );
        }
      }

      // Move to the next step
      goToNextStep();
    } catch (err) {
      console.error("Error adding family members:", err);
      setError(
        err instanceof Error ? err.message : "Failed to add family members"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingStepLayout
      title="Add Family Members"
      subtitle="Let's add the people in your family"
      currentStep={3}
      totalSteps={4}
      onSkip={skipOnboarding}
    >
      <div className="space-y-6">
        {/* Family member cards */}
        <div className="grid grid-cols-1 gap-3">
          {familyMembers.map((member, index) => (
            <div
              key={index}
              className="border-2 rounded-xl overflow-hidden shadow-sm"
            >
              {/* Member header (always visible) */}
              <div
                className={`p-3 flex items-center ${
                  member.isExpanded
                    ? "bg-indigo-50 border-b border-indigo-100"
                    : ""
                }`}
              >
                <div
                  className="rounded-full p-2 mr-2 h-12 w-12 min-w-12 flex items-center justify-center text-xl"
                  style={{ backgroundColor: member.color }}
                >
                  {member.avatar}
                </div>
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) =>
                    handleInputChange(index, "name", e.target.value)
                  }
                  onFocus={() => expandMember(index)}
                  placeholder="Family member name"
                  className="w-full bg-transparent border-0 focus:ring-0 text-md font-medium p-2"
                />
                <div className="flex items-center space-x-2">
                  {familyMembers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(index)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                      aria-label="Remove member"
                    >
                      <TrashIcon className="h-5 w-5" weight="bold" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleExpand(index)}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-full"
                    aria-label={member.isExpanded ? "Collapse" : "Expand"}
                  >
                    <CaretDownIcon
                      className={`h-5 w-5 transition-transform ${
                        member.isExpanded ? "rotate-180" : ""
                      }`}
                      weight="bold"
                    />
                  </button>
                </div>
              </div>

              {/* Member details (only visible when expanded) */}
              {member.isExpanded && (
                <div className="p-4 bg-white border-gray-100">
                  <div className="mb-4">
                    <EmojiPicker
                      value={member.avatar}
                      onChange={(emoji) =>
                        handleInputChange(index, "avatar", emoji)
                      }
                      emojiSource={ONBOARDING_AVATARS}
                      categories={ONBOARDING_AVATAR_CATEGORIES}
                      id={`member-avatar-${index}`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`member-dob-${index}`}
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Date of Birth
                    </label>
                    <input
                      id={`member-dob-${index}`}
                      type="date"
                      value={member.dob}
                      onChange={(e) =>
                        handleInputChange(index, "dob", e.target.value)
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddMember}
            className="p-3 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center hover:border-gray-400 text-gray-500 hover:text-gray-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" weight="bold" />
            Add Family Member
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </OnboardingStepLayout>
  );
}
