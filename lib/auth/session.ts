import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { Permission, Role } from "./permissions";
import { getPermissionsForRoles, hasPermission, isRole } from "./permissions";

export const AUTH_COOKIE_NAME = "nihongo_access_token";

export type AuthSession = {
  userId: string;
  username: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
};

type JwtPayload = {
  sub: string;
  username: string;
  email: string;
  roles: string[];
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Missing JWT_SECRET in environment variables.");
  }

  return secret;
}

export function signSessionToken(payload: Omit<AuthSession, "permissions">) {
  return jwt.sign(
    {
      username: payload.username,
      email: payload.email,
      roles: payload.roles,
    },
    getJwtSecret(),
    {
      subject: payload.userId,
      expiresIn: "7d",
    },
  );
}

export function verifySessionToken(token: string): AuthSession {
  const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
  const roles = payload.roles.filter(isRole);

  return {
    userId: payload.sub,
    username: payload.username,
    email: payload.email,
    roles,
    permissions: getPermissionsForRoles(roles),
  };
}

export async function getAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const session = await getAuthSession();

  if (!session) {
    throw new AuthError("UNAUTHORIZED", "Bạn cần đăng nhập để thực hiện thao tác này.");
  }

  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAuth();

  if (!hasPermission(session.roles, permission)) {
    throw new AuthError("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
  }

  return session;
}

export class AuthError extends Error {
  constructor(
    public code: "UNAUTHORIZED" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
  }
}
