import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectMongoDB } from "@/lib/mongodb";
import { AUTH_COOKIE_NAME, signSessionToken } from "@/lib/auth/session";
import { getPermissionsForRoles, isRole } from "@/lib/auth/permissions";
import { UserModel } from "@/models/User";

const LoginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    await connectMongoDB();

    const { login, password } = LoginSchema.parse(await request.json());
    const normalizedLogin = login.trim().toLowerCase();
    const user = await UserModel.findOne({
      $or: [{ username: normalizedLogin }, { email: normalizedLogin }],
    }).lean();

    if (
      !user ||
      !user.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return NextResponse.json({ message: "Sai tài khoản hoặc mật khẩu." }, { status: 401 });
    }

    if (user.status !== "active") {
      return NextResponse.json({ message: "Tài khoản chưa active hoặc đã bị khóa." }, { status: 403 });
    }

    const roles = user.roles.filter(isRole);
    const token = signSessionToken({
      userId: String(user._id),
      username: user.username,
      email: user.email,
      roles,
    });

    const response = NextResponse.json({
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        roles,
        permissions: getPermissionsForRoles(roles),
        aiCredits: typeof user.aiCredits === "number" ? user.aiCredits : 1,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Dữ liệu đăng nhập không hợp lệ.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể đăng nhập." },
      { status: 500 },
    );
  }
}
