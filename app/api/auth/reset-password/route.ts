import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPasswordResetToken } from "@/lib/auth/password-reset";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  try {
    await connectMongoDB();

    const { token, password } = ResetPasswordSchema.parse(await request.json());
    const tokenHash = hashPasswordResetToken(token);
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await UserModel.findOneAndUpdate(
      {
        "passwordReset.tokenHash": tokenHash,
        "passwordReset.expiresAt": { $gt: new Date() },
        "passwordReset.usedAt": null,
      },
      {
        $set: {
          passwordHash,
          "passwordReset.usedAt": new Date(),
        },
        $unset: {
          "passwordReset.tokenHash": "",
          "passwordReset.expiresAt": "",
          "passwordReset.requestedAt": "",
        },
      },
      { new: true },
    );

    if (!user) {
      return NextResponse.json({ message: "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Đã đặt lại mật khẩu." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Dữ liệu đặt lại mật khẩu không hợp lệ.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể đặt lại mật khẩu." },
      { status: 500 },
    );
  }
}
