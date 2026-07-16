import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPasswordResetToken, getPasswordResetExpiresAt } from "@/lib/auth/password-reset";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    await connectMongoDB();

    const { email } = ForgotPasswordSchema.parse(await request.json());
    const normalizedEmail = email.trim().toLowerCase();
    const { token, tokenHash } = createPasswordResetToken();

    const user = await UserModel.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          "passwordReset.tokenHash": tokenHash,
          "passwordReset.expiresAt": getPasswordResetExpiresAt(),
          "passwordReset.usedAt": null,
        },
      },
      { new: true },
    );

    const resetUrl = `${request.nextUrl.origin}/reset-password?token=${token}`;

    const isDevelopment = process.env.NODE_ENV !== "production";

    return NextResponse.json({
      ok: true,
      message: "Nếu email tồn tại, hệ thống đã tạo link đặt lại mật khẩu.",
      devResetUrl: isDevelopment && user ? resetUrl : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Email không hợp lệ.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể tạo yêu cầu quên mật khẩu." },
      { status: 500 },
    );
  }
}
