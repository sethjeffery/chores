import { useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { FamilyContext } from "../contexts/FamilyContext";
import * as familyService from "../services/familyService";
import { supabase } from "../../../supabase";
import type { FamilyMember } from "../../../types";
import { useAccount } from "../../account/hooks/useAccount";
import { DEFAULT_FAMILY_MEMBERS } from "../constants/defaultMembers";
import useSWR from "swr";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { Database } from "../../../database.types";

type DbFamilyMember = Database["public"]["Tables"]["family_members"]["Row"];

// Provider component that wraps parts of the app that need family data
export function FamilyProvider({ children }: { children: ReactNode }) {
  const { activeAccount } = useAccount();
  const accountId = activeAccount?.id;
  const localChangesRef = useRef(new Set<string>());

  // Fetch family members from the database
  const {
    data: familyMembers = [],
    error,
    mutate,
    isLoading,
  } = useSWR(
    accountId ? ["family-members", accountId] : null,
    async () => {
      try {
        return await familyService.getFamilyMembers(accountId as string);
      } catch (error) {
        console.error("Failed to fetch family members:", error);
        // Return default members as fallback
        return DEFAULT_FAMILY_MEMBERS;
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // Prevent excessive refetching
    }
  );

  // Set up real-time subscription to family member changes
  useSWR(
    accountId ? ["family-subscription", accountId] : null,
    () => {
      // Subscribe to changes on the family_members table for this account
      const channel = supabase
        .channel("family-members-sync")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "family_members",
            filter: `account_id=eq.${accountId}`,
          },
          (payload: RealtimePostgresChangesPayload<DbFamilyMember>) => {
            console.log("Realtime family member change received:", payload);

            const { eventType } = payload;
            const newRecord = payload.new as DbFamilyMember;
            const oldRecord = payload.old as Partial<DbFamilyMember>;

            // Get ID safely from the payload
            const changeId = newRecord?.id || oldRecord?.id;

            if (!changeId) {
              console.warn("Received change event without ID", payload);
              return;
            }

            // Skip if this change originated from this client
            if (localChangesRef.current.has(changeId)) {
              console.log(`Skipping local change for ID: ${changeId}`);
              localChangesRef.current.delete(changeId);
              return;
            }

            console.log(
              `Processing remote change for ID: ${changeId}, type: ${eventType}`
            );

            // Handle updates based on event type
            mutate((currentMembers = []) => {
              // For INSERT, check if we already have this member to avoid duplicates
              if (eventType === "INSERT" && newRecord) {
                // Ensure we don't already have this member
                const alreadyExists = currentMembers.some(
                  (member) => member.id === newRecord.id
                );
                if (alreadyExists) {
                  console.log(
                    `Member ${newRecord.id} already exists, skipping insert`
                  );
                  return currentMembers;
                }

                const newMember = familyService.toFamilyMember(newRecord);
                console.log(
                  `Adding new member: ${newMember.name} (${newMember.id})`
                );
                return [...currentMembers, newMember];
              } else if (eventType === "UPDATE" && newRecord) {
                console.log(`Updating member: ${newRecord.id}`);
                return currentMembers.map((member) =>
                  member.id === newRecord.id
                    ? familyService.toFamilyMember(newRecord)
                    : member
                );
              } else if (eventType === "DELETE" && oldRecord?.id) {
                console.log(`Removing member: ${oldRecord.id}`);
                return currentMembers.filter(
                  (member) => member.id !== oldRecord.id
                );
              }

              return currentMembers;
            }, false); // Don't revalidate after update to avoid race conditions
          }
        )
        .subscribe((status) => {
          console.log("Family members subscription status:", status);
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

  // Add a new family member
  const addFamilyMember = useCallback(
    async (name: string, avatar?: string, color?: string, dob?: string) => {
      if (!accountId) {
        console.error("No active account. Cannot add family member.");
        return null;
      }

      try {
        // Optimistic update with temporary ID
        const tempId = `temp-${Date.now()}`;
        const newMember: FamilyMember = {
          id: tempId,
          name,
          avatar: avatar || null,
          color: color || null,
          dob: dob || null,
        };

        console.log(`Creating family member with temp ID: ${tempId}`);

        // Update the local state immediately (optimistic UI)
        mutate((current = []) => [...current, newMember], false);

        // Persist to database
        const permanentId = await familyService.addFamilyMember(
          newMember,
          accountId
        );

        console.log(
          `Received permanent ID: ${permanentId} for temp ID: ${tempId}`
        );

        // Add to local changes to prevent duplicate updates from realtime
        localChangesRef.current.add(permanentId);

        // Update local state with permanent ID and remove the temp version
        mutate((current = []) => {
          // Remove temp entry
          const withoutTemp = current.filter((m) => m.id !== tempId);

          // If we somehow already have the permanent ID entry, don't add it again
          if (withoutTemp.some((m) => m.id === permanentId)) {
            console.log(
              `Member with ID ${permanentId} already exists, not adding duplicate`
            );
            return withoutTemp;
          }

          // Create a new member with the permanent ID
          const memberWithPermanentId = {
            ...newMember,
            id: permanentId,
          };

          console.log(`Replacing temp ID with permanent ID: ${permanentId}`);
          return [...withoutTemp, memberWithPermanentId];
        }, false);

        return permanentId;
      } catch (err) {
        console.error("Failed to add family member:", err);
        // Revalidate to restore correct state
        mutate();
        return null;
      }
    },
    [accountId, mutate]
  );

  // Update a family member
  const updateFamilyMember = useCallback(
    async (id: string, updates: Partial<FamilyMember>) => {
      try {
        // Optimistic update
        mutate(
          (current = []) =>
            current.map((member) =>
              member.id === id ? { ...member, ...updates } : member
            ),
          false
        );

        // Track local change
        localChangesRef.current.add(id);

        // Persist update
        await familyService.updateFamilyMember(id, updates);
      } catch (err) {
        console.error("Failed to update family member:", err);
        // Revalidate to restore correct state
        mutate();
      }
    },
    [mutate]
  );

  // Delete a family member
  const deleteFamilyMember = useCallback(
    async (id: string) => {
      try {
        // Optimistic delete
        mutate(
          (current = []) => current.filter((member) => member.id !== id),
          false
        );

        // Track local change
        localChangesRef.current.add(id);

        // Persist deletion
        await familyService.deleteFamilyMember(id);
      } catch (err) {
        console.error("Failed to delete family member:", err);
        // Revalidate to restore correct state
        mutate();
      }
    },
    [mutate]
  );

  // Helper functions for looking up family members
  const getFamilyMemberById = useCallback(
    (id: string | null) => {
      if (!id) return null;
      return familyMembers.find((member) => member.id === id) || null;
    },
    [familyMembers]
  );

  const getFamilyMemberByName = useCallback(
    (name: string) => {
      return familyMembers.find((member) => member.name === name) || null;
    },
    [familyMembers]
  );

  // Create the context value with all family state
  const value = useMemo(
    () => ({
      familyMembers,
      isLoading,
      error: error ? String(error) : null,
      addFamilyMember,
      updateFamilyMember,
      deleteFamilyMember,
      getFamilyMemberById,
      getFamilyMemberByName,
      mutate,
    }),
    [
      familyMembers,
      isLoading,
      error,
      addFamilyMember,
      updateFamilyMember,
      deleteFamilyMember,
      getFamilyMemberById,
      getFamilyMemberByName,
      mutate,
    ]
  );

  return (
    <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
  );
}
