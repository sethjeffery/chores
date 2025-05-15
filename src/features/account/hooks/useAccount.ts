import { useContext } from "react";
import { AccountContext } from "../contexts/AccountContext";

// Hook to use the account context
export const useAccount = () => {
  const context = useContext(AccountContext);

  if (context === undefined) {
    throw new Error("useAccount must be used within an AccountProvider");
  }

  return context;
};
