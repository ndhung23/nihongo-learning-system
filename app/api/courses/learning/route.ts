import { NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { CourseLearnerModel } from "@/models/CourseLearner";
import { DeckModel } from "@/models/Deck";

export async function GET() {
  try {
    const session = await requireAuth();
    await connectMongoDB();

    const learningRecords = await CourseLearnerModel.find({
      userId: session.userId,
    })
      .sort({ lastLearnedAt: -1 })
      .limit(30)
      .select("deckId lastLearnedAt")
      .lean();

    const deckIds = learningRecords.map((record) => record.deckId);
    const decks = await DeckModel.find({
      _id: { $in: deckIds },
      status: "published",
      visibility: "public",
    })
      .select("title slug description level contentType jlptTest stats tags")
      .lean();
    const decksById = new Map(
      decks.map((deck) => [deck._id.toString(), deck]),
    );

    const data = learningRecords.flatMap((record) => {
      const deck = decksById.get(record.deckId.toString());
      if (!deck) return [];

      return [
        {
          id: deck._id.toString(),
          title: deck.title,
          slug: deck.slug,
          description: deck.description,
          level: deck.level,
          type:
            deck.contentType === "jlpt-test" ? "jlpt-test" : "flashcard",
          jlptTest: deck.jlptTest
            ? {
                level: deck.jlptTest.level,
                number: deck.jlptTest.number,
              }
            : undefined,
          stats: deck.stats,
          tags: deck.tags,
          lastLearnedAt: record.lastLearnedAt,
        },
      ];
    });

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { data: [], message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    return NextResponse.json(
      { data: [], message: "Không thể tải các khóa đang học." },
      { status: 500 },
    );
  }
}
