import React, { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useFamilyMembers } from "../store";
import type { FamilyMember } from "../types";

// Define the context type
interface FamilyContextType {
  familyMembers: FamilyMember[];
  loading: boolean;
  error: string | null;
  addFamilyMember: (
    name: string,
    avatar?: string,
    color?: string,
    dob?: string
  ) => Promise<string | null>;
  updateFamilyMember: (
    id: string,
    updates: Partial<FamilyMember>
  ) => Promise<void>;
  deleteFamilyMember: (id: string) => Promise<void>;
  getFamilyMemberById: (id: string | null) => FamilyMember | null;
  getFamilyMemberByName: (name: string) => FamilyMember | null;
}

// Create the context with a default value
const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

// Provider component that wraps parts of the app that need family data
export function FamilyProvider({ children }: { children: ReactNode }) {
  const familyState = useFamilyMembers();

  return (
    <FamilyContext.Provider value={familyState}>
      {children}
    </FamilyContext.Provider>
  );
}

// Custom hook to use the family context
export function useFamilyContext() {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error("useFamilyContext must be used within a FamilyProvider");
  }
  return context;
}
