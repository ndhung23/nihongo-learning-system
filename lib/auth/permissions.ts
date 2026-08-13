export const systemRoleCodes = ["user", "vip", "creator", "admin"] as const;
export const roles = systemRoleCodes;
export type Role = string;

export const applicationPermissions = [
  "course:read", "course:enroll", "course:create", "course:update:own", "course:moderate",
  "flashcard:read", "flashcard:create", "flashcard:update:own", "quiz:take", "review:create",
  "feedback:create", "ai:use", "payment:manage:own",
] as const;

export const adminPermissionDefinitions = [
  ["admin:dashboard:read", "dashboard", "read", "Xem Dashboard", "Tổng quan"],
  ["admin:user:read", "user", "read", "Xem người dùng", "Tổng quan"],
  ["admin:user:create", "user", "create", "Thêm người dùng", "Tổng quan"],
  ["admin:user:update", "user", "update", "Sửa người dùng", "Tổng quan"],
  ["admin:user:delete", "user", "delete", "Xóa người dùng", "Tổng quan"],
  ["admin:payment:read", "payment", "read", "Xem thanh toán", "Tổng quan"],
  ["admin:payment:approve", "payment", "approve", "Duyệt thanh toán", "Tổng quan"],
  ["admin:affiliate-product:read", "affiliate-product", "read", "Xem sản phẩm affiliate", "Nội dung"],
  ["admin:affiliate-product:create", "affiliate-product", "create", "Thêm sản phẩm affiliate", "Nội dung"],
  ["admin:affiliate-product:update", "affiliate-product", "update", "Sửa sản phẩm affiliate", "Nội dung"],
  ["admin:affiliate-product:delete", "affiliate-product", "delete", "Xóa sản phẩm affiliate", "Nội dung"],
  ["admin:course:read", "course", "read", "Xem khóa học", "Nội dung"],
  ["admin:course:create", "course", "create", "Thêm khóa học", "Nội dung"],
  ["admin:course:update", "course", "update", "Sửa khóa học", "Nội dung"],
  ["admin:course:delete", "course", "delete", "Xóa khóa học", "Nội dung"],
  ["admin:vocabulary:read", "vocabulary", "read", "Xem từ vựng", "Nội dung"],
  ["admin:vocabulary:create", "vocabulary", "create", "Thêm từ vựng", "Nội dung"],
  ["admin:vocabulary:update", "vocabulary", "update", "Sửa từ vựng", "Nội dung"],
  ["admin:vocabulary:delete", "vocabulary", "delete", "Xóa từ vựng", "Nội dung"],
  ["admin:jlpt-test:read", "jlpt-test", "read", "Xem đề thi", "Nội dung"],
  ["admin:jlpt-test:create", "jlpt-test", "create", "Thêm đề thi", "Nội dung"],
  ["admin:jlpt-test:update", "jlpt-test", "update", "Sửa đề thi", "Nội dung"],
  ["admin:jlpt-test:delete", "jlpt-test", "delete", "Xóa đề thi", "Nội dung"],
  ["admin:jlpt-highlight:read", "jlpt-highlight", "read", "Xem highlight", "Nội dung"],
  ["admin:jlpt-highlight:update", "jlpt-highlight", "update", "Sửa highlight", "Nội dung"],
  ["admin:example-suggestion:read", "example-suggestion", "read", "Xem mẫu câu góp ý", "Cộng đồng"],
  ["admin:example-suggestion:update", "example-suggestion", "update", "Duyệt mẫu câu góp ý", "Cộng đồng"],
  ["admin:example-suggestion:delete", "example-suggestion", "delete", "Xóa mẫu câu góp ý", "Cộng đồng"],
  ["admin:feedback:read", "feedback", "read", "Xem góp ý", "Cộng đồng"],
  ["admin:feedback:update", "feedback", "update", "Sửa góp ý", "Cộng đồng"],
  ["admin:feedback:delete", "feedback", "delete", "Xóa góp ý", "Cộng đồng"],
  ["admin:master-data:read", "master-data", "read", "Xem Master Data", "Master Data"],
  ["admin:master-data:create", "master-data", "create", "Thêm Master Data", "Master Data"],
  ["admin:master-data:update", "master-data", "update", "Sửa Master Data", "Master Data"],
  ["admin:master-data:delete", "master-data", "delete", "Xóa Master Data", "Master Data"],
  ["admin:role:read", "role", "read", "Xem vai trò", "Hệ thống"],
  ["admin:role:create", "role", "create", "Thêm vai trò", "Hệ thống"],
  ["admin:role:update", "role", "update", "Sửa vai trò", "Hệ thống"],
  ["admin:role:delete", "role", "delete", "Xóa vai trò", "Hệ thống"],
  ["admin:permission:read", "permission", "read", "Xem phân quyền", "Hệ thống"],
  ["admin:permission:update", "permission", "update", "Sửa phân quyền", "Hệ thống"],
  ["admin:settings:read", "settings", "read", "Xem cấu hình", "Hệ thống"],
  ["admin:settings:update", "settings", "update", "Sửa cấu hình", "Hệ thống"],
] as const;

export const adminPermissions = adminPermissionDefinitions.map(([key]) => key);
export const permissions = [...applicationPermissions, ...adminPermissions] as const;
export type Permission = string;

export const rolePermissions: Record<string, Permission[]> = {
  user: ["course:read", "course:enroll", "flashcard:read", "flashcard:create", "flashcard:update:own", "quiz:take", "review:create", "feedback:create"],
  vip: ["course:read", "course:enroll", "flashcard:read", "flashcard:create", "flashcard:update:own", "quiz:take", "review:create", "feedback:create", "ai:use"],
  creator: ["course:read", "course:enroll", "course:create", "course:update:own", "flashcard:read", "flashcard:create", "flashcard:update:own", "quiz:take", "review:create", "feedback:create", "payment:manage:own"],
  admin: [...permissions, "admin:stats:read"],
};

export function getPermissionsForRoles(userRoles: Role[]) { return [...new Set(userRoles.flatMap((role) => rolePermissions[role] ?? []))]; }
export function hasRole(userRoles: Role[], requiredRole: Role) { return userRoles.includes("admin") || userRoles.includes(requiredRole); }
export function hasPermission(userRoles: Role[], permission: Permission) { return getPermissionsForRoles(userRoles).includes(permission); }
export function isRole(value: string): value is Role { return /^[a-z][a-z0-9-]{1,39}$/.test(value); }
export function isKnownPermission(value: string) { return permissions.includes(value as (typeof permissions)[number]); }
