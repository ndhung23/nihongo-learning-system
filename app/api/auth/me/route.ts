import { NextResponse } from "next/server";
import { getPermissionsForRoles, isRole } from "@/lib/auth/permissions";
import { getAuthSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

export async function GET() {
  const session = await getAuthSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  await connectMongoDB();

  const user = await UserModel.findById(session.userId).select("-passwordHash -passwordReset").lean();

  if (!user || user.status !== "active") {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const roles = user.roles.filter(isRole);

  return NextResponse.json({
    user: {
      id: String(user._id),
      userId: String(user._id),
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      roles,
      permissions: getPermissionsForRoles(roles),
      aiCredits: typeof user.aiCredits === "number" ? user.aiCredits : 1,
      profile: {
        gender: user.profile?.gender,
        phone: user.profile?.phone,
        birthday: user.profile?.birthday ? user.profile.birthday.toISOString().slice(0, 10) : "",
      },
    },
  });
}
