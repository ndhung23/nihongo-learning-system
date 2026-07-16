import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectMongoDB } from "@/lib/mongodb";
import { getPermissionsForRoles } from "@/lib/auth/permissions";
import { AUTH_COOKIE_NAME, signSessionToken } from "@/lib/auth/session";
import { UserModel } from "@/models/User";

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, "Username chỉ gồm chữ, số và dấu gạch dưới."),
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    await connectMongoDB();

    const payload = RegisterSchema.parse(await request.json());
    const username = payload.username.trim().toLowerCase();
    const email = payload.email.trim().toLowerCase();

    const existed = await UserModel.exists({
      $or: [{ username }, { email }],
    });

    if (existed) {
      return NextResponse.json({ message: "Username hoặc email đã tồn tại." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await UserModel.create({
      username,
      email,
      passwordHash,
      displayName: username,
      roles: ["user"],
      status: "active",
    });

    const roles = ["user"] as const;
    const token = signSessionToken({
      userId: String(user._id),
      username: user.username,
      email: user.email,
      roles: [...roles],
    });

    const response = NextResponse.json(
      {
        user: {
          id: String(user._id),
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          roles,
          permissions: getPermissionsForRoles([...roles]),
        },
      },
      { status: 201 },
    );

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
      return NextResponse.json({ message: "Dữ liệu đăng ký không hợp lệ.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể đăng ký." },
      { status: 500 },
    );
  }
}
