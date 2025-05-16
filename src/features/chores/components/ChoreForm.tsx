import { useState, useRef } from "react";
import { useFamilyContext } from "../../family/hooks/useFamilyContext";
import { CHORE_ICONS } from "../constants/icons";
import ModalDialog from "../../../shared/components/ModalDialog";
import ChoreFormFields from "./ChoreFormFields";
import type { ChoreFormData } from "./ChoreFormFields";

interface ChoreFormProps {
  onAdd: (
    title: string,
    assigneeId?: string, // UUID reference to family_members.id
    reward?: number,
    icon?: string
  ) => void;
}

export default function ChoreForm({ onAdd }: ChoreFormProps) {
  const [formData, setFormData] = useState<ChoreFormData>({
    title: "",
    icon: CHORE_ICONS[0],
    assigneeId: undefined,
    reward: "",
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { familyMembers } = useFamilyContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim()) {
      // Convert reward string to number if present, otherwise pass undefined
      const rewardValue =
        typeof formData.reward === "string" && formData.reward.trim()
          ? parseFloat(formData.reward)
          : undefined;

      onAdd(
        formData.title.trim(),
        formData.assigneeId || undefined,
        rewardValue,
        formData.icon
      );

      // Reset form and close modal
      setFormData({
        title: "",
        icon: CHORE_ICONS[0],
        assigneeId: undefined,
        reward: "",
      });
      setIsFormOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsFormOpen(true)}
        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-4 px-6 rounded-2xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-cartoon text-lg font-semibold flex items-center justify-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          style={{ width: "20px", height: "20px" }}
        >
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        New Chore
      </button>

      <ModalDialog
        ref={modalRef}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="New Chore"
      >
        <ChoreFormFields
          data={formData}
          onChange={setFormData}
          familyMembers={familyMembers}
          submitLabel="Add Chore"
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
        />
      </ModalDialog>
    </>
  );
}
