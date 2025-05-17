import { useCallback, useContext, useRef } from "react";
import type { Chore } from "../../../types";
import DragContext from "../contexts/DragContext";

interface ChoreCardDragOptions {
  // The chore being dragged
  chore: Chore;
  // Callback when drag starts
  onDragStart?: (choreId: string) => void;
  // Callback when drag ends
  onDragEnd?: (choreId: string) => void;
}

interface ChoreCardDragHandlers {
  dragHandlers: {
    ref: React.RefObject<HTMLDivElement | null>;
    "data-chore-id": string;
  } & Pick<
    React.HTMLAttributes<HTMLDivElement>,
    "draggable" | "onDragStart" | "onDragEnd"
  >;
}

/**
 * Hook specifically designed for ChoreCard component to handle drag operations
 * Provides the necessary handlers and state for dragging chore cards
 */
export function useChoreCardDrag({
  chore,
  onDragStart,
  onDragEnd,
}: ChoreCardDragOptions): ChoreCardDragHandlers {
  // Reference to the draggable element
  const elementRef = useRef<HTMLDivElement>(null);

  const { onDragStart: handleDragStart, onDragEnd: handleDragEnd } =
    useContext(DragContext);

  // Return handlers and state
  return {
    dragHandlers: {
      draggable: handleDragStart ? "true" : undefined,
      ref: elementRef,
      "data-chore-id": chore.id,
      onDragStart: useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
          handleDragStart?.(chore)(e);
          onDragStart?.(chore.id);
        },
        [handleDragStart, chore, onDragStart]
      ),
      onDragEnd: useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
          handleDragEnd?.(chore)(e);
          onDragEnd?.(chore.id);
        },
        [handleDragEnd, chore, onDragEnd]
      ),
    },
  };
}
