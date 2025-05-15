import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useAccount } from "../../account/hooks/useAccount";
import AccountSwitcher from "../../account/components/AccountSwitcher";

interface UserMenuProps {
  onOpenFamilySettings: () => void;
  onOpenAccountSettings?: () => void;
}

export default function UserMenu({
  onOpenFamilySettings,
  onOpenAccountSettings,
}: UserMenuProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user's display name or email
  const displayName = user?.user_metadata?.full_name || user?.email || "User";

  // Get user's avatar or initials
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = displayName
    .split(" ")
    .map((name: string) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative z-40" ref={dropdownRef}>
      <div className="flex items-center">
        <AccountSwitcher />

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center text-white focus:outline-none ml-2"
        >
          <div className="flex items-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover mr-2 border-2 border-white"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-sm font-medium mr-2 border-2 border-white">
                {initials}
              </div>
            )}
            <span className="hidden md:inline font-medium">{displayName}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ml-1 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                onOpenFamilySettings();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
            >
              <span className="mr-2" role="img" aria-label="Family">
                👨‍👩‍👧‍👦
              </span>
              Family Settings
            </button>

            {isAdmin && onOpenAccountSettings && (
              <button
                onClick={() => {
                  onOpenAccountSettings();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
              >
                <span className="mr-2" role="img" aria-label="Account">
                  👥
                </span>
                Account Members
              </button>
            )}

            <button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
            >
              <span className="mr-2" role="img" aria-label="Sign out">
                🚪
              </span>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
