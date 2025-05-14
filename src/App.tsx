import { useChores, COLUMNS } from "./store";
import ColumnSection from "./components/ColumnSection";
import ChoreForm from "./components/ChoreForm";
import DragContext from "./contexts/DragContext";
import AssigneeDialog from "./components/AssigneeDialog";
import FamilyMemberForm from "./components/FamilyMemberForm";
import type { ColumnType } from "./types";
import { useEffect, useCallback, useState } from "react";
import { FamilyProvider, useFamilyContext } from "./contexts/FamilyContext";

// Main application component
function AppContent() {
  const {
    chores,
    loading: choresLoading,
    backgroundSaving,
    syncStatus,
    error: choresError,
    addChore,
    deleteChore,
    moveChore,
    reassignChore,
    updateChore,
  } = useChores();

  const {
    familyMembers,
    loading: familyLoading,
    error: familyError,
  } = useFamilyContext();

  // Track dragging state
  const [isDragging, setIsDragging] = useState(false);

  // Track settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Add animation styles for settings dialog
  useEffect(() => {
    // Create a style element for the animation
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      @keyframes dialogFadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(styleEl);

    // Clean up
    return () => {
      if (document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
      }
    };
  }, []);

  // Handle escape key to close settings modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isSettingsOpen) {
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [isSettingsOpen]);

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

  // Handle native drag start
  const handleDragStart = useCallback((event: React.DragEvent) => {
    // Get the chore ID from the dragged element's data attribute
    const el = event.currentTarget as HTMLElement;
    const choreId = el.dataset.choreId;

    if (choreId) {
      // Add a global class to the body to track drag state
      document.body.classList.add("dragging-active");
      setIsDragging(true);

      // Set a custom drag image if needed
      try {
        const dragImage = el.cloneNode(true) as HTMLElement;
        document.body.appendChild(dragImage);

        // Style the drag image
        dragImage.style.width = `${el.offsetWidth}px`;
        dragImage.style.opacity = "0.85";
        dragImage.style.pointerEvents = "none";
        dragImage.style.position = "absolute";
        dragImage.style.top = "-1000px";
        dragImage.style.backgroundColor = "white";
        dragImage.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1)";
        dragImage.style.transform = "rotate(-2deg) scale(0.95)";

        // Set the drag image
        event.dataTransfer.setDragImage(dragImage, 20, 20);

        // Remove the temporary element
        setTimeout(() => {
          if (document.body.contains(dragImage)) {
            document.body.removeChild(dragImage);
          }
        }, 0);
      } catch (e) {
        console.warn("Error setting drag image", e);
      }
    }
  }, []);

  // Handle native drag over
  const handleDragOver = useCallback((event: React.DragEvent) => {
    // Required to allow dropping
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Handle native drag end
  const handleDragEnd = useCallback(() => {
    // Remove the global class
    document.body.classList.remove("dragging-active");
    setIsDragging(false);
  }, []);

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

  const loading = choresLoading || familyLoading;
  const error = choresError || familyError;

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
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
        <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full text-center">
          <div className="bg-red-100 p-3 rounded-full inline-flex mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-gray-700">
            Error Loading Data
          </h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <div className="mt-4 bg-yellow-50 p-3 rounded-lg text-yellow-800 text-sm text-left">
            <p className="font-medium">Possible causes:</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>Supabase tables not created - Check Supabase dashboard</li>
              <li>
                Database access issues - Check your Supabase configuration
              </li>
              <li>
                Network connectivity issues - Check your internet connection
              </li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <DragContext.Provider
      value={{
        onDragStart: handleDragStart,
        onDragOver: handleDragOver,
        onDragEnd: handleDragEnd,
      }}
    >
      <div
        className={`min-h-screen overflow-x-hidden ${
          isDragging ? "app-dragging" : ""
        }`}
      >
        <header className="w-full backdrop-blur-sm mb-6">
          <div className="flex md:justify-center items-center px-4 py-3 max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-fancy text-shadow flex items-center">
              <img
                src="/pocket-bunnies-head.png"
                alt="Pocket Bunny logo"
                className="w-10 h-10 mr-2 md:hidden"
              />
              Pocket Bunnies
            </h1>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="absolute right-4 bg-white bg-opacity-40 backdrop-blur-md p-2 rounded-full 
                hover:bg-opacity-70 hover:rotate-45 transition-all duration-300 shadow-md 
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
              aria-label="Settings"
            >
              <span className="text-xl" aria-hidden="true">
                ⚙️
              </span>
            </button>
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
        {isSettingsOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setIsSettingsOpen(false)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
              style={{ animation: "dialogFadeIn 0.2s ease-out" }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-5 relative">
                  <h2 className="text-2xl font-bold text-indigo-800 font-fancy">
                    Family Settings
                  </h2>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                    aria-label="Close"
                  >
                    &times;
                  </button>
                </div>
                <p className="text-gray-600 mb-6">
                  Manage your family members, their avatars, and colors.
                </p>
                <FamilyMemberForm isInModal={true} />
              </div>
            </div>
          </div>
        )}

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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-yellow-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">
                You're offline. Changes will sync when reconnected.
              </span>
            </div>
          </div>
        )}
      </div>
    </DragContext.Provider>
  );
}

// App component that provides the Family context
function App() {
  return (
    <FamilyProvider>
      <AppContent />
    </FamilyProvider>
  );
}

export default App;
