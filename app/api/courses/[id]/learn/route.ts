import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { AuthError, requireAuth } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { CourseLearnerModel } from "@/models/CourseLearner";
import { DeckModel } from "@/models/Deck";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/courses/[id]/learn">,
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, message: "Khóa học không hợp lệ." },
        { status: 400 },
      );
    }

    await connectMongoDB();
    await CourseLearnerModel.init();

    const deckId = new Types.ObjectId(id);
    const userId = new Types.ObjectId(session.userId);
    const deckExists = await DeckModel.exists({
      _id: deckId,
      status: "published",
      visibility: "public",
    });

    if (!deckExists) {
      return NextResponse.json(
        { ok: false, message: "Không tìm thấy khóa học." },
        { status: 404 },
      );
    }

    const result = await CourseLearnerModel.collection.updateOne(
      { deckId, userId },
      {
        $set: { lastLearnedAt: new Date(), updatedAt: new Date() },
        $setOnInsert: {
          deckId,
          userId,
          firstLearnedAt: new Date(),
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    await DeckModel.updateOne(
      { _id: deckId },
      { $inc: { "stats.learnerCount": 1 } },
    );

    const deck = await DeckModel.findById(deckId)
      .select({ "stats.learnerCount": 1 })
      .lean();
    revalidateTag("courses", { expire: 0 });

    return NextResponse.json({
      ok: true,
      learnerCount: deck?.stats?.learnerCount ?? 0,
      firstVisit: result.upsertedCount > 0,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { ok: false, message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    return NextResponse.json(
      { ok: false, message: "Không thể ghi nhận học viên." },
      { status: 500 },
    );
  }
}
