import { useContext } from "react";
import { FamilyContext } from "../contexts/FamilyContext";
import type { FamilyContextType } from "../contexts/FamilyContext";

// Custom hook to use the family context
export function useFamilyContext(): FamilyContextType {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error("useFamilyContext must be used within a FamilyProvider");
  }
  return context;
}
