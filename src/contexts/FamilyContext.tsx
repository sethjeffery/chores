import { createContext } from "react";
import type { FamilyMember } from "../types";

// Define the context type
export interface FamilyContextType {
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
export const FamilyContext = createContext<FamilyContextType | undefined>(
  undefined
);
