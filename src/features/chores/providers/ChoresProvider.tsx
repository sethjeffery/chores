import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChoresContext } from "../contexts/ChoresContext";
import * as choreService from "../services/choreService";
import { supabase } from "../../../supabase";
import type { ColumnType } from "../../../types";
import { useAccount } from "../../account/hooks/useAccount";
import useSWR from "swr";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { Database } from "../../../database.types";

type DbChore = Database["public"]["Tables"]["chores"]["Row"];
type DbChoreStatus = Database["public"]["Tables"]["chore_statuses"]["Row"];

// Provider component that wraps the app with chores data
export function ChoresProvider({ children }: { children: ReactNode }) {
  const { activeAccount } = useAccount();
  const accountId = activeAccount?.id;

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
    () => choreService.getChores(accountId!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 3000, // Reduce unnecessary refetches
    }
  );

  // Set up real-time sync with Supabase
  useSWR(
    accountId ? ["chores-subscription", accountId] : null,
    () => {
      // Handler for real-time chore changes
      const handleChoreChange = (
        eventType: string,
        newRecord: DbChore | null,
        oldRecord: Partial<DbChore> | null
      ) => {
        console.log(`Chore ${eventType} event processed:`, newRecord);

        mutate((current = []) => {
          if (eventType === "INSERT" && newRecord) {
            // Check if this chore ID already exists in our list (prevent duplicates)
            const exists = current.some((chore) => chore.id === newRecord.id);
            if (exists) {
              console.log("Skipping duplicate chore:", newRecord.id);
              return current;
            }

            // This is a new insert
            return [
              ...current,
              choreService.toChore(newRecord, {
                status: "TODO",
                assignee: null,
                chore_id: newRecord.id,
                last_updated_at: newRecord.created_at,
                updated_by: null,
              }),
            ];
          } else if (eventType === "UPDATE" && newRecord) {
            return current.map((chore) =>
              chore.id === newRecord.id
                ? { ...choreService.toChore(newRecord), status: chore.status }
                : chore
            );
          } else if (eventType === "DELETE" && oldRecord?.id) {
            return current.filter((chore) => chore.id !== oldRecord.id);
          }
          return current;
        });
      };

      // Handler for real-time chore status changes
      const handleChoreStatusChange = (
        eventType: string,
        newRecord: DbChoreStatus | null,
        oldRecord: Partial<DbChoreStatus> | null
      ) => {
        console.log(`ChoreStatus ${eventType} event processed:`, newRecord);

        // Get chore ID from the status update
        const choreId = newRecord?.chore_id || oldRecord?.chore_id;

        if ((eventType === "UPDATE" || eventType === "INSERT") && newRecord) {
          // Update the chore's status
          mutate((current = []) => {
            return current.map((chore) => {
              if (chore.id === choreId) {
                return {
                  ...chore,
                  status: choreService.toChoreStatus(newRecord),
                };
              }
              return chore;
            });
          });
        }
      };

      // Create Supabase subscription for chores
      const choreChannel = supabase
        .channel(`chores-sync-${accountId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chores",
            filter: `account_id=eq.${accountId}`,
          },
          (payload: RealtimePostgresChangesPayload<DbChore>) => {
            console.log("Realtime chore change received:", payload);
            try {
              handleChoreChange(
                payload.eventType,
                payload.new as DbChore,
                payload.old as Partial<DbChore>
              );
            } catch (error) {
              console.error("Failed to handle chore change:", error);
            }
          }
        )
        .subscribe((status) => {
          console.log(`Subscription status for chores:`, status);
          const syncStatus = status === "SUBSCRIBED" ? "synced" : "offline";
          setSyncState({ saving: false, status: syncStatus });
        });

      // Create Supabase subscription for chore statuses
      const statusChannel = supabase
        .channel(`chore-statuses-sync-${accountId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chore_statuses",
            // We can't filter by account_id here since this table doesn't have that column
          },
          (payload: RealtimePostgresChangesPayload<DbChoreStatus>) => {
            console.log("Realtime chore status change received:", payload);
            try {
              handleChoreStatusChange(
                payload.eventType,
                payload.new as DbChoreStatus,
                payload.old as Partial<DbChoreStatus>
              );
            } catch (error) {
              console.error("Failed to handle chore status change:", error);
            }
          }
        )
        .subscribe((status) => {
          console.log(`Subscription status for chore statuses:`, status);
        });

      // Return cleanup function
      return [choreChannel, statusChannel];
    },
    {
      onSuccess: (channels) => {
        return () => {
          if (channels && channels.length) {
            channels.forEach((channel) => {
              supabase.removeChannel(channel);
            });
          }
        };
      },
    }
  );

  // Add a new chore
  const addChore = useCallback(
    async (chore: choreService.InsertChore) => {
      if (!accountId) {
        console.error("No active account. Cannot add chore.");
        return null;
      }

      try {
        // Persist to database first
        const insertedChore = await withSyncing(() =>
          choreService.addChore(chore, accountId)
        );

        // Update UI after successful insertion
        mutate((current = []) => {
          const exists = current.some((chore) => chore.id === insertedChore.id);
          if (exists) return current;
          return [...current, insertedChore];
        }, false);

        console.log("Added chore:", insertedChore);
        return insertedChore;
      } catch (err) {
        console.error("Failed to add chore:", err);
        mutate();
        return null;
      }
    },
    [accountId, mutate, withSyncing]
  );

  // Delete a chore
  const deleteChore = useCallback(
    async (id: string) => {
      try {
        // Optimistic delete
        mutate((current) => current?.filter((chore) => chore.id !== id), false);

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

              return {
                ...chore,
                status: {
                  choreId: chore.id,
                  assignee:
                    column === "IDEAS" ? null : chore.status?.assignee ?? null,
                  lastUpdatedAt: new Date().toISOString(),
                  status: column,
                },
              };
            }),
          false
        );

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
    async (id: string, assigneeId: string, targetColumn?: ColumnType) => {
      try {
        // Optimistic update
        mutate(
          (current = []) =>
            current.map((chore) => {
              if (chore.id !== id) return chore;

              return {
                ...chore,
                status: {
                  choreId: id,
                  lastUpdatedAt: new Date().toISOString(),
                  assignee: assigneeId,
                  ...(targetColumn
                    ? { status: targetColumn }
                    : { status: chore.status?.status ?? "IDEAS" }),
                },
              };
            }),
          false
        );

        await withSyncing(async () => {
          const newStatus = await choreService.reassignChore(
            id,
            assigneeId,
            targetColumn
          );

          mutate(
            (current = []) =>
              current.map((chore) => {
                if (chore.id !== id) return chore;
                return { ...chore, status: newStatus };
              }),
            false
          );
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
      deleteChore,
      moveChore,
      reassignChore,
    ]
  );

  return (
    <ChoresContext.Provider value={value}>{children}</ChoresContext.Provider>
  );
}
