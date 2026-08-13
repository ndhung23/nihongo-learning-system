const userMarkerKey = "nihongo-daily-progress-user";
// This event only synchronizes the local daily/Gacha owner. It must stay
// separate from `nihongo-auth-changed`, which triggers an account refetch.
export const dailyAuthChangedEvent = "nihongo-daily-owner-changed";

export function getDailyProgressStorageKey(userId?: string | null) {
  return `nihongo-daily-progress:${userId || "guest"}`;
}

export function getKnownDailyProgressStorageKey() {
  if (typeof window === "undefined") return getDailyProgressStorageKey();
  return getDailyProgressStorageKey(window.localStorage.getItem(userMarkerKey));
}

export function announceDailyProgressOwner(
  userId?: string | null,
  aiCredits?: number,
  pendingGachaTickets?: number,
  coins?: number,
) {
  if (typeof window === "undefined") return;
  if (userId) window.localStorage.setItem(userMarkerKey, userId);
  else window.localStorage.removeItem(userMarkerKey);

  window.dispatchEvent(
    new CustomEvent(dailyAuthChangedEvent, {
      detail: { storageKey: getDailyProgressStorageKey(userId), aiCredits, pendingGachaTickets, coins },
    }),
  );
}

export async function resolveDailyProgressStorageKey() {
  // Topbar owns the single /api/auth/me request and announces any account
  // change. Reuse the last known owner here to avoid a duplicate DB request
  // every time the home screen mounts.
  return getKnownDailyProgressStorageKey();
}
