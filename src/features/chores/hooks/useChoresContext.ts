import { useContext } from "react";
import { ChoresContext } from "../contexts/ChoresContext";
import type { ChoresContextType } from "../contexts/ChoresContext";

// Custom hook to use the chores context
export function useChoresContext(): ChoresContextType {
  const context = useContext(ChoresContext);
  if (context === undefined) {
    throw new Error("useChoresContext must be used within a ChoresProvider");
  }
  return context;
}
