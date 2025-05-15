import { useState, useRef } from "react";
import { useFamilyContext } from "../../family/hooks/useFamilyContext";
import { CHORE_ICONS } from "../constants/icons";
import ModalDialog from "../../../shared/components/ModalDialog";
import EmojiPicker from "../../../shared/components/EmojiPicker";

interface ChoreFormProps {
  onAdd: (
    title: string,
    assigneeId?: string, // UUID reference to family_members.id
    reward?: number,
    icon?: string
  ) => void;
}

// Define chore icon categories
const choreIconCategories = [
  {
    name: "Favorites",
    emojis: [
      "🧹", // broom
      "🧼", // soap
      "🧽", // sponge
      "🍽️", // plate with utensils
      "👕", // t-shirt
      "💻", // laptop
      "📚", // books
      "🧺", // basket
      "🧷", // safety pin
      "🧴", // lotion
      "🚿", // shower
      "🛁", // bathtub
      "🛒", // shopping cart
      "🧩", // puzzle
      "🧦", // socks
      "🔧", // wrench
      "🥄", // spoon
      "📝", // memo
      "⚽", // soccer ball
      "🎵", // music note
    ],
  },
  { name: "Cleaning", start: 0, end: 19 },
  { name: "Household", start: 20, end: 39 },
  { name: "Kitchen", start: 40, end: 59 },
  { name: "Clothes", start: 60, end: 79 },
  { name: "Electronics", start: 80, end: 99 },
  { name: "Education", start: 100, end: 119 },
  { name: "Nature", start: 120, end: 139 },
  { name: "Animals", start: 140, end: 159 },
  { name: "Toys", start: 160, end: 179 },
  { name: "Sports", start: 180, end: 199 },
  { name: "Misc", start: 200, end: 219 },
];

export default function ChoreForm({ onAdd }: ChoreFormProps) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [reward, setReward] = useState<string>("");
  const [icon, setIcon] = useState<string>(CHORE_ICONS[0]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { familyMembers, isLoading } = useFamilyContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      // Convert reward string to number if present, otherwise pass undefined
      const rewardValue = reward.trim() ? parseFloat(reward) : undefined;
      onAdd(title.trim(), assigneeId || undefined, rewardValue, icon);
      setTitle("");
      setReward("");
      setAssigneeId(null);
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
        <form onSubmit={handleSubmit}>
          {/* Use the new EmojiPicker component */}
          <EmojiPicker
            value={icon}
            onChange={setIcon}
            emojiSource={CHORE_ICONS}
            categories={choreIconCategories}
            label="Choose an Icon"
            id="chore-icon"
          />

          <div className="mb-5">
            <label
              htmlFor="chore-title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Chore Description
            </label>
            <div className="flex relative">
              <div
                className={`absolute inset-y-0 left-0 flex items-center justify-center w-12 bg-gray-100 border ${
                  isInputFocused
                    ? "border-indigo-500 ring-2 ring-indigo-500"
                    : "border-gray-300"
                } border-r-0 rounded-l-xl transition-colors`}
              >
                {icon}
              </div>
              <input
                ref={inputRef}
                id="chore-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                className="w-full pl-16 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm"
                placeholder="Enter chore description"
                required
              />
            </div>
          </div>

          <div className="mb-5">
            <label
              htmlFor="chore-assignee"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Assign to Family Member{" "}
              <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <select
              id="chore-assignee"
              value={assigneeId || ""}
              onChange={(e) => {
                const value = e.target.value;
                setAssigneeId(value || null);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-colors shadow-sm appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
              }}
            >
              <option value="">No Assignee (Idea)</option>
              {!isLoading &&
                familyMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.avatar && `${member.avatar} `}
                    {member.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="mb-6">
            <label
              htmlFor="chore-reward"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Reward (£){" "}
              <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <span className="text-gray-500">£</span>
              </div>
              <input
                id="chore-reward"
                type="number"
                step="0.01"
                min="0"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                className="w-full pl-8 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-cartoon font-medium"
            >
              Add Chore
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
    </>
  );
}
