import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { ensureRbacSeeded } from "@/lib/auth/rbac";
import { isKnownPermission, rolePermissions } from "@/lib/auth/permissions";
import { PermissionModel } from "@/models/Permission";
import { RoleModel } from "@/models/Role";
import { writeAudit } from "@/lib/admin/audit";

export async function GET() {
  try {
    await requirePermission("admin:permission:read"); await ensureRbacSeeded();
    const [permissions, roles] = await Promise.all([PermissionModel.find().sort({ group: 1, module: 1, action: 1 }).lean(), RoleModel.find({ isActive: true }).select("name code permissions isSystem").sort({ isSystem: -1, name: 1 }).lean()]);
    return NextResponse.json({ data: { permissions: permissions.map((item) => ({ ...item, _id: String(item._id) })), roles: roles.map((item) => ({ ...item, _id: String(item._id) })) } });
  } catch (error) { return handle(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requirePermission("admin:permission:update"); await ensureRbacSeeded();
    const payload = z.object({ roleId: z.string(), permissions: z.array(z.string()) }).parse(await request.json());
    if (payload.permissions.some((key) => !isKnownPermission(key))) return NextResponse.json({ message: "Có quyền không tồn tại trong registry." }, { status: 400 });
    const role = await RoleModel.findById(payload.roleId).lean(); if (!role) return NextResponse.json({ message: "Không tìm thấy vai trò." }, { status: 404 });
    const nextPermissions = role.code === "admin" ? rolePermissions.admin : [...new Set(payload.permissions)];
    const updated = await RoleModel.findByIdAndUpdate(payload.roleId, { $set: { permissions: nextPermissions } }, { new: true }).lean();
    await writeAudit(session.userId, "PERMISSION_UPDATE", "role", payload.roleId, { permissions: role.permissions }, { permissions: nextPermissions });
    return NextResponse.json({ data: updated });
  } catch (error) { return handle(error); }
}
function handle(error: unknown) { if (error instanceof AuthError) return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 }); if (error instanceof z.ZodError) return NextResponse.json({ message: "Dữ liệu phân quyền chưa hợp lệ." }, { status: 400 }); return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể xử lý phân quyền." }, { status: 500 }); }
