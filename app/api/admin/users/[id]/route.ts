import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { roles } from "@/lib/auth/permissions";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
  displayName: z.string().optional(),
  phone: z.string().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  roles: z.array(z.enum(roles)).optional(),
  status: z.enum(["active", "inactive", "banned", "pending_verify"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("admin:user:write");
    await connectMongoDB();

    const { id } = await params;
    const payload = UpdateUserSchema.parse(await request.json());
    const update: Record<string, unknown> = {};

    if (payload.email) update.email = payload.email.trim().toLowerCase();
    if (payload.displayName !== undefined) update.displayName = payload.displayName;
    if (payload.phone !== undefined) update["profile.phone"] = payload.phone;
    if (payload.gender) update["profile.gender"] = payload.gender;
    if (payload.roles) update.roles = payload.roles;
    if (payload.status) update.status = payload.status;
    if (payload.password) update.passwordHash = await bcrypt.hash(payload.password, 12);

    const user = await UserModel.findByIdAndUpdate(id, { $set: update }, { new: true })
      .select("-passwordHash -passwordReset")
      .lean();

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy người dùng." }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Dữ liệu cập nhật không hợp lệ.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể cập nhật người dùng." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("admin:user:write");
    await connectMongoDB();

    const { id } = await params;
    const deleted = await UserModel.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ message: "Không tìm thấy người dùng." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể xóa người dùng." },
      { status: 500 },
    );
  }
}
