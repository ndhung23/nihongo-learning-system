import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { ensureRbacSeeded } from "@/lib/auth/rbac";
import { isKnownPermission } from "@/lib/auth/permissions";
import { RoleModel } from "@/models/Role";
import { UserModel } from "@/models/User";
import { writeAudit } from "@/lib/admin/audit";

const RoleSchema = z.object({ name: z.string().trim().min(2).max(80), code: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9-]{1,39}$/), description: z.string().trim().max(300).default(""), permissions: z.array(z.string()).default([]), isActive: z.boolean().default(true) });

export async function GET() {
  try {
    await requirePermission("admin:role:read"); await ensureRbacSeeded();
    const [roles, counts] = await Promise.all([RoleModel.find().sort({ isSystem: -1, name: 1 }).lean(), UserModel.aggregate([{ $unwind: "$roles" }, { $group: { _id: "$roles", count: { $sum: 1 } } }])]);
    const countMap = new Map(counts.map((item) => [item._id, item.count]));
    return NextResponse.json({ data: roles.map((role) => ({ ...role, _id: String(role._id), userCount: countMap.get(role.code) || 0 })) });
  } catch (error) { return authError(error, "Không thể tải vai trò."); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("admin:role:create"); await ensureRbacSeeded();
    const payload = RoleSchema.parse(await request.json());
    if (payload.permissions.some((key) => !isKnownPermission(key))) return NextResponse.json({ message: "Danh sách quyền chứa khóa không hợp lệ." }, { status: 400 });
    const role = await RoleModel.create({ ...payload, isSystem: false });
    await writeAudit(session.userId, "ROLE_CREATE", "role", String(role._id), undefined, role.toObject());
    return NextResponse.json({ data: role }, { status: 201 });
  } catch (error) { if ((error as { code?: number }).code === 11000) return NextResponse.json({ message: "Mã vai trò đã tồn tại." }, { status: 409 }); return authError(error, "Không thể tạo vai trò."); }
}

function authError(error: unknown, fallback: string) {
  if (error instanceof AuthError) return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
  if (error instanceof z.ZodError) return NextResponse.json({ message: error.issues[0]?.message || "Dữ liệu chưa hợp lệ." }, { status: 400 });
  return NextResponse.json({ message: error instanceof Error ? error.message : fallback }, { status: 500 });
}
