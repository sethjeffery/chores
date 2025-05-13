import { createContext } from "react";

// Create a context to track the drag state
interface DragContextType {
  // Native drag event handlers
  onDragStart?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
}

const DragContext = createContext<DragContextType>({});

export default DragContext;
