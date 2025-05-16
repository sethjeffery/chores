import { useEffect } from "react";

interface UseEscapeKeyOptions {
  enabled?: boolean;
}

export default function useEscapeKey(
  callback: () => void,
  options: UseEscapeKeyOptions = {}
) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && options.enabled) {
        callback();
      }
    };

    if (options.enabled) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      if (options.enabled) {
        document.removeEventListener("keydown", handleEscape);
      }
    };
  }, [callback, options.enabled]);
}
