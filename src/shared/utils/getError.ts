export function getError(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return String(error);
}
