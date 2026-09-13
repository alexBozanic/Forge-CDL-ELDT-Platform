const SAFE_AUTH_DESTINATIONS = new Set([
  "/dashboard",
  "/invitations/accept",
  "/password/update",
]);

export function safeAuthDestination(
  value: string | null,
  fallback = "/dashboard",
) {
  return value && SAFE_AUTH_DESTINATIONS.has(value) ? value : fallback;
}
