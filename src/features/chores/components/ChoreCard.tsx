import type { Chore } from "../../../types";
import RewardBadge from "../../../shared/components/RewardBadge";
import { useChoreCardDrag } from "../hooks/useChoreCardDrag";
import { useTouchDevice } from "../hooks/useTouchDevice";
import { useEffect, useState, useMemo } from "react";

interface ChoreCardProps {
  chore: Chore;
  onDelete: (id: string) => void;
  onDragStart?: (choreId: string) => void;
  onDragEnd?: () => void;
  onAssign?: (choreId: string) => void;
  onComplete?: (choreId: string) => void;
  memberColor?: string | null;
}

export default function ChoreCard({
  chore,
  onDelete,
  onDragStart,
  onDragEnd,
  onAssign,
  onComplete,
  memberColor,
}: ChoreCardProps) {
  // Use our custom hook to detect touch devices
  const isTouchDevice = useTouchDevice();

  // Fallback state for touch detection
  const [forceShowButtons, setForceShowButtons] = useState(false);

  // Use our drag and drop hook
  const { dragHandlers } = useChoreCardDrag({
    chore,
    onDragStart,
    onDragEnd,
  });

  // Force buttons to show on mobile devices
  useEffect(() => {
    // Check for touch capability using multiple methods
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    if (isMobile) {
      setForceShowButtons(true);
    }

    // Also check screen width as a fallback
    const mobileMediaQuery = window.matchMedia("(max-width: 768px)");
    if (mobileMediaQuery.matches) {
      setForceShowButtons(true);
    }

    // Listen for resize events
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setForceShowButtons(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Get card styling based on column
  const getCardStyle = () => {
    // For IDEAS column or when no member color is provided
    if (chore.column === "IDEAS" || !memberColor) {
      switch (chore.column) {
        case "IDEAS":
          return "border-blue-400 hover:border-blue-500";
        case "TODO":
          return "border-amber-400 hover:border-amber-500";
        case "DONE":
          return "border-green-400 hover:border-green-500 opacity-85";
        default:
          return "border-gray-400";
      }
    }

    // Otherwise use the member's color for the border
    return "";
  };

  // Create style object for the border if we have a member color
  const borderStyle = useMemo(() => {
    if (memberColor && chore.column !== "IDEAS") {
      return { borderLeftColor: memberColor };
    }
    return {};
  }, [memberColor, chore.column]);

  return (
    <div
      {...dragHandlers}
      className={`p-4 rounded-xl shadow-md mb-2 border-l-4 transition-colors bg-white ${getCardStyle()} 
        hover:shadow-lg cursor-grab active:cursor-grabbing
      `}
      style={borderStyle}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-gray-800 flex items-center gap-2">
          {chore.icon && <span className="text-xl">{chore.icon}</span>}
          {chore.title}
        </h3>
        <button
          onClick={() => onDelete(chore.id)}
          className="text-red-500 hover:text-red-700 hover:bg-red-100 text-lg leading-none rounded-full w-6 h-6 flex items-center justify-center transition-colors"
          aria-label="Delete chore"
        >
          &times;
        </button>
      </div>

      {/* Display reward if it exists */}
      {chore.reward && (
        <div className="mt-2 text-xs">
          <RewardBadge reward={chore.reward} />
        </div>
      )}

      {/* Touch device action buttons */}
      {(isTouchDevice || forceShowButtons) &&
        (chore.column === "IDEAS" || chore.column === "TODO") && (
          <div className="mt-3 flex gap-2 touch-button-container">
            {chore.column === "IDEAS" && (
              <button
                onClick={() => onAssign?.(chore.id)}
                className="text-sm px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors touch-button"
              >
                Assign
              </button>
            )}

            {chore.column === "TODO" && (
              <>
                <button
                  onClick={() => onComplete?.(chore.id)}
                  className="text-sm px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors touch-button"
                >
                  Complete
                </button>
                <button
                  onClick={() => onAssign?.(chore.id)}
                  className="text-sm px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors touch-button"
                >
                  Change Assignee
                </button>
              </>
            )}
          </div>
        )}
    </div>
  );
}
