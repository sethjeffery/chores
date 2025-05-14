import { useState, useRef, useEffect } from "react";
import { useFamilyContext } from "../contexts/FamilyContext";
import type { FamilyMember, ColumnType } from "../types";
import ModalDialog from "./ModalDialog";

interface AssigneeDialogProps {
  onAssign: (
    choreId: string,
    assigneeId: string, // UUID reference to family_members.id
    targetColumn?: ColumnType
  ) => void;
}

export default function AssigneeDialog({ onAssign }: AssigneeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [choreId, setChoreId] = useState("");
  const [targetColumn, setTargetColumn] = useState<ColumnType | undefined>(
    undefined
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const { familyMembers, loading } = useFamilyContext();

  // Debug family members
  useEffect(() => {
    console.log("AssigneeDialog familyMembers updated:", familyMembers);
  }, [familyMembers]);

  // Set up the dialog element for direct DOM manipulation
  // This allows other components to call .showModal() directly
  useEffect(() => {
    const dialog = document.getElementById("assignee-dialog");
    if (dialog) {
      const originalShowModal = dialog.getAttribute("data-has-listener")
        ? null
        : HTMLDialogElement.prototype.showModal;

      if (originalShowModal) {
        dialog.setAttribute("data-has-listener", "true");

        // Override the showModal method
        HTMLDialogElement.prototype.showModal = function (
          this: HTMLDialogElement
        ) {
          const choreIdAttr = this.getAttribute("data-chore-id");
          const columnAttr = this.getAttribute("data-target-column");

          if (this.id === "assignee-dialog" && choreIdAttr) {
            setChoreId(choreIdAttr);
            setTargetColumn(columnAttr as ColumnType | undefined);
            setIsOpen(true);
            return;
          }
          return originalShowModal.call(this);
        };
      }
    }

    // Clean up the override when component unmounts
    return () => {
      if (dialog && dialog.getAttribute("data-has-listener") === "true") {
        dialog.removeAttribute("data-has-listener");
      }
    };
  }, []);

  const handleAssign = (member: FamilyMember) => {
    if (choreId) {
      onAssign(choreId, member.id, targetColumn);
      setIsOpen(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <>
      {/* Hidden dialog element for backwards compatibility */}
      <dialog id="assignee-dialog" style={{ display: "none" }}></dialog>

      <ModalDialog
        ref={dialogRef}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Assign Chore"
      >
        <p className="mb-4 text-gray-600">Who should complete this chore?</p>

        <div className="grid gap-3 mb-6">
          {familyMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => handleAssign(member)}
              className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg transition-colors text-left font-medium flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {member.avatar && <span>{member.avatar}</span>}
                <span>{member.name}</span>
              </span>
              <span className="text-blue-500">→</span>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </ModalDialog>
    </>
  );
}
