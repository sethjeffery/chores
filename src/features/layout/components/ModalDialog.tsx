import type { PropsWithChildren } from "react";
import useEscapeKey from "../hooks/use-escape-key";
import { XIcon } from "@phosphor-icons/react";
interface ShareDialogProps extends PropsWithChildren {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export default function ModalDialog({
  children,
  isOpen,
  onClose,
  title,
}: ShareDialogProps) {
  useEscapeKey(onClose, { enabled: isOpen });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gradient-to-b from-[var(--gradient-start-transparent)] to-[var(--gradient-end-transparent)] z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        style={{ animation: "dialogFadeIn 0.2s ease-out" }}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-5 relative">
            <h2 className="text-2xl font-bold text-indigo-800 font-fancy">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800"
            >
              <XIcon className="h-5 w-5" weight="bold" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
