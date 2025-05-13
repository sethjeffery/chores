import { useState, useEffect } from "react";

/**
 * Custom hook to detect if the current device supports touch input
 * @returns boolean indicating if the device is a touch device
 */
export function useTouchDevice(): boolean {
  // More comprehensive initial check that works on more devices
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
    // Check for touch capability using multiple methods
    return (
      // Standard property
      "ontouchstart" in window ||
      // IE/Edge specific
      navigator.maxTouchPoints > 0 ||
      // Check for touch events API
      (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
      // Use user agent as fallback for some mobile browsers
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    );
  });

  useEffect(() => {
    const detectTouch = () => {
      setIsTouchDevice(true);
    };

    // Force touch mode for certain mobile user agents
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    ) {
      setIsTouchDevice(true);
    }

    // Add event listener to detect touch if it happens after initial load
    window.addEventListener("touchstart", detectTouch, { once: true });

    return () => {
      window.removeEventListener("touchstart", detectTouch);
    };
  }, []);

  return isTouchDevice;
}
