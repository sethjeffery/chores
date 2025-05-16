import { COLUMNS } from "../../chores/constants/columns";
import ColumnSection from "../../chores/components/ColumnSection";
import ChoreForm from "../../chores/components/ChoreForm";
import AssigneeDialog from "../../chores/components/AssigneeDialog";
import ShareManager from "../../account/components/ShareManager";
import UserMenu from "./UserMenu";
import type { ColumnType } from "../../../types";
import { useEffect, useCallback, useState } from "react";
import { useFamilyContext } from "../../family/hooks/useFamilyContext";
import DragProvider from "../../chores/providers/DragProvider";
import { useAccount } from "../../account/hooks/useAccount";
import { useChoresContext } from "../../chores/hooks/useChoresContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import ErrorState from "./ErrorState";
import ModalDialog from "./ModalDialog";
import AccountUsersManager from "../../account/components/AccountUsersManager";
import FamilyMemberForm from "../../family/components/FamilyMemberForm";
import { PlugsConnectedIcon } from "@phosphor-icons/react";

// Main application component
export default function AppContent() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    chores,
    isLoading: choresLoading,
    backgroundSaving,
    syncStatus,
    error: choresError,
    addChore,
    deleteChore,
    moveChore,
    reassignChore,
    updateChore,
  } = useChoresContext();

  const {
    familyMembers,
    isLoading: familyLoading,
    error: familyError,
  } = useFamilyContext();

  const {
    activeAccount,
    isLoading: accountLoading,
    error: accountError,
  } = useAccount();

  // Redirect to welcome page if user has no account
  useEffect(() => {
    if (!accountLoading && user && !activeAccount) {
      navigate("/welcome");
    }
  }, [accountLoading, user, activeAccount, navigate]);

  // Track settings modal state
  const [isFamilySettingsOpen, setIsFamilySettingsOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isShareSettingsOpen, setIsShareSettingsOpen] = useState(false);

  // Handle any existing chores assigned to people not in the family members list
  useEffect(() => {
    if (
      choresLoading ||
      familyLoading ||
      chores.length === 0 ||
      familyMembers.length === 0
    )
      return;

    // Find any chores assigned to IDs not in our family members list
    const validFamilyIds = familyMembers.map((member) => member.id);
    const invalidAssigneeChores = chores.filter(
      (chore) => chore.assignee && !validFamilyIds.includes(chore.assignee)
    );

    // Move those chores to IDEAS column and remove assignee
    if (invalidAssigneeChores.length > 0) {
      invalidAssigneeChores.forEach((chore) => {
        updateChore(chore.id, { assignee: null, column: "IDEAS" });
      });
    }
  }, [chores, familyMembers, updateChore, choresLoading, familyLoading]);

  // Handle drop event
  const handleDrop = useCallback(
    (choreId: string, column: "IDEAS" | "TODO" | "DONE") => {
      moveChore(choreId, column);
    },
    [moveChore]
  );

  // Handle reassign event
  const handleReassign = useCallback(
    (choreId: string, memberId: string, targetColumn?: ColumnType) => {
      reassignChore(choreId, memberId, targetColumn);
    },
    [reassignChore]
  );

  const handleCloseFamilyDialog = useCallback(() => {
    setIsFamilySettingsOpen(false);
  }, [setIsFamilySettingsOpen]);

  const handleCloseAccountDialog = useCallback(() => {
    setIsAccountSettingsOpen(false);
  }, [setIsAccountSettingsOpen]);

  const handleCloseShareDialog = useCallback(() => {
    setIsShareSettingsOpen(false);
  }, [setIsShareSettingsOpen]);

  const loading = choresLoading || familyLoading || accountLoading;
  const error = choresError || familyError || accountError;

  // Render loading state
  if (loading && (chores.length === 0 || familyMembers.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
        <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-medium text-gray-700">Loading ...</h2>
          <p className="text-gray-500 mt-2">Getting all the bunnies ready...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (
    error &&
    !loading &&
    (chores.length === 0 || familyMembers.length === 0)
  ) {
    return <ErrorState error={error} />;
  }

  return (
    <DragProvider>
      <div className="min-h-screen overflow-x-hidden">
        <header className="w-full mb-2 md:mt-2 md:mb-3">
          <div className="relative flex flex-row md:flex-col md:justify-center items-start md:items-center px-4 py-3 max-w-7xl mx-auto">
            <div className="absolute right-4 top-4">
              <UserMenu
                onOpenFamilySettings={() => setIsFamilySettingsOpen(true)}
                onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
                onOpenShareSettings={() => setIsShareSettingsOpen(true)}
              />
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white font-fancy cartoon-text-shadow flex items-center">
              <img
                src="/pocket-bunnies-head.png"
                alt="Pocket Bunny logo"
                className="w-10 h-10 mr-2 md:hidden"
              />
              Pocket Bunnies
            </h1>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              <p className="font-medium">Error: {error}</p>
              <p className="mt-1">
                Your changes might not be saved. Please try again or reload the
                page.
              </p>
            </div>
          )}

          <div className="mb-8 max-w-md mx-auto">
            <ChoreForm
              onAdd={(title, assigneeId, reward, icon) =>
                addChore(title, assigneeId, reward, icon)
              }
            />
          </div>

          {/* Column container with enhanced card styles */}
          <div className="column-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7 pb-8">
            {COLUMNS.map((column) => (
              <ColumnSection
                key={column.id}
                title={column.title}
                columnId={column.id}
                chores={chores}
                onDelete={deleteChore}
                onDrop={handleDrop}
                onReassign={handleReassign}
              />
            ))}
          </div>
        </main>

        {/* Dialog for assigning chores */}
        <AssigneeDialog onAssign={handleReassign} />

        {/* Family Member settings dialog */}
        <ModalDialog
          isOpen={isFamilySettingsOpen}
          onClose={handleCloseFamilyDialog}
          title="Family Settings"
        >
          <FamilyMemberForm />
        </ModalDialog>

        {/* Account settings dialog */}
        <ModalDialog
          isOpen={isAccountSettingsOpen}
          onClose={handleCloseAccountDialog}
          title="Account Settings"
        >
          <AccountUsersManager />
        </ModalDialog>

        {/* Share settings dialog */}
        <ModalDialog
          isOpen={isShareSettingsOpen}
          onClose={handleCloseShareDialog}
          title="Share Todo List"
        >
          <ShareManager />
        </ModalDialog>

        {/* Toast notifications for sync status */}
        {backgroundSaving && (
          <div className="fixed bottom-4 right-4 flex items-center z-50 animate-fade-in">
            <div className="bg-white text-gray-700 shadow-lg rounded-lg py-2 px-4 flex items-center space-x-3 border-l-4 border-indigo-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500 mr-1"></div>
              <span className="text-sm font-medium">Saving changes...</span>
            </div>
          </div>
        )}

        {/* Sync status indicator */}
        {!backgroundSaving && syncStatus === "syncing" && (
          <div className="fixed bottom-4 right-4 flex items-center z-50 animate-fade-in">
            <div className="bg-white text-gray-700 shadow-lg rounded-lg py-2 px-4 flex items-center space-x-3 border-l-4 border-blue-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-1"></div>
              <span className="text-sm font-medium">Syncing changes...</span>
            </div>
          </div>
        )}

        {/* Offline indicator */}
        {syncStatus === "offline" && (
          <div className="fixed bottom-4 right-4 flex items-center z-50 animate-fade-in">
            <div className="bg-white text-gray-700 shadow-lg rounded-lg py-2 px-4 flex items-center space-x-3 border-l-4 border-yellow-500">
              <PlugsConnectedIcon className="h-5 w-5" weight="fill" />
              <span className="text-sm font-medium">
                You're offline. Changes will sync when reconnected.
              </span>
            </div>
          </div>
        )}
      </div>
    </DragProvider>
  );
}
