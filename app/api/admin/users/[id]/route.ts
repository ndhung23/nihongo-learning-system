import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { roles } from "@/lib/auth/permissions";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { duplicateKeyMessage, isValidVietnamesePhone, normalizePhone, validationMessage } from "@/lib/auth/user-identity";

const UpdateUserSchema = z.object({
  email: z.string().trim().email("Email không đúng định dạng.").optional(),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự.").max(128).optional(),
  displayName: z.string().optional(),
  phone: z.string().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  roles: z.array(z.enum(roles)).optional(),
  status: z.enum(["active", "inactive", "banned", "pending_verify"]).optional(),
  addAiCredits: z.coerce.number().int().min(0).optional(),
  addGachaTickets: z.coerce.number().int().min(0).optional(),
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
    const email = payload.email?.trim().toLowerCase();
    const phone = payload.phone === undefined ? undefined : normalizePhone(payload.phone);

    if (phone !== undefined && !isValidVietnamesePhone(phone)) {
      return NextResponse.json({ message: "Số điện thoại không hợp lệ." }, { status: 400 });
    }

    const [emailOwner, phoneOwner] = await Promise.all([
      email ? UserModel.exists({ email, _id: { $ne: id } }) : null,
      phone ? UserModel.exists({ "profile.phone": phone, _id: { $ne: id } }) : null,
    ]);
    if (emailOwner) return NextResponse.json({ message: "Email này đã được tài khoản khác sử dụng." }, { status: 409 });
    if (phoneOwner) return NextResponse.json({ message: "Số điện thoại này đã được tài khoản khác sử dụng." }, { status: 409 });

    if (email) update.email = email;
    if (payload.displayName !== undefined) update.displayName = payload.displayName;
    if (phone !== undefined) update["profile.phone"] = phone;
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

    const increments: Record<string, number> = {};
    if (payload.addAiCredits) increments.aiCredits = payload.addAiCredits;
    if (payload.addGachaTickets) increments.pendingGachaTickets = payload.addGachaTickets;
    if (Object.keys(increments).length > 0) {
      await UserModel.collection.updateOne(
        { _id: new Types.ObjectId(id) },
        { $inc: increments },
      );
    }

    const updatedUser = await UserModel.collection.findOne(
      { _id: new Types.ObjectId(id) },
      { projection: { passwordHash: 0, passwordReset: 0 } },
    );
    return NextResponse.json({ data: updatedUser });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: validationMessage(error, "Dữ liệu cập nhật không hợp lệ."), issues: error.issues }, { status: 400 });
    }

    const duplicateMessage = duplicateKeyMessage(error);
    if (duplicateMessage) return NextResponse.json({ message: duplicateMessage }, { status: 409 });

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
