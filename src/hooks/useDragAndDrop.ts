import { useRef } from "react";
import { useDraggable } from "./useDraggable";
import type { Chore } from "../types";

interface DragAndDropOptions {
  // The chore being dragged
  chore: Chore;
  // Callback when drag starts
  onDragStart?: (choreId: string) => void;
  // Callback when drag ends
  onDragEnd?: () => void;
}

interface DragAndDropHandlers {
  // Props to spread on the draggable element
  dragHandlers: {
    draggable: "true";
    ref: React.RefObject<HTMLDivElement | null>;
    "data-chore-id": string;
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  };
  // Whether the item is currently being dragged
  isDragging: boolean;
}

/**
 * Hook that combines mouse drag and touch drag for a complete drag and drop solution
 */
export function useDragAndDrop({
  chore,
  onDragStart,
  onDragEnd,
}: DragAndDropOptions): DragAndDropHandlers {
  // Reference to the draggable element
  const elementRef = useRef<HTMLDivElement>(null);

  // Setup mouse-based drag and drop
  const {
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    isDragging: isDraggingMouse,
  } = useDraggable({
    itemId: chore.id,
    data: {
      choreId: chore.id,
      title: chore.title,
      column: chore.column,
    },
    onDragStart,
    onDragEnd,
  });

  // Combined drag state
  const isDragging = isDraggingMouse;

  // Return handlers and state
  return {
    dragHandlers: {
      draggable: "true",
      ref: elementRef,
      "data-chore-id": chore.id,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    },
    isDragging,
  };
}
