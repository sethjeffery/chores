import { useAccount } from "../hooks/useAccount";
import * as shareService from "../services/shareService";
import useSWR from "swr";
import { useState, useRef, useEffect } from "react";
import QRCode from "react-qr-code";

export default function ShareManager() {
  const { activeAccount, isAdmin } = useAccount();
  const [copySuccess, setCopySuccess] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Use SWR to fetch and cache share token
  const {
    data: token,
    error,
    isLoading,
  } = useSWR(
    activeAccount && isAdmin ? `share-token-${activeAccount.id}` : null,
    async () => {
      if (!activeAccount) return null;
      return await shareService.getOrCreateShareToken(activeAccount.id);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  // Copy share link to clipboard
  const copyShareLink = () => {
    if (!token) return;

    const shareUrl = `${window.location.origin}/shared/${token.token}`;

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        setCopySuccess(true);

        // Set a new timeout
        timeoutRef.current = setTimeout(() => {
          setCopySuccess(false);
          timeoutRef.current = null;
        }, 3000);
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
        alert("Failed to copy link to clipboard.");
      });
  };

  // Format date for display
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!activeAccount || !isAdmin) return null;

  return (
    <>
      <p className="text-gray-600 mb-6">
        Share this link to provide a simplified view of your family's todo list
        that's perfect for children. This mode has limited permissions—kids can
        mark their tasks as complete but can't add, edit, or delete tasks. It's
        ideal for family computers or children's devices.
      </p>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-md">
          <p className="text-red-700">Failed to load child-friendly link.</p>
        </div>
      )}

      {isLoading ? (
        <div className="py-4 flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
      ) : !token ? (
        <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
          Could not generate child-friendly link. Please try again later.
        </p>
      ) : (
        <div className="border rounded-lg overflow-hidden p-4 bg-gray-50">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <h4 className="text-lg font-medium mb-2">
                Your Child-friendly Link
              </h4>

              <div className="mt-1 text-sm text-gray-500">
                <div>Created: {formatDate(token.createdAt)}</div>
                {token.lastUsedAt && (
                  <div>Last used: {formatDate(token.lastUsedAt)}</div>
                )}
              </div>

              <div className="mt-3 flex space-x-2">
                <button
                  onClick={copyShareLink}
                  className={`px-3 py-1.5 ${
                    copySuccess
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  } text-white rounded text-sm font-medium transition-colors flex items-center`}
                >
                  {copySuccess ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>

                <a
                  href={`${window.location.origin}/shared/${token.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                  Open
                </a>
              </div>
            </div>

            <div className="bg-white p-2 rounded border">
              <QRCode
                value={`${window.location.origin}/shared/${token.token}`}
                size={100}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
