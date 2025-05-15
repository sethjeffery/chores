import { createContext } from "react";
import type { Chore, ColumnType } from "../../../types";

// Define the context type
export interface ChoresContextType {
  chores: Chore[];
  isLoading: boolean;
  backgroundSaving: boolean;
  error: string | null;
  syncStatus: "synced" | "syncing" | "offline";
  addChore: (
    title: string,
    assigneeId?: string,
    reward?: number,
    icon?: string,
    column?: ColumnType
  ) => Promise<string | null>;
  updateChore: (id: string, updates: Partial<Chore>) => Promise<void>;
  deleteChore: (id: string) => Promise<void>;
  moveChore: (id: string, column: ColumnType) => Promise<void>;
  reassignChore: (
    id: string,
    assigneeId: string | null,
    targetColumn?: ColumnType
  ) => Promise<void>;
}

// Create the context with a default undefined value
export const ChoresContext = createContext<ChoresContextType | undefined>(
  undefined
);
