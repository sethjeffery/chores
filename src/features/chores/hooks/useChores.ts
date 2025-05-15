import { useState, useEffect, useCallback, useRef } from "react";
import type { Chore, ColumnType } from "../../../types";
import * as choreService from "../services/choreService";
import { supabase, CHORES_TABLE } from "../../../supabase";
import type { ChoreTable } from "../services/choreService";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

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
            setChores((prevChores) => [
              ...prevChores,
              choreService.toChore(newRecord),
            ]);
          } else if (eventType === "UPDATE" && newRecord) {
            setChores((prevChores) =>
              prevChores.map((chore) =>
                chore.id === newRecord.id
                  ? choreService.toChore(newRecord)
                  : chore
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
