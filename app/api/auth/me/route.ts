import { NextResponse } from "next/server";
import { getPermissionsForRoles, isRole } from "@/lib/auth/permissions";
import { getAuthSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

export async function GET() {
  // Only the signed-in identity is needed here. Avoid a separate role query;
  // response permissions are derived from the user's current roles below.
  const session = await getAuthSession({ resolvePermissions: false });

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  await connectMongoDB();

  const user = await UserModel.findById(session.userId)
    .select("username email displayName avatarUrl roles status aiCredits coins pendingGachaTickets vipUntil profile")
    .lean();

  if (!user || user.status !== "active") {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const roles = user.roles.filter(isRole);
  const isVip = roles.includes("vip") && (!user.vipUntil || user.vipUntil > new Date());

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
      coins: Math.max(Number(user.coins) || 0, 0),
      pendingGachaTickets: Math.max(Number(user.pendingGachaTickets) || 0, 0),
      vipUntil: user.vipUntil?.toISOString(),
      isVip,
      profile: {
        gender: user.profile?.gender,
        phone: user.profile?.phone,
        birthday: user.profile?.birthday ? user.profile.birthday.toISOString().slice(0, 10) : "",
      },
    },
  });
}
