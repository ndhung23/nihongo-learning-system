import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPasswordResetToken, getPasswordResetExpiresAt } from "@/lib/auth/password-reset";
import { connectMongoDB } from "@/lib/mongodb";
import { sendPasswordResetEmail } from "@/lib/email";
import { UserModel } from "@/models/User";

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    await connectMongoDB();

    const { email } = ForgotPasswordSchema.parse(await request.json());
    const normalizedEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail });
    const responseMessage =
      "Nếu email thuộc một tài khoản, hệ thống đã gửi liên kết đặt lại mật khẩu.";

    if (!user) {
      return NextResponse.json({ ok: true, message: responseMessage });
    }

    const lastRequest = user.passwordReset?.requestedAt?.getTime?.() || 0;
    if (Date.now() - lastRequest < 60_000) {
      return NextResponse.json({ ok: true, message: responseMessage });
    }

    const { token, tokenHash } = createPasswordResetToken();
    const requestedAt = new Date();
    const resetOrigin = (
      process.env.AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl.origin
    ).replace(/\/+$/, "");
    const resetUrl = `${resetOrigin}/reset-password?token=${encodeURIComponent(token)}`;

    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          "passwordReset.tokenHash": tokenHash,
          "passwordReset.expiresAt": getPasswordResetExpiresAt(),
          "passwordReset.requestedAt": requestedAt,
          "passwordReset.usedAt": null,
        },
      },
    );

    try {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.displayName || user.username,
        resetUrl,
      });
    } catch (error) {
      await UserModel.updateOne(
        { _id: user._id, "passwordReset.tokenHash": tokenHash },
        {
          $unset: {
            "passwordReset.tokenHash": "",
            "passwordReset.expiresAt": "",
          },
        },
      );
      throw error;
    }

    return NextResponse.json({
      ok: true,
      message: responseMessage,
      devResetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
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
