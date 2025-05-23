import { useState, useRef, useEffect } from "react";
import { useFamilyContext } from "../hooks/useFamilyContext";
import ModalDialog from "../../../shared/components/ModalDialog";
import type { FamilyMember } from "../../../types";
import { AVATARS, COLORS } from "../constants/avatars";
import { useAccount } from "../../account/hooks/useAccount";
import {
  CheckIcon,
  PencilLineIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import AvatarPicker from "./AvatarPicker";

interface FamilyMemberFormProps {
  onAddMember?: (
    name: string,
    avatar: string,
    color: string,
    dob: string
  ) => void;
  isInModal?: boolean;
}

export default function FamilyMemberForm({
  onAddMember,
  isInModal = true,
}: FamilyMemberFormProps) {
  const {
    familyMembers,
    isLoading,
    deleteFamilyMember,
    updateFamilyMember,
    addFamilyMember,
  } = useFamilyContext();

  const { activeAccount } = useAccount();
  const accountId = activeAccount?.id || "";

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(
    null
  );

  // Form state
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("avatar01");
  const [color, setColor] = useState(COLORS[0]);
  const [dob, setDob] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const confirmModalRef = useRef<HTMLDivElement>(null);

  // Reset form when closing
  useEffect(() => {
    if (!isFormOpen) {
      if (!editMode) {
        setName("");
        setAvatar("avatar01");
        setColor(COLORS[0]);
        setDob("");
      }
    }
  }, [isFormOpen, editMode]);

  // Set form values when editing
  useEffect(() => {
    if (selectedMember && editMode) {
      setName(selectedMember.name);
      setAvatar(selectedMember.avatar || "avatar01");
      setColor(selectedMember.color || COLORS[0]);
      setDob(selectedMember.dob || "");
    }
  }, [selectedMember, editMode]);

  const handleOpenAddForm = () => {
    setEditMode(false);
    setSelectedMember(null);
    setName("");
    // Set a random avatar as default when adding a new family member
    const randomIndex = Math.floor(Math.random() * 24);
    const randomAvatar = `avatar${String(randomIndex + 1).padStart(2, "0")}`;
    setAvatar(randomAvatar);
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    setDob("");
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (member: FamilyMember) => {
    setEditMode(true);
    setSelectedMember(member);
    setName(member.name);
    setAvatar(member.avatar || "avatar01");
    setColor(member.color || COLORS[0]);
    setDob(member.dob || "");
    setIsFormOpen(true);
  };

  const handleDeleteMember = (member: FamilyMember) => {
    setSelectedMember(member);
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedMember) {
      try {
        await deleteFamilyMember(selectedMember.id);
        setIsConfirmDeleteOpen(false);
        setSelectedMember(null);
      } catch (err) {
        console.error("Failed to delete family member:", err);
        alert("Failed to delete family member. Please try again.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim() && dob && accountId) {
      if (editMode && selectedMember) {
        // Update existing member
        try {
          await updateFamilyMember(selectedMember.id, {
            name: name.trim(),
            avatar,
            color,
            dob,
          });
          setIsFormOpen(false);
        } catch (err) {
          console.error("Failed to update family member:", err);
          alert("Failed to update family member. Please try again.");
        }
      } else {
        // Add new member
        try {
          const memberId = await addFamilyMember(
            name.trim(),
            avatar,
            color,
            dob
          );

          // Call the optional callback if provided
          if (onAddMember && memberId) {
            onAddMember(name.trim(), avatar, color, dob);
          }

          setIsFormOpen(false);
        } catch (err) {
          console.error("Failed to add family member:", err);
          alert("Failed to add family member. Please try again.");
        }
      }
    }
  };

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

  return (
    <div className={`family-members ${isInModal ? "" : "mb-8"}`}>
      <div className="flex justify-between items-center mb-4">
        {!isInModal && (
          <h2 className="text-xl font-bold text-gray-800">Family Members</h2>
        )}
        <button
          onClick={handleOpenAddForm}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center"
        >
          <PlusIcon className="h-4 w-4 mr-1" weight="bold" />
          Add Member
        </button>
      </div>

      {/* List of family members */}
      <div>
        {isLoading && !familyMembers?.length ? (
          <div className="p-4 text-center text-gray-500">
            Loading family members...
          </div>
        ) : familyMembers.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {familyMembers.map((member) => (
              <li
                key={member.id}
                className="p-4 border-l-4 bg-white rounded-xl shadow-md overflow-hidden border"
                style={{ borderLeftColor: member.color ?? undefined }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {member.avatar && member.avatar in AVATARS ? (
                      <img
                        src={AVATARS[member.avatar as keyof typeof AVATARS]}
                        alt={member.name}
                        className="w-16 h-16 object-cover"
                      />
                    ) : null}
                    <div>
                      <h3 className="font-medium text-gray-800 text-xl">
                        {member.name}
                      </h3>
                      {calculateAge(member.dob) !== null && (
                        <p className="text-xs text-gray-600">
                          {calculateAge(member.dob)} years old
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOpenEditForm(member)}
                      className="text-indigo-500 hover:text-indigo-700"
                      aria-label={`Edit ${member.name}`}
                    >
                      <PencilLineIcon className="h-5 w-5" weight="fill" />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member)}
                      className="text-red-500 hover:text-red-700"
                      aria-label={`Delete ${member.name}`}
                    >
                      <TrashIcon className="h-5 w-5" weight="fill" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 text-center text-gray-500">
            No family members added yet.
          </div>
        )}
      </div>

      {/* Add/Edit Family Member Form */}
      <ModalDialog
        ref={modalRef}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editMode ? "Edit Family Member" : "New Family Member"}
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label
              htmlFor="member-name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Name
            </label>
            <input
              id="member-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm"
              placeholder="Enter family member's name"
              required
            />
          </div>

          <AvatarPicker
            value={avatar}
            onChange={setAvatar}
            label="Avatar"
            id="member-avatar"
          />

          <div className="mb-5">
            <label
              htmlFor="member-color"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Color
            </label>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {COLORS.map((colorOption) => (
                <button
                  type="button"
                  key={colorOption}
                  onClick={() => setColor(colorOption)}
                  className={`h-10 rounded-lg transition-all border-2 ${
                    color === colorOption
                      ? "shadow-inner border-indigo-500"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: colorOption }}
                >
                  {color === colorOption && (
                    <CheckIcon
                      className="h-6 w-6 mx-auto text-white"
                      weight="bold"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label
              htmlFor="member-dob"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Date of Birth
            </label>
            <input
              id="member-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm"
              placeholder="YYYY-MM-DD"
              required
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md hover:shadow-lg font-medium"
            >
              {editMode ? "Update" : "Add Member"}
            </button>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors text-gray-700 hover:border-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Confirm Delete Dialog */}
      <ModalDialog
        ref={confirmModalRef}
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        title="Confirm Delete"
      >
        <div className="mb-6">
          <p className="text-gray-700">
            Are you sure you want to delete{" "}
            <strong>{selectedMember?.name}</strong> from your family members?
          </p>
          <p className="mt-2 text-gray-500 text-sm">
            This will also remove any assignments and completed chores for this
            family member.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleConfirmDelete}
            className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl hover:bg-red-700 transition-all shadow-md hover:shadow-lg font-medium"
          >
            Delete
          </button>
          <button
            onClick={() => setIsConfirmDeleteOpen(false)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors text-gray-700 hover:border-gray-400"
          >
            Cancel
          </button>
        </div>
      </ModalDialog>
    </div>
  );
}
