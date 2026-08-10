import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { isKnownPermission, rolePermissions } from "@/lib/auth/permissions";
import { RoleModel } from "@/models/Role";
import { UserModel } from "@/models/User";
import { writeAudit } from "@/lib/admin/audit";

const UpdateSchema = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(300).default(""), permissions: z.array(z.string()), isActive: z.boolean() });
export async function PATCH(request: NextRequest, context: RouteContext<"/api/admin/roles/[id]">) {
  try {
    const session = await requirePermission("admin:role:update"); const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ message: "ID không hợp lệ." }, { status: 400 });
    const payload = UpdateSchema.parse(await request.json());
    if (payload.permissions.some((key) => !isKnownPermission(key))) return NextResponse.json({ message: "Có quyền không hợp lệ." }, { status: 400 });
    const before = await RoleModel.findById(id).lean(); if (!before) return NextResponse.json({ message: "Không tìm thấy vai trò." }, { status: 404 });
    if (before.code === "admin") { payload.permissions = rolePermissions.admin; payload.isActive = true; }
    const role = await RoleModel.findByIdAndUpdate(id, { $set: payload }, { new: true }).lean();
    await writeAudit(session.userId, "ROLE_UPDATE", "role", id, before, role);
    return NextResponse.json({ data: role });
  } catch (error) { return handle(error); }
}
export async function DELETE(_request: NextRequest, context: RouteContext<"/api/admin/roles/[id]">) {
  try {
    const session = await requirePermission("admin:role:delete"); const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ message: "ID không hợp lệ." }, { status: 400 });
    const role = await RoleModel.findById(id).lean(); if (!role) return NextResponse.json({ message: "Không tìm thấy vai trò." }, { status: 404 });
    if (role.isSystem) return NextResponse.json({ message: "Không thể xóa vai trò hệ thống." }, { status: 409 });
    if (await UserModel.exists({ roles: role.code })) return NextResponse.json({ message: "Vai trò đang được gán cho người dùng." }, { status: 409 });
    await RoleModel.deleteOne({ _id: id }); await writeAudit(session.userId, "ROLE_DELETE", "role", id, role, undefined);
    return NextResponse.json({ message: "Đã xóa vai trò." });
  } catch (error) { return handle(error); }
}
function handle(error: unknown) { if (error instanceof AuthError) return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 }); if (error instanceof z.ZodError) return NextResponse.json({ message: error.issues[0]?.message }, { status: 400 }); return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể xử lý vai trò." }, { status: 500 }); }
