import { useState, useRef } from "react";
import EmojiPicker from "../../../shared/components/EmojiPicker";
import { CHORE_ICONS, choreIconCategories } from "../constants/icons";
import type { FamilyMember } from "../../../types";
import { AVATARS } from "../../family/constants/avatars";
// Use a lighter shade for the icon background
const ICON_BG_COLOR = "#EEF2FF"; // light indigo background color

export interface ChoreFormData {
  title: string;
  icon: string;
  assigneeId?: string;
  reward?: number | string;
}

interface ChoreFormFieldsProps {
  data: ChoreFormData;
  onChange: (data: ChoreFormData) => void;
  familyMembers: FamilyMember[];
  error?: string | null;
  submitLabel?: string;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

const calculateAge = (dateString: string | null) => {
  if (!dateString) return null;

  try {
    const birthDate = new Date(dateString);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // If birthday hasn't occurred yet this year, subtract one year
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  } catch {
    return null;
  }
};

export default function ChoreFormFields({
  data,
  onChange,
  familyMembers,
  error = null,
  submitLabel = "Add Chore",
  onSubmit,
  isSubmitting = false,
  onCancel,
}: ChoreFormFieldsProps) {
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = <K extends keyof ChoreFormData>(
    field: K,
    value: ChoreFormData[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="choreTitle"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Chore Title
        </label>
        <div className="flex relative">
          <div
            className={`absolute inset-y-0 left-0 flex items-center justify-center w-12 border pointer-events-none ${
              isInputFocused
                ? "border-indigo-500 ring-2 ring-indigo-500"
                : "border-indigo-200"
            } border-r-0 rounded-l-xl transition-colors`}
            style={{ backgroundColor: ICON_BG_COLOR }}
          >
            {data.icon}
          </div>
          <input
            ref={inputRef}
            id="choreTitle"
            type="text"
            value={data.title}
            onChange={(e) => handleChange("title", e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            className="w-full pl-16 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm"
            placeholder="E.g., Clean bedroom, Wash dishes"
            required
          />
        </div>
      </div>

      <EmojiPicker
        value={data.icon}
        onChange={(icon) => handleChange("icon", icon)}
        emojiSource={CHORE_ICONS}
        categories={choreIconCategories}
        label="Choose an Icon"
        id="chore-icon"
      />

      <div>
        <label
          htmlFor="assignee"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Assign To <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {familyMembers.map((member: FamilyMember) => (
            <button
              key={member.id}
              type="button"
              onClick={() =>
                handleChange(
                  "assigneeId",
                  data.assigneeId === member.id ? undefined : member.id
                )
              }
              className={`px-1 py-1 rounded-xl flex items-center border ${
                data.assigneeId === member.id
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {member.avatar && member.avatar in AVATARS ? (
                <img
                  src={AVATARS[member.avatar as keyof typeof AVATARS]}
                  alt={member.name}
                  className="w-16 h-16 object-cover"
                />
              ) : null}
              <div className="flex flex-col text-left">
                <div className="text-lg truncate">{member.name}</div>
                <div className="text-xs text-gray-500">
                  {calculateAge(member.dob)} years old
                </div>
              </div>
            </button>
          ))}
          {familyMembers.length === 0 && (
            <p className="text-sm text-gray-500 col-span-2">
              No family members added yet. Add family members to assign chores.
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="reward"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Reward <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">£</span>
          </div>
          <input
            id="reward"
            type="number"
            min="0"
            step="0.01"
            value={typeof data.reward === "undefined" ? "" : data.reward}
            onChange={(e) =>
              handleChange(
                "reward",
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            className="w-full pl-7 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm"
            placeholder="0.00"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      <div className={onCancel ? "flex space-x-3" : "pt-2"}>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${
            onCancel ? "flex-1" : "w-full"
          } flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50`}
        >
          {isSubmitting ? "Submitting..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors text-gray-700 hover:border-gray-400"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
