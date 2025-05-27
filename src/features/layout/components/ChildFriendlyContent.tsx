import { COLUMNS } from "../../chores/constants/columns";
import ColumnSection from "../../chores/components/ColumnSection";
import AssigneeDialog from "../../chores/components/AssigneeDialog";
import { useFamilyContext } from "../../family/hooks/useFamilyContext";
import { useChoresContext } from "../../chores/hooks/useChoresContext";
import ErrorState from "./ErrorState";
import AppHeader from "./AppHeader";
import Toast from "./Toast";
import { PlugsConnectedIcon } from "@phosphor-icons/react";
import LoadingState from "./LoadingState";
import clsx from "clsx";

// Main application component
export default function ChildFriendlyContent() {
  const {
    chores,
    isLoading: choresLoading,
    syncStatus,
    error: choresError,
    reassignChore,
  } = useChoresContext();

  const {
    familyMembers,
    isLoading: familyLoading,
    error: familyError,
  } = useFamilyContext();

  const loading = choresLoading || familyLoading;
  const error = choresError || familyError;

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
    <div className="min-h-screen overflow-x-hidden">
      <div className="md:my-12">
        <AppHeader size="large" />
      </div>

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
                draggable={false}
              />
            </div>
          ))}
        </div>
      </main>

      <AssigneeDialog onAssign={reassignChore} />

      <Toast
        isOpen={syncStatus === "offline"}
        icon={<PlugsConnectedIcon className="h-5 w-5" weight="fill" />}
      >
        You're offline. Changes will sync when reconnected.
      </Toast>
    </div>
  );
}
