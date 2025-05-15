import { useCallback } from "react";
import DragContext from "../contexts/DragContext";
import type { Chore } from "../../../types";

function DragProvider({ children }: { children: React.ReactNode }) {
  // Handle drag start - native HTML5 drag and drop
  const handleDragStart = useCallback(
    (chore: Chore) => (e: React.DragEvent<HTMLElement>) => {
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
      e.dataTransfer.setData("chore", JSON.stringify(chore));
      e.dataTransfer.effectAllowed = "move";

      // Set marker and classes directly on DOM element
      e.currentTarget.setAttribute("data-dragging", "true");
      e.currentTarget.classList.add("dragging", "opacity-50");
    },
    []
  );

  // Handle native drag over
  const handleDragOver = useCallback((event: React.DragEvent) => {
    // Required to allow dropping
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Handle native drag end
  const handleDragEnd = useCallback(
    () => (e: React.DragEvent<HTMLElement>) => {
      // Remove marker and classes
      e.currentTarget.removeAttribute("data-dragging");
      e.currentTarget.classList.remove("dragging", "opacity-50");
    },
    []
  );

  return (
    <DragContext.Provider
      value={{
        onDragStart: handleDragStart,
        onDragOver: handleDragOver,
        onDragEnd: handleDragEnd,
      }}
    >
      {children}
    </DragContext.Provider>
  );
}

export default DragProvider;
