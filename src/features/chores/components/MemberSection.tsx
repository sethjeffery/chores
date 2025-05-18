import React, { useCallback, useEffect, useState } from "react";
import type { Chore, ColumnType, FamilyMember } from "../../../types";
import ChoreCard from "./ChoreCard";
import { AVATARS } from "../../family/constants/avatars";
interface MemberSectionProps {
  member: FamilyMember;
  columnId: ColumnType;
  choresByAssignee: Record<string, Chore[]>;
  onDelete?: (id: string) => void;
  dragOverMember: string | null;
  handleAssigneeDrop?: (
    e: React.DragEvent<HTMLDivElement>,
    memberId: string
  ) => void;
  handleAssigneeDragOver?: (
    e: React.DragEvent<HTMLDivElement>,
    memberId: string
  ) => void;
  handleAssigneeDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  rewardTotals: Record<string, number>;
  formatReward: (amount: number) => string;
  setDragOverMember: (memberId: string) => void;
}

export default function MemberSection({
  member,
  columnId,
  choresByAssignee,
  onDelete,
  dragOverMember,
  handleAssigneeDrop,
  handleAssigneeDragOver,
  handleAssigneeDragLeave,
  rewardTotals,
  formatReward,
  setDragOverMember,
}: MemberSectionProps) {
  // State to force re-renders on member color changes
  const [memberColor, setMemberColor] = useState(member.color);

  // Update memberColor when member.color changes
  useEffect(() => {
    if (memberColor !== member.color) {
      console.log(
        "Member color changed for",
        member.name,
        "from",
        memberColor,
        "to",
        member.color
      );
      setMemberColor(member.color);
    }
  }, [member.color, memberColor, member.name]);

  // Handle drag enter with local callback
  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      // Don't call stopPropagation() to allow event to bubble to column
      setDragOverMember(member.id);
    },
    [member, setDragOverMember]
  );

  // Handle showing the assignee dialog
  const handleAssignDialog = useCallback((choreId: string) => {
    const assigneeElement = document.getElementById("assignee-dialog");
    if (assigneeElement && assigneeElement instanceof HTMLDialogElement) {
      assigneeElement.setAttribute("data-chore-id", choreId);
      assigneeElement.showModal();
    }
  }, []);

  // Handle complete action based on the column
  const handleComplete = useCallback(
    (choreId: string) => {
      // Only add this for TODO column tasks
      if (columnId === "TODO") {
        const element = document.getElementById("assignee-dialog");
        if (element && element instanceof HTMLDialogElement) {
          element.setAttribute("data-chore-id", choreId);
          element.setAttribute("data-target-column", "DONE");
          element.showModal();
        }
      }
    },
    [columnId]
  );

  return (
    <div
      className={`mb-1 rounded-lg -mx-2 p-2 ${
        dragOverMember === member.id
          ? "bg-indigo-50 shadow-[inset_0_0_0_2px_rgba(99,102,241,0.2)]"
          : ""
      } transition-all duration-200`}
      onDrop={handleAssigneeDrop && ((e) => handleAssigneeDrop(e, member.id))}
      onDragOver={
        handleAssigneeDragOver && ((e) => handleAssigneeDragOver(e, member.id))
      }
      onDragEnter={handleDragEnter}
      onDragLeave={handleAssigneeDragLeave}
      data-drop-action="member"
      data-drop-target={member.id}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-light text-gray-700 flex items-center text-xl font-fancy">
          {member.avatar && member.avatar in AVATARS ? (
            <img
              src={AVATARS[member.avatar as keyof typeof AVATARS]}
              alt={member.name}
              className="w-12 h-12 object-cover"
            />
          ) : null}
          <span>{member.name}</span>
        </h3>

        <div className="flex-1 flex items-center">
          <div className="h-[1px] flex-1 bg-indigo-800 bg-opacity-15 mx-3"></div>

          {columnId === "DONE" && (
            <div
              className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                rewardTotals[member.id] > 0
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {rewardTotals[member.id] > 0
                ? formatReward(rewardTotals[member.id])
                : "£0.00"}
            </div>
          )}
        </div>
      </div>
      {choresByAssignee[member.id]?.length > 0 ? (
        <div className="space-y-3 mt-3">
          {choresByAssignee[member.id].map((chore) => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              onDelete={onDelete}
              onAssign={handleAssignDialog}
              onComplete={() => handleComplete(chore.id)}
              memberColor={memberColor}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
