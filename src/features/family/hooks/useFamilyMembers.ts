import { useState, useEffect, useCallback, useRef } from "react";
import type { FamilyMember } from "../../../types";
import * as familyService from "../services/familyService";
import { supabase } from "../../../supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { DEFAULT_FAMILY_MEMBERS } from "../constants/defaultMembers";

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
        // Set default members as fallback
        setFamilyMembers(DEFAULT_FAMILY_MEMBERS);
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
