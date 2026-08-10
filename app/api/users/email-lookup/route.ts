import { NextRequest, NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("flashcard:read");
    const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase() || "";
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ data: null });
    await connectMongoDB();
    const user = await UserModel.findOne({ email }).select("email displayName username avatarUrl status").lean();
    if (!user || user.status === "banned") return NextResponse.json({ data: null });
    return NextResponse.json({ data: { email: user.email, name: user.displayName || user.username, avatarUrl: user.avatarUrl || "" } });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    return NextResponse.json({ message: "Không thể kiểm tra email." }, { status: 500 });
  }
}
