import { XIcon } from "@phosphor-icons/react";
import { forwardRef, useRef, useEffect } from "react";
import type { ReactNode } from "react";

interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

const ModalDialog = forwardRef<HTMLDivElement, ModalDialogProps>(
  ({ isOpen, onClose, title, children, className = "" }, ref) => {
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const actualRef = (ref as React.RefObject<HTMLDivElement>) || dialogRef;

    // Add animation styles
    useEffect(() => {
      // Create a style element for the animation
      const styleEl = document.createElement("style");
      styleEl.innerHTML = `
        @keyframes dialogFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `;
      document.head.appendChild(styleEl);

      // Clean up
      return () => {
        if (document.head.contains(styleEl)) {
          document.head.removeChild(styleEl);
        }
      };
    }, []);

    // Prevent scrolling when modal is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
      return () => {
        document.body.style.overflow = "";
      };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div
          ref={actualRef}
          className={`bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto ${className}`}
          style={{ animation: "dialogFadeIn 0.2s ease-out" }}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-bold text-indigo-800 font-fancy">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-xl"
                aria-label="Close"
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
);

export default ModalDialog;
