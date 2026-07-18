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
  try {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    if (!response.ok) {
      announceDailyProgressOwner(null);
      return getDailyProgressStorageKey();
    }
    const payload = (await response.json()) as { user?: { userId?: string; id?: string; aiCredits?: number } | null };
    const userId = payload.user?.userId || payload.user?.id || null;
    announceDailyProgressOwner(userId, payload.user?.aiCredits);
    return getDailyProgressStorageKey(userId);
  } catch {
    return getKnownDailyProgressStorageKey();
  }
}
