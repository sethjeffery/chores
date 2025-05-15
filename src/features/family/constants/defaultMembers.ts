import type { FamilyMember } from "../../../types";

// Default family members to use as fallback when data loading fails
export const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: "default-1",
    name: "Dad",
    avatar: "👨",
    color: "#4f46e5",
    dob: "1980-06-15",
  },
  {
    id: "default-2",
    name: "Mum",
    avatar: "👩",
    color: "#d946ef",
    dob: "1982-03-22",
  },
  {
    id: "default-3",
    name: "Faith",
    avatar: "👧",
    color: "#ec4899",
    dob: "2010-11-05",
  },
  {
    id: "default-4",
    name: "Harmony",
    avatar: "👧",
    color: "#8b5cf6",
    dob: "2012-07-30",
  },
  {
    id: "default-5",
    name: "Isaac",
    avatar: "👦",
    color: "#3b82f6",
    dob: "2014-09-18",
  },
];
