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
            table: familyService.FAMILY_MEMBERS_TABLE,
            filter: `account_id=eq.${accountId}`,
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

            // Skip if this change originated from this client
            if (!changeId || localChangesRef.current.has(changeId)) {
              if (changeId) {
                localChangesRef.current.delete(changeId);
              }
              return;
            }

            // Handle optimistic updates based on event type
            mutate((currentMembers = []) => {
              if (eventType === "INSERT" && newRecord) {
                return [
                  ...currentMembers,
                  familyService.toFamilyMember(newRecord),
                ];
              } else if (eventType === "UPDATE" && newRecord) {
                return currentMembers.map((member) =>
                  member.id === newRecord.id
                    ? familyService.toFamilyMember(newRecord)
                    : member
                );
              } else if (eventType === "DELETE" && oldRecord?.id) {
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

        // Update the local state immediately
        mutate((current = []) => [...current, newMember], false);

        // Persist to database
        const permanentId = await familyService.addFamilyMember(
          newMember,
          accountId
        );

        // Add to local changes to prevent duplicate updates
        localChangesRef.current.add(permanentId);

        // Update with permanent ID
        mutate(
          (current = []) =>
            current.map((member) =>
              member.id === tempId ? { ...member, id: permanentId } : member
            ),
          false
        );

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
