import type { ReactNode } from "react";

// Simple provider component for DnD context
interface DndProviderProps {
  children: ReactNode;
}

export default function CustomDndProvider({ children }: DndProviderProps) {
  return <>{children}</>;
}
