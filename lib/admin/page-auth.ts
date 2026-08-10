import { redirect } from "next/navigation";
import { AuthError, requirePermission } from "@/lib/auth/session";
import type { Permission } from "@/lib/auth/permissions";

export async function requireAdminPage(permission: Permission) {
  try { return await requirePermission(permission); }
  catch (error) { if (error instanceof AuthError && error.code === "UNAUTHORIZED") redirect("/login"); redirect("/admin/unauthorized"); }
}
