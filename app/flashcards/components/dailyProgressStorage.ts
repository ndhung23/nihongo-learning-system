const userMarkerKey = "nihongo-daily-progress-user";
export const dailyAuthChangedEvent = "nihongo-auth-changed";

export function getDailyProgressStorageKey(userId?: string | null) {
  return `nihongo-daily-progress:${userId || "guest"}`;
}

export function getKnownDailyProgressStorageKey() {
  if (typeof window === "undefined") return getDailyProgressStorageKey();
  return getDailyProgressStorageKey(window.localStorage.getItem(userMarkerKey));
}

export function announceDailyProgressOwner(userId?: string | null, aiCredits?: number) {
  if (typeof window === "undefined") return;
  if (userId) window.localStorage.setItem(userMarkerKey, userId);
  else window.localStorage.removeItem(userMarkerKey);

  window.dispatchEvent(
    new CustomEvent(dailyAuthChangedEvent, {
      detail: { storageKey: getDailyProgressStorageKey(userId), aiCredits },
    }),
  );
}

export async function resolveDailyProgressStorageKey() {
  // Topbar owns the single /api/auth/me request and announces any account
  // change. Reuse the last known owner here to avoid a duplicate DB request
  // every time the home screen mounts.
  return getKnownDailyProgressStorageKey();
}
