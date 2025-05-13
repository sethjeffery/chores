import { useCallback, useState, useEffect } from "react";

interface DraggableOptions {
  // Custom data to be transferred during drag
  itemId: string;
  // Additional data to store in the dataTransfer object
  data?: Record<string, string>;
  // Callbacks for drag events
  onDragStart?: (itemId: string) => void;
  onDragEnd?: () => void;
}

interface DraggableHandlers {
  // Event handlers for HTML5 drag and drop
  onDragStart: <T extends HTMLElement = HTMLElement>(
    e: React.DragEvent<T>
  ) => void;
  onDragEnd: <T extends HTMLElement = HTMLElement>(
    e: React.DragEvent<T>
  ) => void;

  // State
  isDragging: boolean;
}

// Global store for drag data on touch devices
const touchDragData = {
  currentDragId: null as string | null,
  setDragData: (key: string, value: string) => {
    if (!window.touchDragStore) {
      window.touchDragStore = new Map();
    }
    window.touchDragStore.set(key, value);
  },
  getDragData: (key: string): string | null => {
    if (!window.touchDragStore) {
      return null;
    }
    return window.touchDragStore.get(key) || null;
  },
  clearDragData: () => {
    if (window.touchDragStore) {
      window.touchDragStore.clear();
    }
    touchDragData.currentDragId = null;
  },
};

// Add touch store to window for cross-component communication
declare global {
  interface Window {
    touchDragStore?: Map<string, string>;
  }
}

/**
 * Custom hook that provides drag and drop functionality for a draggable element.
 * Supports both mouse and touch events.
 */
export function useDraggable({
  itemId,
  data = {},
  onDragStart,
  onDragEnd,
}: DraggableOptions): DraggableHandlers {
  const [isDragging, setIsDragging] = useState(false);

  // Handle drag start - native HTML5 drag and drop
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      // Set the drag image
      try {
        const el = e.currentTarget;
        const dragImage = el.cloneNode(true) as HTMLElement;
        document.body.appendChild(dragImage);

        // Apply CSS class to the drag image
        dragImage.classList.add("drag-image");
        dragImage.style.width = `${el.offsetWidth}px`;
        dragImage.style.top = "-1000px"; // Position off-screen while measuring

        // Set the drag image
        e.dataTransfer.setDragImage(dragImage, 20, 20);

        // Remove the temporary element
        setTimeout(() => {
          if (document.body.contains(dragImage)) {
            document.body.removeChild(dragImage);
          }
        }, 0);
      } catch (e) {
        console.warn("Error setting drag image", e);
      }

      // Store main item ID
      e.dataTransfer.setData("itemId", itemId);
      e.dataTransfer.effectAllowed = "move";

      // Store any additional data
      Object.entries(data).forEach(([key, value]) => {
        e.dataTransfer.setData(key, value);

        // Also store in touch drag data for cross-browser compatibility
        touchDragData.setDragData(key, value);
      });

      // Set current drag ID in touch store
      touchDragData.currentDragId = itemId;
      touchDragData.setDragData("itemId", itemId);

      // Set marker and classes directly on DOM element
      e.currentTarget.setAttribute("data-dragging", "true");
      e.currentTarget.classList.add("dragging", "opacity-50");

      // Add a global class to the body to track drag state
      document.body.classList.add("dragging-active");

      // Update dragging state
      setIsDragging(true);

      // Call custom drag start handler
      if (onDragStart) {
        onDragStart(itemId);
      }
    },
    [itemId, data, onDragStart]
  );

  // Handle drag end - native HTML5 drag and drop
  const handleDragEnd = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      // Remove marker and classes
      e.currentTarget.removeAttribute("data-dragging");
      e.currentTarget.classList.remove("dragging", "opacity-50");

      // Remove global class
      document.body.classList.remove("dragging-active");

      // Reset state
      setIsDragging(false);

      // Clear touch drag data
      touchDragData.clearDragData();

      // Call custom drag end handler
      if (onDragEnd) {
        onDragEnd();
      }
    },
    [onDragEnd]
  );

  // Clean up any stray drag state when component unmounts
  useEffect(() => {
    return () => {
      if (isDragging) {
        document.body.classList.remove("dragging-active");
        touchDragData.clearDragData();
      }
    };
  }, [isDragging]);

  return {
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    isDragging,
  };
}

// Utility functions for touch-based drag and drop
export const touchDragUtils = {
  getCurrentDragId: () => touchDragData.currentDragId,
  getDragData: touchDragData.getDragData,
  clearDragData: touchDragData.clearDragData,
};
