import type { ReactNode } from "react";
import { useFamilyMembers } from "../store";
import { FamilyContext } from "../contexts/FamilyContext";

// Provider component that wraps parts of the app that need family data
export function FamilyProvider({ children }: { children: ReactNode }) {
  const familyState = useFamilyMembers();

  return (
    <FamilyContext.Provider value={familyState}>
      {children}
    </FamilyContext.Provider>
  );
}
