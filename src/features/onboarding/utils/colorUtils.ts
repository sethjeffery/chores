import { RANDOM_COLORS } from "../constants/onboardingAvatars";

/**
 * Returns a random color from the RANDOM_COLORS array
 */
export function getRandomColor(): string {
  const randomIndex = Math.floor(Math.random() * RANDOM_COLORS.length);
  return RANDOM_COLORS[randomIndex];
}
