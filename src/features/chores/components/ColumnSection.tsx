import { useState, useCallback, useContext, useMemo } from "react";
import type { ColumnType, Chore } from "../../../types";
import ChoreCard from "./ChoreCard";
import { COLUMNS } from "../constants/columns";
import { useFamilyContext } from "../../family/hooks/useFamilyContext";
import DragContext from "../contexts/DragContext";
import MemberSection from "./MemberSection";
import clsx from "clsx";
interface ColumnSectionProps {
  title: string;
  columnId: ColumnType;
  chores: Chore[];
  draggable?: boolean;
  onDelete?: (id: string) => void;
  onDrop?: (choreId: string, column: ColumnType) => void;
  onReassign?: (
    choreId: string,
    newAssigneeId: string,
    targetColumn?: ColumnType
  ) => void;
}

export default function ColumnSection({
  title,
  columnId,
  chores,
  draggable = true,
  onDelete,
  onDrop,
  onReassign,
}: ColumnSectionProps) {
  const [dragOverMember, setDragOverMember] = useState<string | null>(null);
  const [isColumnOver, setIsColumnOver] = useState(false);
  const { onDragOver: contextDragOver } = useContext(DragContext);
  const { familyMembers, isLoading } = useFamilyContext();

  // Common assignee drop logic
  const handleAssigneeDropLogic = useCallback(
    (choreId: string, memberId: string) => {
      // Get the chore being dragged
      const chore = chores.find((c) => c.id === choreId);

      // Reassign the chore to this family member
      if (chore) {
        // If the chore is coming from a different column,
        // explicitly pass the target column when reassigning
        if (chore.column !== columnId) {
          onReassign?.(choreId, memberId, columnId);
        } else {
          // For chores already in this column, just reassign
          onReassign?.(choreId, memberId);
        }
      }
    },
    [chores, columnId, onReassign]
  );

  // Handle drop event for the column
  const handleColumnDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Remove highlight classes directly
      e.currentTarget.classList.remove("drag-over");
      e.currentTarget.classList.remove("drag-over-invalid");

      try {
        // Get the chore ID from the data transfer
        const chore: Chore = JSON.parse(e.dataTransfer.getData("chore"));

        if (chore) {
          // If it's an unassigned chore, don't allow the drop
          if (chore && !chore.assignee) {
            console.log("Cannot move unassigned chore");
            // Don't call onDrop, just clean up visual state
          } else {
            // Process the drop for all other cases
            onDrop?.(chore.id, columnId);
          }
        }
      } catch (err) {
        console.error("Error handling drop:", err);
      } finally {
        // Use DOM methods to reset state in addition to React state for reliability
        document.querySelectorAll(".drag-over").forEach((el) => {
          el.classList.remove("drag-over");
        });
        document.querySelectorAll(".drag-over-invalid").forEach((el) => {
          el.classList.remove("drag-over-invalid");
        });

        // Reset React state after the drag operation is complete
        setTimeout(() => {
          setIsColumnOver(false);
          setDragOverMember(null);
        }, 0);
      }
    },
    [columnId, onDrop, setDragOverMember, setIsColumnOver]
  );

  // Handle dragover for the column
  const handleColumnDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // Required to allow dropping
      e.preventDefault();
      e.stopPropagation();

      try {
        // Try to extract the chore ID from dataTransfer
        const chore: Chore = JSON.parse(e.dataTransfer.getData("chore"));

        // Find the chore being dragged - this may not work in all browsers during dragover
        // We'll need a fallback in case we can't get the chore data
        if (chore) {
          // If it's an unassigned chore and being dropped into TODO, show a different style
          if (chore && !chore.assignee && columnId === "TODO") {
            // Add a not-allowed class directly to the DOM
            e.currentTarget.classList.add("drag-over-invalid");
            e.currentTarget.classList.remove("drag-over");
            e.dataTransfer.dropEffect = "none"; // Show "not allowed" cursor
            return; // Exit early
          }
        }
      } catch {
        // Some browsers don't allow reading dataTransfer during dragover
        // We'll fall back to the default behavior
      }

      // Default behavior for valid drops
      // Add a class directly to the DOM
      e.currentTarget.classList.add("drag-over");
      e.currentTarget.classList.remove("drag-over-invalid");

      // Call the context drag over handler if it exists
      if (contextDragOver) {
        contextDragOver(e);
      }

      // Use setTimeout to avoid interrupting the drag operation
      if (!isColumnOver) {
        setTimeout(() => {
          setIsColumnOver(true);
        }, 0);
      }
    },
    [columnId, contextDragOver, isColumnOver, setIsColumnOver]
  );

  // Handle dragleave for the column
  const handleColumnDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Only clear the highlight if we're not entering a child element
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsColumnOver(false);

        // Clear both the normal and invalid drop states
        e.currentTarget.classList.remove("drag-over");
        e.currentTarget.classList.remove("drag-over-invalid");
      }
    },
    [setIsColumnOver]
  );

  // Handle drop event for reassignment (for HTML5 drag and drop)
  const handleAssigneeDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, memberId: string) => {
      e.preventDefault();
      e.stopPropagation(); // Keep stopPropagation to prevent double drop processing

      // Remove highlight classes directly
      e.currentTarget.classList.remove("member-drag-over");

      // Also clean up any column drag styling for cases of fast drags
      document.querySelectorAll(".drag-over").forEach((el) => {
        el.classList.remove("drag-over");
      });
      document.querySelectorAll(".drag-over-invalid").forEach((el) => {
        el.classList.remove("drag-over-invalid");
      });

      try {
        const chore: Chore = JSON.parse(e.dataTransfer.getData("chore"));

        if (chore) {
          handleAssigneeDropLogic(chore.id, memberId);
        }
      } catch (err) {
        console.error("Error handling assignee drop:", err);
      } finally {
        // Use DOM methods to reset state in addition to React state
        document.querySelectorAll(".member-drag-over").forEach((el) => {
          el.classList.remove("member-drag-over");
        });
        setTimeout(() => {
          setDragOverMember(null);
        }, 0);
      }
    },
    [handleAssigneeDropLogic, setDragOverMember]
  );

  // Handle dragover for assignees
  const handleAssigneeDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, memberId: string) => {
      e.preventDefault();
      e.stopPropagation();

      // Add over class directly to DOM for style
      e.currentTarget.classList.add("member-drag-over");

      // Set the member being dragged over
      if (dragOverMember !== memberId) {
        setDragOverMember(memberId);
      }
    },
    [dragOverMember, setDragOverMember]
  );

  // Handle dragleave for assignees
  const handleAssigneeDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      // Only clear if we're not entering a child element
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        e.currentTarget.classList.remove("member-drag-over");
        setDragOverMember(null);
      }
    },
    []
  );

  // Handle chore drag operations
  const [, setDraggedChoreId] = useState<string | null>(null);

  const handleChoreStartDrag = useCallback((choreId: string) => {
    setDraggedChoreId(choreId);
  }, []);

  const handleChoreEndDrag = useCallback(() => {
    setDraggedChoreId(null);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsColumnOver(true);
  }, []);

  // Get column style
  const columnStyle = useMemo(() => {
    switch (columnId) {
      case "IDEAS":
        return "border-blue-400";
      case "TODO":
        return "border-amber-400";
      case "DONE":
        return "border-green-400";
      default:
        return "border-gray-400";
    }
  }, [columnId]);

  // Get column header background
  const headerStyle = useMemo(() => {
    switch (columnId) {
      case "IDEAS":
        return "bg-blue-100 text-blue-800";
      case "TODO":
        return "bg-amber-100 text-amber-800";
      case "DONE":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, [columnId]);

  // Filter chores for this column
  const columnChores = useMemo(
    () => chores.filter((chore) => chore.column === columnId),
    [chores, columnId]
  );

  // For non-IDEAS columns, group chores by assignee
  const choresByAssignee = useMemo(() => {
    const result: Record<string, Chore[]> = {};

    // Initialize empty arrays for each family member for non-IDEAS columns
    if (columnId !== "IDEAS" && !isLoading) {
      familyMembers.forEach((member) => {
        result[member.id] = [];
      });

      // Fill with chores for this column that have assignees
      columnChores
        .filter((chore) => chore.assignee)
        .forEach((chore) => {
          if (chore.assignee) {
            // Create the array if it doesn't exist yet (useful for handling new family members)
            if (!result[chore.assignee]) {
              result[chore.assignee] = [];
            }
            result[chore.assignee].push(chore);
          }
        });
    }

    return result;
  }, [columnId, columnChores, familyMembers, isLoading]);

  // Get column description
  const columnDescription = useMemo(
    () => COLUMNS.find((col) => col.id === columnId)?.description || "",
    [columnId]
  );

  // Calculate total rewards per family member for DONE column
  const rewardTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    // Initialize totals for all family members
    if (!isLoading) {
      familyMembers.forEach((member) => {
        totals[member.id] = 0;
      });

      // Sum up rewards for completed chores
      chores
        .filter(
          (chore) => chore.column === "DONE" && chore.assignee && chore.reward
        )
        .forEach((chore) => {
          if (chore.assignee && chore.reward) {
            // Create the counter if it doesn't exist yet
            if (totals[chore.assignee] === undefined) {
              totals[chore.assignee] = 0;
            }
            totals[chore.assignee] += chore.reward;
          }
        });
    }

    return totals;
  }, [chores, familyMembers, isLoading]);

  // Format reward amount
  const formatReward = useCallback((amount: number) => {
    return amount < 1
      ? `${Math.round(amount * 100)}p`
      : `£${amount.toFixed(2)}`;
  }, []);

  // If still loading family members, show placeholder
  if (isLoading && columnId !== "IDEAS") {
    return (
      <div
        className={`column-item rounded-xl bg-white p-0 border-t-4 ${columnStyle} shadow-xl h-full flex flex-col`}
      >
        <div className={`rounded-t-lg ${headerStyle}`}>
          <h2 className="text-2xl sm:text-3xl font-bold pt-3 pb-1 px-5 text-left sm:text-center flex items-center sm:justify-center mb-0 font-fancy">
            {title}
          </h2>
          <p className="text-xs text-left sm:text-center pt-0 pb-4 px-4 opacity-75">
            {columnDescription}
          </p>
        </div>
        <div className="flex-1 px-4 py-3">
          <p className="text-gray-400 text-center py-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "column-item rounded-xl bg-white p-0 border-t-4 shadow-xl h-full flex flex-col relative",
        columnStyle,
        isColumnOver &&
          "bg-blue-50 shadow-[inset_0_0_0_2px_rgba(59,130,246,0.3)]",
        draggable &&
          "hover:shadow-2xl transition-all duration-200 [&.drag-over-invalid]:bg-red-50 [&.drag-over-invalid]:shadow-[inset_0_0_0_2px_rgba(239,68,68,0.3)]"
      )}
      onDrop={draggable ? handleColumnDrop : undefined}
      onDragOver={draggable ? handleColumnDragOver : undefined}
      onDragEnter={draggable ? handleDragEnter : undefined}
      onDragLeave={draggable ? handleColumnDragLeave : undefined}
      data-column={columnId}
      data-drop-action="column"
      data-drop-target={columnId}
    >
      {columnId === "IDEAS" && (
        <img
          src="/pocket-bunnies-clip.png"
          alt="Pocket Bunny"
          className="hidden md:block absolute bottom-full left-0 transform translate-x-1/2 w-32 lg:w-36 h-auto z-10 lg:left-1/2 lg:-translate-x-12 pointer-events-none"
        />
      )}
      <div className={`rounded-t-lg ${headerStyle}`}>
        <h2
          className={`text-2xl sm:text-3xl font-bold pt-3 pb-1 px-5 text-left sm:text-center flex items-center sm:justify-center mb-0 font-fancy`}
        >
          {title}
        </h2>
        <p className="text-xs text-left sm:text-center pt-0 pb-4 px-4 opacity-75">
          {columnDescription}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {columnId === "IDEAS" ? (
          // For IDEAS column, just show a list of chores without family grouping
          <div className="space-y-3">
            {columnChores.length > 0 ? (
              columnChores.map((chore) => (
                <ChoreCard
                  key={chore.id}
                  chore={chore}
                  onDelete={onDelete}
                  onDragStart={draggable ? handleChoreStartDrag : undefined}
                  onDragEnd={draggable ? handleChoreEndDrag : undefined}
                  onAssign={(choreId) => {
                    // Show dialog for assigning to family members
                    const assigneeElement =
                      document.getElementById("assignee-dialog");
                    if (
                      assigneeElement &&
                      assigneeElement instanceof HTMLDialogElement
                    ) {
                      assigneeElement.setAttribute("data-chore-id", choreId);
                      assigneeElement.showModal();
                    }
                  }}
                />
              ))
            ) : (
              <p className="text-gray-400 text-xs italic py-2 bg-gray-50 rounded-lg px-3 text-center">
                No chore ideas yet
              </p>
            )}
          </div>
        ) : (
          // For other columns, group by family member
          familyMembers.map((member) => (
            <MemberSection
              key={`${member.id}-${member.color}`}
              member={member}
              columnId={columnId}
              choresByAssignee={choresByAssignee}
              onDelete={onDelete}
              dragOverMember={dragOverMember}
              handleAssigneeDrop={draggable ? handleAssigneeDrop : undefined}
              handleAssigneeDragOver={
                draggable ? handleAssigneeDragOver : undefined
              }
              handleAssigneeDragLeave={
                draggable ? handleAssigneeDragLeave : undefined
              }
              rewardTotals={rewardTotals}
              formatReward={formatReward}
              setDragOverMember={setDragOverMember}
            />
          ))
        )}
      </div>
    </div>
  );
}
