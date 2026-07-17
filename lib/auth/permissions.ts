export const roles = ["user", "vip", "creator", "admin"] as const;

export type Role = (typeof roles)[number];

export const permissions = [
  "course:read",
  "course:enroll",
  "course:create",
  "course:update:own",
  "course:moderate",
  "flashcard:read",
  "flashcard:create",
  "flashcard:update:own",
  "quiz:take",
  "review:create",
  "feedback:create",
  "ai:use",
  "payment:manage:own",
  "admin:user:read",
  "admin:user:write",
  "admin:course:read",
  "admin:course:write",
  "admin:feedback:read",
  "admin:stats:read",
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<Role, Permission[]> = {
  user: [
    "course:read",
    "course:enroll",
    "flashcard:read",
    "flashcard:create",
    "flashcard:update:own",
    "quiz:take",
    "review:create",
    "feedback:create",
  ],
  vip: [
    "course:read",
    "course:enroll",
    "flashcard:read",
    "flashcard:create",
    "flashcard:update:own",
    "quiz:take",
    "review:create",
    "feedback:create",
    "ai:use",
  ],
  creator: [
    "course:read",
    "course:enroll",
    "course:create",
    "course:update:own",
    "flashcard:read",
    "flashcard:create",
    "flashcard:update:own",
    "quiz:take",
    "review:create",
    "feedback:create",
    "payment:manage:own",
  ],
  admin: [...permissions],
};

export function getPermissionsForRoles(userRoles: Role[]) {
  return Array.from(new Set(userRoles.flatMap((role) => rolePermissions[role] ?? [])));
}

export function hasRole(userRoles: Role[], requiredRole: Role) {
  return userRoles.includes("admin") || userRoles.includes(requiredRole);
}

export function hasPermission(userRoles: Role[], permission: Permission) {
  return getPermissionsForRoles(userRoles).includes(permission);
}

export function isRole(value: string): value is Role {
  return roles.includes(value as Role);
}
