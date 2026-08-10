import { connectMongoDB } from "@/lib/mongodb";
import { PermissionModel } from "@/models/Permission";
import { RoleModel } from "@/models/Role";
import { adminPermissionDefinitions, getPermissionsForRoles, rolePermissions, type Permission } from "./permissions";

let seedPromise: Promise<void> | null = null;

export function ensureRbacSeeded() {
  if (!seedPromise) seedPromise = seedRbac().catch((error) => { seedPromise = null; throw error; });
  return seedPromise;
}

async function seedRbac() {
  await connectMongoDB();
  await PermissionModel.bulkWrite(adminPermissionDefinitions.map(([key, module, action, name, group]) => ({
    updateOne: { filter: { key }, update: { $set: { module, action, name, group }, $setOnInsert: { description: "" } }, upsert: true },
  })));
  const labels: Record<string, string> = { user: "Người dùng", vip: "VIP", creator: "Creator", admin: "Admin" };
  await RoleModel.bulkWrite(Object.entries(rolePermissions).map(([code, permissions]) => ({
    updateOne: {
      filter: { code },
      update: code === "admin"
        ? {
            $set: { permissions: rolePermissions.admin, isSystem: true, isActive: true },
            $setOnInsert: { name: labels[code], description: `Vai trò hệ thống ${labels[code]}` },
          }
        : {
            $setOnInsert: {
              name: labels[code] || code,
              description: `Vai trò hệ thống ${labels[code] || code}`,
              permissions,
              isSystem: true,
              isActive: true,
            },
          },
      upsert: true,
    },
  })));
}

export async function getPermissionsForRoleCodes(roleCodes: string[]): Promise<Permission[]> {
  const fallback = getPermissionsForRoles(roleCodes);
  try {
    await ensureRbacSeeded();
    if (roleCodes.includes("admin")) return rolePermissions.admin;
    const dynamicRoles = await RoleModel.find({ code: { $in: roleCodes }, isActive: true }).select("permissions").lean();
    if (!dynamicRoles.length) return fallback;
    return [...new Set([...fallback.filter((permission) => !permission.startsWith("admin:")), ...dynamicRoles.flatMap((role) => role.permissions || [])])];
  } catch {
    return fallback;
  }
}
