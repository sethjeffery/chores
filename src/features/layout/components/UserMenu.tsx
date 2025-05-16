import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useAccount } from "../../account/hooks/useAccount";
import {
  BabyIcon,
  CaretDownIcon,
  SignOutIcon,
  UserIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";

interface UserMenuProps {
  onOpenFamilySettings: () => void;
  onOpenAccountSettings?: () => void;
  onOpenShareSettings?: () => void;
}

export default function UserMenu({
  onOpenFamilySettings,
  onOpenAccountSettings,
  onOpenShareSettings,
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
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center text-white focus:outline-none"
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
            <CaretDownIcon
              className={`h-3 w-3 ml-1 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
              weight="bold"
            />
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-3 border-b bg-gray-100 cursor-default">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <div className="py-1">
            {isAdmin && onOpenAccountSettings && (
              <button
                onClick={() => {
                  onOpenAccountSettings();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
              >
                <UserIcon
                  className="h-6 w-6 mr-3 text-cyan-800"
                  weight="duotone"
                />
                <div className="flex flex-col">
                  <div className="text-md">Account Settings</div>
                  <div className="text-xs text-gray-400">
                    Manage your account and login details
                  </div>
                </div>
              </button>
            )}

            <button
              onClick={() => {
                onOpenFamilySettings();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
            >
              <UsersThreeIcon
                className="h-6 w-6 mr-3 text-orange-700"
                weight="duotone"
              />
              <div className="flex flex-col">
                <div className="text-md">Family Settings</div>
                <div className="text-xs text-gray-400">
                  Add your family members
                </div>
              </div>
            </button>

            {isAdmin && onOpenShareSettings && (
              <button
                onClick={() => {
                  onOpenShareSettings();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
              >
                <BabyIcon
                  className="h-6 w-6 mr-3 text-indigo-700"
                  weight="duotone"
                />
                <div className="flex flex-col">
                  <div className="text-md">Child-friendly Mode</div>
                  <div className="text-xs text-gray-400">
                    Share tasks with your family
                  </div>
                </div>
              </button>
            )}

            <hr className="my-1" />
            <button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center"
            >
              <SignOutIcon className="h-6 w-6 mr-3" />
              <div className="flex flex-col">
                <div className="text-md">Sign out</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
