// Previously was a string union, now an object type for database storage
export interface FamilyMember {
  id: string;
  name: string;
  avatar: string | null;
  color: string | null;
  dob: string | null; // Format: YYYY-MM-DD
}

export type ColumnType = "IDEAS" | "TODO" | "DONE";

/**
 * Chore interface with Firebase-compatible null types
 *
 * For Firebase compatibility, we use null instead of undefined for optional fields
 * This matches Firestore's data model which doesn't support undefined values
 */
export interface Chore {
  id: string;
  title: string;
  createdAt: string;
  reward: number | null; // null instead of undefined
  icon: string | null; // null instead of undefined
  status?: ChoreStatus; // Status is now a separate entity, but we'll include it for convenience
}

/**
 * ChoreStatus represents the completion status of a chore
 * This is stored in a separate table to allow different permissions
 */
export interface ChoreStatus {
  choreId: string;
  status: ColumnType; // The actual status value (e.g., "IN_PROGRESS", "COMPLETED")
  assignee: string | null; // UUID reference to family_members.id who completed the chore
  lastUpdatedAt: string;
}
