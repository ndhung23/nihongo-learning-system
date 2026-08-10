import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, unstable_cache } from "next/cache";
import { Types } from "mongoose";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { VocabularyModel } from "@/models/Vocabulary";
import { DeckModel } from "@/models/Deck";

const CreateVocabularySchema = z.object({
  deckId: z.string().optional(),
  term: z.string().min(1),
  kana: z.string().optional(),
  romaji: z.string().optional(),
  meaningVi: z.string().min(1),
  partOfSpeech: z.string().optional(),
  level: z.enum(["kana", "n5", "n4", "n3", "n2", "n1", "custom"]).default("custom"),
  examples: z
    .array(
      z.object({
        ja: z.string().min(1),
        vi: z.string().optional(),
      }),
    )
    .default([]),
  distractors: z.array(z.string()).default([]),
  synonyms: z.array(z.string()).default([]),
  antonyms: z.array(z.string()).default([]),
  collocations: z.array(z.string()).default([]),
  wordFamily: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  lesson: z.number().int().min(1).max(99).optional(),
  sourceUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  source: z.enum(["system", "user", "ai"]).default("user"),
  isPublished: z.boolean().default(false),
});

const getCachedVocabulary = unstable_cache(
  async (q: string, deckId: string, lesson: string, limit: number) => {
    await connectMongoDB();

    const filter: Record<string, unknown> = { source: { $ne: "user" } };

    if (deckId) {
      filter.deckId = deckId;
    }

    if (lesson && lesson !== "all") {
      const lessonNumber = Number(lesson);
      if (Number.isInteger(lessonNumber) && lessonNumber > 0) {
        filter.lesson = lessonNumber;
      }
    }

    if (q) {
      filter.$text = { $search: q };
    }

    const vocabulary = await VocabularyModel.find(filter)
      .select("_id deckId term kana romaji meaningVi partOfSpeech level lesson examples synonyms antonyms sourceUrl imageUrl")
      .sort(q ? { score: { $meta: "textScore" } } : { createdAt: -1 })
      .limit(limit)
      .lean();

    return JSON.parse(JSON.stringify(vocabulary));
  },
  ["public-vocabulary-v4-images"],
  { revalidate: 300, tags: ["vocabulary"] },
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  if (scope === "mine") {
    try {
      const session = await requirePermission("flashcard:read");
      await connectMongoDB();

      const deckId = searchParams.get("deckId") || "";
      if (deckId && !Types.ObjectId.isValid(deckId)) return NextResponse.json({ message: "ID bộ từ không hợp lệ." }, { status: 400 });
      if (deckId) {
        const deck = await DeckModel.findOne({ _id: deckId, sourceType: "user", tags: "personal" }).select("+accessPasswordHash ownerId accessMode allowedUserIds").lean();
        if (!deck) return NextResponse.json({ message: "Không tìm thấy bộ từ." }, { status: 404 });
        const isOwner = String(deck.ownerId) === session.userId;
        const isInvited = (deck.allowedUserIds || []).some((id: unknown) => String(id) === session.userId);
        const password = request.headers.get("x-content-password") || searchParams.get("password") || "";
        const passwordAccepted = deck.accessMode === "password" && Boolean(password) && Boolean(deck.accessPasswordHash) && await bcrypt.compare(password, deck.accessPasswordHash);
        if (!session.roles.includes("admin") && !isOwner && deck.accessMode !== "public" && !isInvited && !passwordAccepted) {
          return NextResponse.json({ message: deck.accessMode === "password" ? "Bộ từ yêu cầu mật khẩu." : "Bạn không có quyền truy cập bộ từ này.", code: deck.accessMode === "password" ? "PASSWORD_REQUIRED" : "FORBIDDEN" }, { status: 403 });
        }
      }

      const vocabulary = await VocabularyModel.find({
        createdBy: session.userId,
        source: "user",
        ...(deckId ? { deckId } : {}),
      })
        .select("_id deckId term kana romaji meaningVi partOfSpeech level examples synonyms antonyms imageUrl createdAt")
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({ data: JSON.parse(JSON.stringify(vocabulary)) });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { message: error.message, code: error.code },
          { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
        );
      }

      return NextResponse.json(
        { message: error instanceof Error ? error.message : "Unable to load personal vocabulary." },
        { status: 500 },
      );
    }
  }

  const q = searchParams.get("q") || "";
  const deckId = searchParams.get("deckId") || "";
  const lesson = searchParams.get("lesson") || "";
  const limit = Math.min(Number(searchParams.get("limit") || 50), 1500);

  const vocabulary = await getCachedVocabulary(q, deckId, lesson, limit);

  return NextResponse.json(
    { data: vocabulary },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("flashcard:create");
    await connectMongoDB();

    const payload = CreateVocabularySchema.parse(await request.json());
    if (!payload.deckId || !Types.ObjectId.isValid(payload.deckId)) {
      return NextResponse.json({ message: "Bạn cần chọn một bộ từ trước khi thêm từ." }, { status: 400 });
    }
    const deck = await DeckModel.findOne({ _id: payload.deckId, ...(session.roles.includes("admin") ? {} : { ownerId: session.userId }), sourceType: "user", tags: "personal" }).select("_id").lean();
    if (!deck) {
      return NextResponse.json({ message: "Bộ từ không tồn tại hoặc không thuộc tài khoản của bạn." }, { status: 404 });
    }
    const vocabulary = await VocabularyModel.create({
      ...payload,
      deckId: deck._id,
      createdBy: session.userId,
      source: "user",
      isPublished: false,
    });
    const vocabularyCount = await VocabularyModel.countDocuments({ deckId: deck._id, createdBy: session.userId });
    await DeckModel.updateOne({ _id: deck._id }, { $set: { "stats.vocabularyCount": vocabularyCount } });
    revalidateTag("vocabulary", "max");

    return NextResponse.json({ data: vocabulary }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid vocabulary payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to create vocabulary." },
      { status: 500 },
    );
  }
}
