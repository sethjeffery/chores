import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChoresContext } from "../contexts/ChoresContext";
import * as choreService from "../services/choreService";
import { supabase, CHORES_TABLE } from "../../../supabase";
import type { Chore, ColumnType } from "../../../types";
import { useAccount } from "../../account/hooks/useAccount";
import useSWR from "swr";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { ChoreTable } from "../services/choreService";

// Provider component that wraps the app with chores data
export function ChoresProvider({ children }: { children: ReactNode }) {
  const { activeAccount } = useAccount();
  const accountId = activeAccount?.id;
  const localChangesRef = useRef(new Set<string>());

  const withSyncing = useCallback(<T,>(fn: () => T): T => {
    let timeout: NodeJS.Timeout | undefined;
    try {
      timeout = setTimeout(
        () => setSyncState({ saving: true, status: "syncing" }),
        500
      );
      return fn();
    } catch (error) {
      setSyncState({ saving: false, status: "offline" });
      throw error;
    } finally {
      clearTimeout(timeout);
      setSyncState({ saving: false, status: "synced" });
    }
  }, []);

  // Track background saving and sync state
  const [syncState, setSyncState] = useState<{
    saving: boolean;
    status: "synced" | "syncing" | "offline";
  }>({
    saving: false,
    status: "synced",
  });

  // Fetch chores data
  const {
    data: chores = [],
    error,
    mutate,
    isLoading,
  } = useSWR(
    accountId ? ["chores-data", accountId] : null,
    async () => {
      try {
        return await choreService.getChores(accountId as string);
      } catch (error) {
        console.error("Failed to fetch chores:", error);
        throw new Error("Failed to load chores. Please try again later.");
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 3000, // Reduce unnecessary refetches
    }
  );

  // Set up real-time sync with Supabase
  useSWR(
    accountId ? ["chores-subscription", accountId] : null,
    () => {
      // Handler for real-time changes
      const handleChange = async (
        eventType: string,
        newRecord: ChoreTable | null,
        oldRecord: Partial<ChoreTable> | null
      ) => {
        console.log(`${eventType} event processed`);

        // Get ID safely from the payload
        const changeId = newRecord?.id || oldRecord?.id;

        // Skip if this change originated from this client
        if (!changeId || localChangesRef.current.has(changeId)) {
          if (changeId) {
            localChangesRef.current.delete(changeId);
          }
          return;
        }

        mutate((current = []) => {
          if (eventType === "INSERT" && newRecord) {
            return [...current, choreService.toChore(newRecord)];
          } else if (eventType === "UPDATE" && newRecord) {
            return current.map((chore) =>
              chore.id === newRecord.id
                ? choreService.toChore(newRecord)
                : chore
            );
          } else if (eventType === "DELETE" && oldRecord?.id) {
            return current.filter((chore) => chore.id !== oldRecord.id);
          }
          return current;
        });
      };

      // Create Supabase subscription
      const channel = supabase
        .channel(`chores-sync-${accountId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: CHORES_TABLE,
            filter: `account_id=eq.${accountId}`,
          },
          (payload: RealtimePostgresChangesPayload<ChoreTable>) => {
            console.log("Realtime chore change received:", payload);
            handleChange(
              payload.eventType,
              payload.new as ChoreTable,
              payload.old as Partial<ChoreTable>
            );
          }
        )
        .subscribe((status) => {
          console.log(`Subscription status for chores:`, status);
          const syncStatus = status === "SUBSCRIBED" ? "synced" : "offline";
          setSyncState({ saving: false, status: syncStatus });
        });

      // Return cleanup function
      return channel;
    },
    {
      onSuccess: (channel) => {
        return () => {
          if (channel) {
            supabase.removeChannel(channel);
          }
        };
      },
    }
  );

  // Add a new chore
  const addChore = useCallback(
    async (
      title: string,
      assigneeId?: string,
      reward?: number,
      icon?: string,
      column: ColumnType = assigneeId ? "TODO" : "IDEAS"
    ) => {
      if (!accountId) {
        console.error("No active account. Cannot add chore.");
        return null;
      }

      try {
        // Create temp ID for optimistic update
        const tempId = `temp-${Date.now()}`;

        // Optimistic update
        const newChore: Chore = {
          id: tempId,
          title,
          assignee: assigneeId ?? null,
          column,
          createdAt: new Date().toISOString(),
          reward: reward ?? null,
          icon: icon ?? null,
        };

        return withSyncing(async () => {
          // Update UI immediately
          mutate((current = []) => [...current, newChore], false);

          // Persist to database
          const permanentId = await choreService.addChore(newChore, accountId);

          // Prevent duplicate updates from real-time subscription
          localChangesRef.current.add(permanentId);

          // Update temporary ID with permanent one
          mutate(
            (current = []) =>
              current.map((chore) =>
                chore.id === tempId ? { ...chore, id: permanentId } : chore
              ),
            false
          );
          return permanentId;
        });
      } catch (err) {
        console.error("Failed to add chore:", err);

        // Remove the temporary chore
        mutate((current = []) =>
          current.filter((chore) => !chore.id.startsWith("temp-"))
        );

        return null;
      }
    },
    [accountId, mutate, withSyncing]
  );

  // Update a chore
  const updateChore = useCallback(
    async (id: string, updates: Partial<Chore>) => {
      try {
        // Optimistic update
        mutate(
          (current = []) =>
            current.map((chore) =>
              chore.id === id ? { ...chore, ...updates } : chore
            ),
          false
        );

        // Track local change
        localChangesRef.current.add(id);
        await withSyncing(() => choreService.updateChore(id, updates));
      } catch (err) {
        console.error("Failed to update chore:", err);
        mutate(); // Revalidate to restore correct state
      }
    },
    [mutate, withSyncing]
  );

  // Delete a chore
  const deleteChore = useCallback(
    async (id: string) => {
      try {
        // Optimistic delete
        mutate((current) => current?.filter((chore) => chore.id !== id), false);

        // Track local change
        localChangesRef.current.add(id);

        // Persist deletion
        await withSyncing(() => choreService.deleteChore(id));
      } catch (err) {
        console.error("Failed to delete chore:", err);
        mutate(); // Revalidate to restore correct state
      }
    },
    [mutate, withSyncing]
  );

  // Move a chore to a different column
  const moveChore = useCallback(
    async (id: string, column: ColumnType) => {
      try {
        // Optimistic update
        mutate(
          (current = []) =>
            current.map((chore) => {
              if (chore.id !== id) return chore;

              // If moving to IDEAS, also remove assignee
              if (column === "IDEAS") {
                return { ...chore, column, assignee: null };
              }

              return { ...chore, column };
            }),
          false
        );

        // Track local change
        localChangesRef.current.add(id);
        withSyncing(() => choreService.moveChore(id, column));
      } catch (err) {
        console.error("Failed to move chore:", err);
        mutate(); // Revalidate to restore correct state
      }
    },
    [mutate, withSyncing]
  );

  // Reassign a chore to a different family member
  const reassignChore = useCallback(
    async (
      id: string,
      assigneeId: string | null,
      targetColumn?: ColumnType
    ) => {
      try {
        // Optimistic update
        mutate(
          (current = []) =>
            current.map((chore) => {
              if (chore.id !== id) return chore;

              // If assigning and chore is in IDEAS, move to TODO
              if (assigneeId && chore.column === "IDEAS" && !targetColumn) {
                return { ...chore, assignee: assigneeId, column: "TODO" };
              }

              // If target column provided, use it
              if (targetColumn) {
                return { ...chore, assignee: assigneeId, column: targetColumn };
              }

              // Otherwise just update assignee
              return { ...chore, assignee: assigneeId };
            }),
          false
        );

        // Track local change
        localChangesRef.current.add(id);

        await withSyncing(async () => {
          if (assigneeId === null) {
            await choreService.updateChore(id, { assignee: null });
          } else {
            await choreService.reassignChore(id, assigneeId, targetColumn);
          }
        });
      } catch (err) {
        console.error("Failed to reassign chore:", err);
        mutate(); // Revalidate to restore correct state
      }
    },
    [mutate, withSyncing]
  );

  // Create context value
  const value = useMemo(
    () => ({
      chores,
      isLoading,
      backgroundSaving: syncState.saving,
      error: error ? String(error) : null,
      syncStatus: syncState.status,
      addChore,
      updateChore,
      deleteChore,
      moveChore,
      reassignChore,
    }),
    [
      chores,
      isLoading,
      syncState,
      error,
      addChore,
      updateChore,
      deleteChore,
      moveChore,
      reassignChore,
    ]
  );

  return (
    <ChoresContext.Provider value={value}>{children}</ChoresContext.Provider>
  );
}
