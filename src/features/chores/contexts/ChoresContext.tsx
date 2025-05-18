import { createContext } from "react";
import type { Chore, ColumnType } from "../../../types";
import type { InsertChore } from "../services/choreService";

// Define the context type
export interface ChoresContextType {
  chores: Chore[];
  isLoading: boolean;
  backgroundSaving: boolean;
  error: string | null;
  syncStatus: "synced" | "syncing" | "offline";
  addChore: (chore: InsertChore) => Promise<Chore | null>;
  deleteChore: (id: string) => Promise<void>;
  moveChore: (id: string, column: ColumnType) => Promise<void>;
  reassignChore: (
    id: string,
    assigneeId: string,
    targetColumn?: ColumnType
  ) => Promise<void>;
}

// Create the context with a default undefined value
export const ChoresContext = createContext<ChoresContextType | undefined>(
  undefined
);
