import { useAccount } from "../hooks/useAccount";
import * as shareService from "../services/shareService";
import useSWR from "swr";
import { useState, useRef, useEffect } from "react";
import QRCode from "react-qr-code";
import {
  ArrowSquareOutIcon,
  CheckIcon,
  ClipboardTextIcon,
  ArrowsClockwiseIcon,
} from "@phosphor-icons/react";
import { supabase } from "../../../supabase";

export default function ShareManager() {
  const { activeAccount, isAdmin } = useAccount();
  const [copySuccess, setCopySuccess] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildError, setRebuildError] = useState<string | null>(null);
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
    data: shareToken,
    error,
    isLoading,
    mutate: mutateShareToken,
  } = useSWR(
    activeAccount && isAdmin ? `share-token-${activeAccount.id}` : null,
    async () => {
      if (!activeAccount) return null;
      return await shareService.getShareToken(activeAccount.id);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const shareUrl = `${window.location.origin}/shared/${shareToken?.token}`;

  // Copy share link to clipboard
  const copyShareLink = () => {
    if (!shareToken) return;

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

  // Rebuild share token
  const rebuildShareToken = async () => {
    if (!activeAccount || !isAdmin) return;

    // Confirm the action
    if (
      !confirm(
        "This will create a new child-friendly link. The old link will stop working. Continue?"
      )
    ) {
      return;
    }

    setIsRebuilding(true);
    setRebuildError(null);

    try {
      // Get the access token for authorization
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) throw new Error("No access token available");

      // Call the API to rebuild the share token
      const response = await fetch("/api/rebuild-share-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ account_id: activeAccount.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to rebuild share token");
      }

      // Refresh the share token data
      await mutateShareToken();
    } catch (err) {
      console.error("Failed to rebuild share token:", err);
      setRebuildError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsRebuilding(false);
    }
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
          <p className="text-red-700">
            {error.toString().includes("No guest user")
              ? "No guest user found for this account. Please try creating a new account."
              : "Failed to load child-friendly link."}
          </p>
        </div>
      )}

      {rebuildError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-md">
          <p className="text-red-700">{rebuildError}</p>
        </div>
      )}

      {isLoading || isRebuilding ? (
        <div className="py-4 flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
      ) : !shareToken ? (
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

              <div className="mt-3 flex flex-wrap gap-2">
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
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center"
                >
                  <ArrowSquareOutIcon className="h-4 w-4 mr-1" weight="bold" />
                  Open
                </a>

                <button
                  onClick={rebuildShareToken}
                  disabled={isRebuilding}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium flex items-center"
                >
                  <ArrowsClockwiseIcon className="h-4 w-4 mr-1" weight="bold" />
                  Rebuild Link
                </button>
              </div>

              <p className="text-sm text-gray-500 mt-2">
                If the share link stops working, click "Rebuild Link" to create
                a new one.
              </p>
            </div>

            <div className="bg-white p-2 rounded border">
              <QRCode value={shareUrl} size={100} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
