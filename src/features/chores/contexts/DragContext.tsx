import { createContext } from "react";
import type { Chore } from "../types";

// Create a context to track the drag state
interface DragContextType {
  // Native drag event handlers
  onDragStart?: (chore: Chore) => (event: React.DragEvent<HTMLElement>) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDragEnd?: (chore: Chore) => (event: React.DragEvent<HTMLElement>) => void;
}

const DragContext = createContext<DragContextType>({});

export default DragContext;
