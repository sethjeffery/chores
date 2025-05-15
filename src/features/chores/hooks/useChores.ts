// This is now just an alias to useChoresContext for backward compatibility
import { useChoresContext } from "./useChoresContext";
import type { ChoresContextType } from "../contexts/ChoresContext";

/**
 * @deprecated This hook is deprecated in favor of useChoresContext.
 * It's maintained for backward compatibility only.
 */
export const useChores = (): ChoresContextType => {
  return useChoresContext();
};
