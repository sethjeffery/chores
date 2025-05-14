import { useState, useEffect, useCallback, useRef } from "react";
import type { Chore, FamilyMember, ColumnType } from "./types";
import * as choreService from "./services/choreService";
import * as familyService from "./services/familyService";
import type { ChoreTable } from "./supabase";
import { supabase, CHORES_TABLE, toChore } from "./supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

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

// Custom hook to manage family members from the database
export const useFamilyMembers = () => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const localChangesRef = useRef(new Set<string>());

  // Load family members from Supabase
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      try {
        setLoading(true);
        // Get family members ordered by date of birth (oldest first)
        const fetchedMembers = await familyService.getFamilyMembers();
        setFamilyMembers(fetchedMembers);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch family members:", err);
        setError("Failed to load family members. Using default values.");
        // Set some default members as fallback
        setFamilyMembers([
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
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyMembers();
  }, []);

  // Set up real-time subscription to Supabase for family members
  useEffect(() => {
    // Subscribe to all changes on the family_members table
    const channel = supabase
      .channel("family-members-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: familyService.FAMILY_MEMBERS_TABLE,
        },
        (
          payload: RealtimePostgresChangesPayload<familyService.FamilyMemberRecord>
        ) => {
          console.log("Realtime family member change received:", payload);

          const { eventType } = payload;
          const newRecord = payload.new as familyService.FamilyMemberRecord;
          const oldRecord =
            payload.old as Partial<familyService.FamilyMemberRecord>;

          // Get ID safely from the payload
          const changeId = newRecord?.id || oldRecord?.id;

          // Skip if this change originated from this client or if we can't determine the ID
          if (!changeId || localChangesRef.current.has(changeId)) {
            // Remove from tracking after processing
            if (changeId) {
              localChangesRef.current.delete(changeId);
            }
            return;
          }

          // Handle based on event type
          if (eventType === "INSERT" && newRecord) {
            console.log("Adding new family member from realtime:", newRecord);
            setFamilyMembers((prev) => [
              ...prev,
              familyService.toFamilyMember(newRecord),
            ]);
          } else if (eventType === "UPDATE" && newRecord) {
            console.log("Updating family member from realtime:", newRecord);
            setFamilyMembers((prev) => {
              console.log("Previous state:", prev);
              return prev.map((member) =>
                member.id === newRecord.id
                  ? familyService.toFamilyMember(newRecord)
                  : member
              );
            });
          } else if (eventType === "DELETE" && oldRecord?.id) {
            console.log("Deleting family member from realtime:", oldRecord?.id);
            setFamilyMembers((prev) =>
              prev.filter((member) => member.id !== oldRecord.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log("Family members subscription status:", status);
      });

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Add a new family member
  const addFamilyMember = useCallback(
    async (name: string, avatar?: string, color?: string, dob?: string) => {
      try {
        // Generate a temporary local ID
        const tempId = `temp-${Date.now()}`;

        // Add to local state immediately (optimistically)
        const newMember: FamilyMember = {
          id: tempId,
          name,
          avatar: avatar || null,
          color: color || null,
          dob: dob || null,
        };

        setFamilyMembers((prev) => [...prev, newMember]);

        // Call the service to persist
        const permanentId = await familyService.addFamilyMember(
          name,
          avatar,
          color,
          dob
        );

        // Add to local changes ref to avoid duplicate updates from realtime
        localChangesRef.current.add(permanentId);

        // Update the temporary ID with the permanent one
        setFamilyMembers((prev) =>
          prev.map((member) =>
            member.id === tempId ? { ...member, id: permanentId } : member
          )
        );

        return permanentId;
      } catch (err) {
        console.error("Failed to add family member:", err);
        setError("Failed to add family member. Please try again.");
        return null;
      }
    },
    []
  );

  // Update a family member
  const updateFamilyMember = useCallback(
    async (id: string, updates: Partial<FamilyMember>) => {
      try {
        console.log("Updating family member:", id, updates);

        // Update locally first (optimistically)
        setFamilyMembers((prev) =>
          prev.map((member) =>
            member.id === id ? { ...member, ...updates } : member
          )
        );

        // Add to local changes ref to avoid duplicate updates from realtime
        localChangesRef.current.add(id);

        // Then update in the background
        await familyService.updateFamilyMember(id, updates);
      } catch (err) {
        console.error("Failed to update family member:", err);
        setError("Failed to update family member. Please try again.");
      }
    },
    []
  );

  // Delete a family member
  const deleteFamilyMember = useCallback(async (id: string) => {
    try {
      // Remove from local state first (optimistically)
      setFamilyMembers((prev) => prev.filter((member) => member.id !== id));

      // Add to local changes ref to avoid duplicate updates from realtime
      localChangesRef.current.add(id);

      // Then delete from the database
      await familyService.deleteFamilyMember(id);
    } catch (err) {
      console.error("Failed to delete family member:", err);
      setError("Failed to delete family member. Please try again.");
    }
  }, []);

  // Find a family member by ID
  const getFamilyMemberById = useCallback(
    (id: string | null) => {
      if (!id) return null;
      return familyMembers.find((member) => member.id === id) || null;
    },
    [familyMembers]
  );

  // Find a family member by name
  const getFamilyMemberByName = useCallback(
    (name: string) => {
      return familyMembers.find((member) => member.name === name) || null;
    },
    [familyMembers]
  );

  return {
    familyMembers,
    loading,
    error,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
    getFamilyMemberById,
    getFamilyMemberByName,
  };
};

// Custom hook to manage chores with Supabase
export const useChores = () => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundSaving, setBackgroundSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    "synced" | "syncing" | "offline"
  >("synced");

  // Ref to track local changes to prevent duplicate updates
  const localChangesRef = useRef(new Set<string>());

  // Only show loading state on initial fetch, not during updates
  const loading = initialLoading;

  // Set up real-time subscription to Supabase
  useEffect(() => {
    // Subscribe to all changes on the chores table
    const channel = supabase
      .channel("chores-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: CHORES_TABLE,
        },
        (payload: RealtimePostgresChangesPayload<ChoreTable>) => {
          console.log("Realtime change received:", payload);

          const { eventType } = payload;
          const newRecord = payload.new as ChoreTable;
          const oldRecord = payload.old as Partial<ChoreTable>;

          // Get ID safely from the payload
          const changeId = newRecord?.id || oldRecord?.id;

          // Skip if this change originated from this client or if we can't determine the ID
          if (!changeId || localChangesRef.current.has(changeId)) {
            // Remove from tracking after processing
            if (changeId) {
              localChangesRef.current.delete(changeId);
            }
            return;
          }

          // Handle based on event type
          setSyncStatus("syncing");

          if (eventType === "INSERT" && newRecord) {
            setChores((prevChores) => [...prevChores, toChore(newRecord)]);
          } else if (eventType === "UPDATE" && newRecord) {
            setChores((prevChores) =>
              prevChores.map((chore) =>
                chore.id === newRecord.id ? toChore(newRecord) : chore
              )
            );
          } else if (eventType === "DELETE" && oldRecord?.id) {
            setChores((prevChores) =>
              prevChores.filter((chore) => chore.id !== oldRecord.id)
            );
          }

          // Set back to synced
          setTimeout(() => setSyncStatus("synced"), 300);
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);

        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to chores changes");
          setSyncStatus("synced");
        } else {
          console.warn("Subscription status:", status);
          setSyncStatus("offline");
        }
      });

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load chores from Supabase
  useEffect(() => {
    const fetchChores = async () => {
      try {
        setInitialLoading(true);
        const fetchedChores = await choreService.getChores();
        setChores(fetchedChores);
        setError(null);
        setSyncStatus("synced");
      } catch (err) {
        console.error("Failed to fetch chores:", err);
        setError("Failed to load chores. Please try again later.");
        setSyncStatus("offline");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchChores();
  }, []);

  // Add a new chore
  const addChore = useCallback(
    async (
      title: string,
      assigneeId?: string, // UUID reference to family_members.id
      reward?: number,
      icon?: string,
      column: ColumnType = assigneeId ? "TODO" : "IDEAS"
    ) => {
      try {
        // Generate a temporary local ID
        const tempId = `temp-${Date.now()}`;

        // Create the chore locally first (optimistically)
        const newChore: Chore = {
          id: tempId,
          title,
          assignee: assigneeId ?? null,
          column,
          createdAt: new Date().toISOString(),
          reward: reward ?? null,
          icon: icon ?? null,
        };

        // Add to local state immediately
        setChores((prev) => [...prev, newChore]);

        // Update in background
        setBackgroundSaving(true);

        // Call the service to persist
        const permanentId = await choreService.addChore(
          title,
          assigneeId ?? null,
          reward ?? null,
          icon ?? null,
          column
        );

        // Add to local changes ref to avoid duplicate updates from realtime
        localChangesRef.current.add(permanentId);

        // Update the temporary ID with the permanent one
        setChores((prev) =>
          prev.map((chore) =>
            chore.id === tempId ? { ...chore, id: permanentId } : chore
          )
        );

        return permanentId;
      } catch (err) {
        console.error("Failed to add chore:", err);
        // Remove the temporary chore since the save failed
        setChores((prev) =>
          prev.filter((chore) => chore.id !== `temp-${Date.now()}`)
        );
        setError("Failed to add chore. Please try again.");
        setSyncStatus("offline");
        return null;
      } finally {
        setBackgroundSaving(false);
      }
    },
    []
  );

  // Update a chore
  const updateChore = useCallback(
    async (id: string, updates: Partial<Chore>) => {
      try {
        // Update locally first (optimistically)
        setChores((prev) =>
          prev.map((chore) =>
            chore.id === id ? { ...chore, ...updates } : chore
          )
        );

        // Add to local changes ref to avoid duplicate updates from realtime
        localChangesRef.current.add(id);

        // Then update in the background
        setBackgroundSaving(true);
        await choreService.updateChore(id, updates);
      } catch (err) {
        console.error("Failed to update chore:", err);
        setError("Failed to update chore. Please try again.");
        setSyncStatus("offline");

        // Potential rollback logic could be added here
        // This would require keeping track of previous state
      } finally {
        setBackgroundSaving(false);
      }
    },
    []
  );

  // Delete a chore
  const deleteChore = useCallback(async (id: string) => {
    try {
      // Optimistically remove from local state
      setChores((prev) => prev.filter((chore) => chore.id !== id));

      // Add to local changes ref to avoid duplicate updates from realtime
      localChangesRef.current.add(id);

      // Then delete in the background
      setBackgroundSaving(true);
      await choreService.deleteChore(id);
    } catch (err) {
      console.error("Failed to delete chore:", err);
      setError("Failed to delete chore. Please try again.");
      setSyncStatus("offline");

      // We could add rollback logic here if needed
      // For example:
      // setChores(previousState => [...previousState, deletedChore]);
    } finally {
      setBackgroundSaving(false);
    }
  }, []);

  // Move a chore to a different column
  const moveChore = useCallback(async (id: string, column: ColumnType) => {
    try {
      // Optimistically update locally first
      if (column === "IDEAS") {
        setChores((prev) =>
          prev.map((chore) =>
            chore.id === id ? { ...chore, column, assignee: null } : chore
          )
        );
      } else {
        setChores((prev) =>
          prev.map((chore) => (chore.id === id ? { ...chore, column } : chore))
        );
      }

      // Add to local changes ref to avoid duplicate updates from realtime
      localChangesRef.current.add(id);

      // Then update in the background
      setBackgroundSaving(true);
      await choreService.moveChore(id, column);
    } catch (err) {
      console.error("Failed to move chore:", err);
      setError("Failed to move chore. Please try again.");
      setSyncStatus("offline");

      // Potential rollback logic could be added here
    } finally {
      setBackgroundSaving(false);
    }
  }, []);

  // Reassign a chore to a different family member
  const reassignChore = useCallback(
    async (
      id: string,
      assigneeId: string, // UUID reference to family_members.id
      targetColumn?: ColumnType
    ) => {
      try {
        // Find the current chore
        const chore = chores.find((c) => c.id === id);

        if (chore) {
          // Update locally first (optimistically)
          if (targetColumn) {
            // If target column is explicitly provided, use it
            setChores((prev) =>
              prev.map((c) =>
                c.id === id
                  ? { ...c, assignee: assigneeId, column: targetColumn }
                  : c
              )
            );
          } else if (chore.column === "IDEAS") {
            // For unassigned chores from IDEAS, move to TODO
            setChores((prev) =>
              prev.map((c) =>
                c.id === id ? { ...c, assignee: assigneeId, column: "TODO" } : c
              )
            );
          } else {
            // For chores in other columns, keep the current column
            setChores((prev) =>
              prev.map((c) =>
                c.id === id ? { ...c, assignee: assigneeId } : c
              )
            );
          }

          // Add to local changes ref to avoid duplicate updates from realtime
          localChangesRef.current.add(id);

          // Then update in the background
          setBackgroundSaving(true);
          await choreService.reassignChore(id, assigneeId, targetColumn);
        }
      } catch (err) {
        console.error("Failed to reassign chore:", err);
        setError("Failed to reassign chore. Please try again.");
        setSyncStatus("offline");

        // Potential rollback logic could be added here
      } finally {
        setBackgroundSaving(false);
      }
    },
    [chores]
  );

  return {
    chores,
    loading,
    backgroundSaving,
    syncStatus,
    error,
    addChore,
    updateChore,
    deleteChore,
    moveChore,
    reassignChore,
  };
};
