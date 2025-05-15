import type { ColumnType } from "../../../types";

// Column definitions
export const COLUMNS: { id: ColumnType; title: string; description: string }[] =
  [
    {
      id: "IDEAS",
      title: "Ideas",
      description: "Unassigned chores that need someone to do them",
    },
    {
      id: "TODO",
      title: "To Do",
      description: "Assigned chores that need to be completed",
    },
    {
      id: "DONE",
      title: "Done",
      description: "Completed chores",
    },
  ];
