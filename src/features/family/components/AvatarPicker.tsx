import { AVATARS } from "../constants/avatars";

interface AvatarPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
}

// Format avatar path to proper format
const formatAvatarPath = (index: number) =>
  `avatar${String(index + 1).padStart(2, "0")}`;

// Get current avatar index from path (for selections)
const getAvatarIndex = (path: string): number =>
  Object.keys(AVATARS).indexOf(path);

export default function AvatarPicker({
  value,
  onChange,
  label = "Avatar",
  id = "avatar-picker",
}: AvatarPickerProps) {
  // Handle avatar selection
  const handleSelectAvatar = (index: number) => {
    onChange(formatAvatarPath(index));
  };

  return (
    <div className="mb-5">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>
      )}

      <div className="overflow-x-auto -mx-6 scrollbar-hide px-6">
        <div className="flex flex-wrap">
          {Array.from({
            length: 24,
          }).map((_, avatarIndex) => {
            const avatarPath =
              AVATARS[formatAvatarPath(avatarIndex) as keyof typeof AVATARS];
            const isSelected = getAvatarIndex(value) === avatarIndex;

            return (
              <button
                key={avatarPath}
                type="button"
                onClick={() => handleSelectAvatar(avatarIndex)}
                className={`h-auto w-[12.5%] rounded-lg overflow-hidden transition-all relative border-2 ${
                  isSelected
                    ? "border-indigo-500 shadow-md bg-indigo-100"
                    : "border-transparent hover:border-gray-300"
                }`}
              >
                <img
                  src={avatarPath}
                  alt={`Avatar ${avatarIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
