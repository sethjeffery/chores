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
  assignee: string | null; // UUID reference to family_members.id
  column: ColumnType;
  createdAt: string;
  reward: number | null; // null instead of undefined
  icon: string | null; // null instead of undefined
}
