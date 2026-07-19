import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPermissionsForRoles, isRole } from "@/lib/auth/permissions";
import { AUTH_COOKIE_NAME, AuthError, requireAuth, signSessionToken } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { duplicateKeyMessage, isValidVietnamesePhone, normalizePhone, validationMessage } from "@/lib/auth/user-identity";

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(80),
  email: z.string().email(),
  avatarUrl: z
    .string()
    .refine((value) => value === "" || /^https?:\/\/.+/i.test(value) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value), "Avatar phải là link ảnh hoặc data:image base64.")
    .optional(),
  phone: z.string().max(24).optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).default("unknown"),
  birthday: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireAuth();
    await connectMongoDB();

    const user = await UserModel.findById(session.userId).select("-passwordHash -passwordReset").lean();

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy tài khoản." }, { status: 404 });
    }

    return NextResponse.json({ user: serializeUser(user) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: 401 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể tải hồ sơ." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    await connectMongoDB();

    const payload = UpdateProfileSchema.parse(await request.json());
    const user = await UserModel.findById(session.userId);

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy tài khoản." }, { status: 404 });
    }

    const email = payload.email.trim().toLowerCase();
    const phone = normalizePhone(payload.phone);
    if (!isValidVietnamesePhone(phone)) {
      return NextResponse.json({ message: "Số điện thoại không hợp lệ." }, { status: 400 });
    }
    const [existedEmail, existedPhone] = await Promise.all([
      UserModel.exists({ email, _id: { $ne: user._id } }),
      phone ? UserModel.exists({ "profile.phone": phone, _id: { $ne: user._id } }) : null,
    ]);

    if (existedEmail) {
      return NextResponse.json({ message: "Email đã được tài khoản khác sử dụng." }, { status: 409 });
    }
    if (existedPhone) {
      return NextResponse.json({ message: "Số điện thoại đã được tài khoản khác sử dụng." }, { status: 409 });
    }

    if (payload.newPassword) {
      if (!payload.currentPassword) {
        return NextResponse.json({ message: "Nhập mật khẩu hiện tại để đổi mật khẩu." }, { status: 400 });
      }

      const passwordOk = await bcrypt.compare(payload.currentPassword, user.passwordHash);

      if (!passwordOk) {
        return NextResponse.json({ message: "Mật khẩu hiện tại không đúng." }, { status: 401 });
      }

      user.passwordHash = await bcrypt.hash(payload.newPassword, 12);
    }

    user.email = email;
    user.displayName = payload.displayName.trim();
    user.avatarUrl = payload.avatarUrl?.trim() || undefined;
    user.profile = {
      ...user.profile,
      phone,
      gender: payload.gender,
      birthday: payload.birthday ? new Date(payload.birthday) : undefined,
    };

    await user.save();

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
        profile: {
          gender: user.profile?.gender,
          phone: user.profile?.phone,
          birthday: user.profile?.birthday ? user.profile.birthday.toISOString().slice(0, 10) : "",
        },
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
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: validationMessage(error, "Dữ liệu hồ sơ không hợp lệ."), issues: error.issues }, { status: 400 });
    }

    const duplicateMessage = duplicateKeyMessage(error);
    if (duplicateMessage) return NextResponse.json({ message: duplicateMessage }, { status: 409 });

    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể cập nhật hồ sơ." }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await requireAuth();
    await connectMongoDB();

    const user = await UserModel.collection.findOneAndUpdate(
      { _id: new Types.ObjectId(session.userId) },
      { $set: { pendingGachaTickets: 0 } },
      { returnDocument: "before", projection: { pendingGachaTickets: 1 } },
    );

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy tài khoản." }, { status: 404 });
    }

    return NextResponse.json({
      claimedGachaTickets: Math.max(Number(user.pendingGachaTickets) || 0, 0),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: 401 });
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể nhận vé Gacha." },
      { status: 500 },
    );
  }
}

type LeanProfileUser = {
  _id: unknown;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  roles?: string[];
  profile?: {
    gender?: string;
    phone?: string;
    birthday?: string | Date;
  };
  streak?: unknown;
  createdAt?: unknown;
};

function serializeUser(user: LeanProfileUser) {
  const roles = Array.isArray(user.roles) ? user.roles.filter(isRole) : [];

  return {
    id: String(user._id),
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    roles,
    permissions: getPermissionsForRoles(roles),
    profile: {
      gender: user.profile?.gender || "unknown",
      phone: user.profile?.phone || "",
      birthday: user.profile?.birthday ? new Date(user.profile.birthday).toISOString().slice(0, 10) : "",
    },
    streak: user.streak,
    createdAt: user.createdAt,
  };
}
