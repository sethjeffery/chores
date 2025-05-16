import { useAccount } from "../hooks/useAccount";
import * as shareService from "../services/shareService";
import useSWR from "swr";
import { useState, useRef, useEffect } from "react";
import QRCode from "react-qr-code";
import {
  ArrowSquareOutIcon,
  CheckIcon,
  ClipboardTextIcon,
} from "@phosphor-icons/react";

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
                      <CheckIcon className="h-4 w-4 mr-1" weight="bold" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardTextIcon
                        className="h-4 w-4 mr-1"
                        weight="fill"
                      />
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
                  <ArrowSquareOutIcon className="h-4 w-4 mr-1" weight="bold" />
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
