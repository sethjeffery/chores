import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../../supabase";
import * as choreService from "../services/choreService";
import * as familyService from "../../family/services/familyService";
import * as shareService from "../../account/services/shareService";
import { COLUMNS } from "../constants/columns";
import type { Chore, FamilyMember, ColumnType } from "../../../types";
import { useParams, useNavigate } from "react-router-dom";

// Define the extended column type with chores array and byMember grouping
interface ExtendedColumn {
  id: ColumnType;
  title: string;
  description: string;
  color?: string;
  chores: Chore[];
  byMember: Record<string, Chore[]>;
}

// Shared chores list component that doesn't require login
export default function SharedChoresList() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chores, setChores] = useState<Chore[]>([]);
  const [account, setAccount] = useState<{ id: string; name: string } | null>(
    null
  );
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  // Load account, chores, and family members using the token
  useEffect(() => {
    let isMounted = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    const loadData = async () => {
      if (!token) {
        setError("Invalid share token");
        setIsLoading(false);
        return;
      }

      try {
        // Set up token-based auth
        shareService.setupTokenAuth(token);

        // Get account details from the token
        const accountDetails = await shareService.getAccountByToken(token);

        if (!accountDetails) {
          setError("Invalid share token");
          setIsLoading(false);
          return;
        }

        if (isMounted) {
          setAccount(accountDetails);

          // Load chores
          const choresList = await choreService.getChores(accountDetails.id);
          setChores(choresList);

          // Load family members
          const membersList = await familyService.getFamilyMembers(
            accountDetails.id
          );
          setFamilyMembers(membersList);

          // Set up realtime subscription for chores
          realtimeChannel = supabase
            .channel(`shared-chores-${accountDetails.id}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "chores",
                filter: `account_id=eq.${accountDetails.id}`,
              },
              (payload) => {
                if (!isMounted) return;

                // Update chores based on realtime changes
                const eventType = payload.eventType;
                const newRecord = payload.new as choreService.ChoreTable;
                const oldRecord =
                  payload.old as Partial<choreService.ChoreTable>;

                if (eventType === "INSERT" && newRecord) {
                  setChores((current) => [
                    ...current,
                    choreService.toChore(newRecord),
                  ]);
                } else if (eventType === "UPDATE" && newRecord) {
                  setChores((current) =>
                    current.map((chore) =>
                      chore.id === newRecord.id
                        ? choreService.toChore(newRecord)
                        : chore
                    )
                  );
                } else if (eventType === "DELETE" && oldRecord?.id) {
                  setChores((current) =>
                    current.filter((chore) => chore.id !== oldRecord.id)
                  );
                }
              }
            )
            .subscribe();

          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading shared view:", err);
        if (isMounted) {
          setError("Failed to load shared todo list");
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [token, navigate]);

  // Organize chores by columns and members
  const columns = useMemo<ExtendedColumn[]>(() => {
    return COLUMNS.map((column) => {
      const columnChores = chores.filter((chore) => chore.column === column.id);

      if (column.id === "IDEAS") {
        return {
          ...column,
          chores: columnChores,
          byMember: {},
        };
      }

      // Group chores by family member
      const byMember = columnChores.reduce<Record<string, Chore[]>>(
        (acc, chore) => {
          const assigneeId = chore.assignee || "unassigned";
          if (!acc[assigneeId]) {
            acc[assigneeId] = [];
          }
          acc[assigneeId].push(chore);
          return acc;
        },
        {}
      );

      return {
        ...column,
        chores: columnChores,
        byMember,
      };
    });
  }, [chores]);

  // Display a reward badge
  const RewardBadge = ({ amount }: { amount: number | null | undefined }) => {
    if (!amount) return null;

    return (
      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <span role="img" aria-label="coins" className="mr-1">
          🪙
        </span>
        {amount}
      </div>
    );
  };

  // Calculate total rewards for each family member
  const rewardTotals = useMemo(() => {
    return familyMembers.reduce<Record<string, number>>((acc, member) => {
      // Calculate total rewards from DONE column
      const doneChores = chores.filter(
        (chore) => chore.column === "DONE" && chore.assignee === member.id
      );

      const total = doneChores.reduce(
        (sum, chore) => sum + (chore.reward || 0),
        0
      );

      acc[member.id] = total;
      return acc;
    }, {});
  }, [chores, familyMembers]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-7xl">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">
            Loading shared todo list...
          </h1>
          <div className="flex justify-center">
            <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-7xl">
          <h1 className="text-3xl font-bold text-white mb-4 text-center">
            Error
          </h1>
          <div className="bg-white p-6 rounded-xl shadow-cartoon">
            <p className="text-red-600 mb-4">{error}</p>
            <p>This link may be invalid.</p>
            <div className="mt-6 flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600">
      <header className="px-4 py-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white font-fancy cartoon-text-shadow">
          {account?.name || "Family"}'s Todo List
        </h1>
        <p className="text-white mt-2 opacity-80">Child-friendly Mode</p>
      </header>

      <main className="px-4 pb-8">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column) => (
            <div
              key={column.id}
              className="bg-white rounded-xl shadow-cartoon overflow-hidden flex flex-col"
            >
              <div
                className="px-4 py-3 text-white font-medium text-lg"
                style={{ backgroundColor: column.color || "#6366F1" }}
              >
                {column.title}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {column.id === "IDEAS" ? (
                  // Ideas column (not grouped by member)
                  <div className="space-y-3">
                    {column.chores.length > 0 ? (
                      column.chores.map((chore) => (
                        <div
                          key={chore.id}
                          className="bg-white border rounded-lg p-3 shadow-sm"
                        >
                          <div className="flex justify-between">
                            <div className="font-medium">
                              {chore.icon && (
                                <span className="mr-2" role="img">
                                  {chore.icon}
                                </span>
                              )}
                              {chore.title}
                            </div>
                            {chore.reward && (
                              <RewardBadge amount={chore.reward} />
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-xs italic py-2 bg-gray-50 rounded-lg px-3 text-center">
                        No chore ideas yet
                      </p>
                    )}
                  </div>
                ) : (
                  // Other columns (grouped by members)
                  <div className="space-y-6">
                    {/* Show each family member section */}
                    {familyMembers.map((member) => {
                      const memberChores = column.byMember[member.id] || [];
                      if (memberChores.length === 0) return null;

                      return (
                        <div key={member.id} className="mb-4">
                          <div className="flex items-center mb-2">
                            <div
                              className="w-6 h-6 rounded-full mr-2 flex-shrink-0"
                              style={{
                                backgroundColor: member.color || "#CBD5E0",
                              }}
                            />
                            <h3 className="font-medium">{member.name}</h3>

                            {column.id === "DONE" &&
                              rewardTotals[member.id] > 0 && (
                                <div className="ml-auto">
                                  <RewardBadge
                                    amount={rewardTotals[member.id]}
                                  />
                                </div>
                              )}
                          </div>

                          <div className="space-y-2 pl-8">
                            {memberChores.map((chore) => (
                              <div
                                key={chore.id}
                                className="bg-white border rounded-lg p-3 shadow-sm"
                              >
                                <div className="flex justify-between">
                                  <div className="font-medium">
                                    {chore.icon && (
                                      <span className="mr-2" role="img">
                                        {chore.icon}
                                      </span>
                                    )}
                                    {chore.title}
                                  </div>
                                  {chore.reward && (
                                    <RewardBadge amount={chore.reward} />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Show unassigned chores if any */}
                    {column.byMember["unassigned"] &&
                      column.byMember["unassigned"].length > 0 && (
                        <div>
                          <h3 className="font-medium text-gray-500 mb-2">
                            Unassigned
                          </h3>
                          <div className="space-y-2">
                            {column.byMember["unassigned"].map((chore) => (
                              <div
                                key={chore.id}
                                className="bg-white border rounded-lg p-3 shadow-sm"
                              >
                                <div className="flex justify-between">
                                  <div className="font-medium">
                                    {chore.icon && (
                                      <span className="mr-2" role="img">
                                        {chore.icon}
                                      </span>
                                    )}
                                    {chore.title}
                                  </div>
                                  {chore.reward && (
                                    <RewardBadge amount={chore.reward} />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Show "empty" message if no chores in this column */}
                    {Object.keys(column.byMember).length === 0 && (
                      <p className="text-gray-400 text-xs italic py-2 bg-gray-50 rounded-lg px-3 text-center">
                        No chores in this column
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      <footer className="pb-8 pt-2 text-center">
        <button
          onClick={() => navigate("/")}
          className="text-white/70 hover:text-white underline text-sm"
        >
          Go to Login
        </button>
      </footer>
    </div>
  );
}
