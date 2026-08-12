import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { DeckModel } from "@/models/Deck";
import { VocabularyModel } from "@/models/Vocabulary";
import { UserPresenceModel } from "@/models/UserPresence";
import { DailyUserActivityModel } from "@/models/DailyUserActivity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("admin:dashboard:read");
    await connectMongoDB();
    const now = new Date();
    const activeSince = new Date(now.getTime() - 90_000);
    const days = Array.from({ length: 7 }, (_, offset) => { const date = new Date(now); date.setDate(date.getDate() - (6 - offset)); return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(date); });
    const [userCount, deckCount, vocabularyCount, onlineRows, dailyRows] = await Promise.all([
      UserModel.countDocuments(), DeckModel.countDocuments(), VocabularyModel.countDocuments(),
      UserPresenceModel.find({ lastSeenAt: { $gte: activeSince } }).sort({ lastSeenAt: -1 }).populate("userId", "username displayName email avatarUrl").lean(),
      DailyUserActivityModel.aggregate([{ $match: { dateKey: { $in: days } } }, { $group: { _id: "$dateKey", count: { $sum: 1 } } }]),
    ]);
    const dailyMap = new Map(dailyRows.map((row) => [row._id, row.count]));
    return NextResponse.json({ data: { userCount, deckCount, vocabularyCount, onlineCount: onlineRows.length,
      onlineUsers: onlineRows.map((row) => { const user = row.userId as unknown as { _id?: unknown; username?: string; displayName?: string; email?: string; avatarUrl?: string }; return { id: String(user?._id || ""), username: user?.username || "Người dùng", displayName: user?.displayName || "", email: user?.email || "", avatarUrl: user?.avatarUrl || "", path: row.path || "", lastSeenAt: row.lastSeenAt }; }),
      activity: days.map((dateKey) => ({ dateKey, count: Number(dailyMap.get(dateKey)) || 0 })), updatedAt: now } });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể tải dashboard." }, { status: 403 }); }
}
