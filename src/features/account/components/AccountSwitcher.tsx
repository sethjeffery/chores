import { useState } from "react";
import { useAccount } from "../hooks/useAccount";
import type { Account } from "../services/accountService";

export default function AccountSwitcher() {
  const { accounts, activeAccount, selectAccount, createAccount } =
    useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Handle switching accounts
  const handleSelectAccount = (account: Account) => {
    selectAccount(account);
    setIsOpen(false);
  };

  // Handle creating a new account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;

    setIsCreating(true);
    try {
      await createAccount(newAccountName);
      setNewAccountName("");
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to create account:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!activeAccount) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-colors"
      >
        <span className="font-medium">{activeAccount.name}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-10 overflow-hidden">
          <div className="p-2">
            <h3 className="text-sm font-medium text-gray-600 mb-2 px-2">
              Your Accounts
            </h3>
            <div className="max-h-60 overflow-y-auto">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleSelectAccount(account)}
                  className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                    activeAccount.id === account.id
                      ? "bg-indigo-100 text-indigo-900"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {account.name}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-2 pt-2">
              <form onSubmit={handleCreateAccount} className="px-2">
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="New account name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isCreating}
                />
                <button
                  type="submit"
                  className="w-full flex justify-center items-center py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                  disabled={isCreating || !newAccountName.trim()}
                >
                  {isCreating ? (
                    <div className="h-5 w-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
