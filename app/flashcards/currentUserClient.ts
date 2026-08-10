export type CurrentUser = {
  userId?: string;
  id?: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  roles: string[];
  permissions?: string[];
  aiCredits?: number;
  pendingGachaTickets?: number;
  vipUntil?: string;
  isVip?: boolean;
};

let currentUserRequest: Promise<CurrentUser | null> | null = null;

export function loadCurrentUser() {
  currentUserRequest ??= fetch("/api/auth/me", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = (await response.json()) as { user: CurrentUser };
      return payload.user;
    })
    .catch(() => null);

  return currentUserRequest;
}

export function invalidateCurrentUser() {
  currentUserRequest = null;
}
