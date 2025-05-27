import { COLUMNS } from "../../chores/constants/columns";
import ColumnSection from "../../chores/components/ColumnSection";
import ChoreForm from "../../chores/components/ChoreForm";
import AssigneeDialog from "../../chores/components/AssigneeDialog";
import ShareManager from "../../account/components/ShareManager";
import UserMenu from "./UserMenu";
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
import AppHeader from "./AppHeader";
import Toast from "./Toast";
import { PlugsConnectedIcon } from "@phosphor-icons/react";
import LoadingState from "./LoadingState";
import clsx from "clsx";

const Spinner = () => (
  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500 mr-1" />
);

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
  const backgroundSyncing = !backgroundSaving && syncStatus === "syncing";

  // Render loading state
  if (loading && (chores.length === 0 || familyMembers.length === 0)) {
    return <LoadingState />;
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
        <AppHeader>
          <div className="absolute right-4 top-4">
            <UserMenu
              onOpenFamilySettings={() => setIsFamilySettingsOpen(true)}
              onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
              onOpenShareSettings={() => setIsShareSettingsOpen(true)}
            />
          </div>
        </AppHeader>

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
            <ChoreForm onAdd={addChore} />
          </div>

          {/* Mobile-swipable container */}
          <div className="column-container grid grid-cols-[calc(100vw-4rem)_calc(100vw-4rem)_calc(100vw-4rem)] md:grid-cols-[calc(66vw-2rem)_calc(66vw-2rem)_calc(66vw-2rem)] lg:grid-cols-3 pb-8 overflow-x-auto scrollbar-hide lg:overflow-visible snap-x snap-mandatory -mx-4 sm:-mx-6 md:-mx-8 lg:mx-0">
            {COLUMNS.map((column, index) => (
              <div
                className={clsx(
                  "snap-center",
                  index === 0 && "pl-4 pr-2 sm:pl-6 md:pl-8 lg:px-0",
                  index === COLUMNS.length - 1 &&
                    "pl-2 pr-4 sm:pr-6 md:pr-8 lg:px-0",
                  index !== 0 && index !== COLUMNS.length - 1 && "px-2 lg:px-0"
                )}
                key={column.id}
              >
                <ColumnSection
                  title={column.title}
                  columnId={column.id}
                  chores={chores}
                  onDelete={deleteChore}
                  onDrop={moveChore}
                  onReassign={reassignChore}
                />
              </div>
            ))}
          </div>
        </main>

        {/* Dialog for assigning chores */}
        <AssigneeDialog onAssign={reassignChore} />

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
        <Toast isOpen={backgroundSaving} icon={<Spinner />}>
          Saving changes...
        </Toast>

        {/* Sync status indicator */}
        <Toast isOpen={backgroundSyncing} icon={<Spinner />}>
          Syncing changes...
        </Toast>

        {/* Offline indicator */}
        <Toast
          isOpen={syncStatus === "offline"}
          icon={<PlugsConnectedIcon className="h-5 w-5" weight="fill" />}
        >
          You're offline. Changes will sync when reconnected.
        </Toast>
      </div>
    </DragProvider>
  );
}
