import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { UserPresenceModel } from "@/models/UserPresence";
import { DailyUserActivityModel } from "@/models/DailyUserActivity";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({})) as { path?: string };
    await connectMongoDB();
    const now = new Date();
    const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
    await Promise.all([
      UserPresenceModel.updateOne({ userId: session.userId }, { $set: { lastSeenAt: now, path: String(body.path || "").slice(0, 300) } }, { upsert: true }),
      DailyUserActivityModel.updateOne({ userId: session.userId, dateKey }, { $set: { lastSeenAt: now } }, { upsert: true }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
