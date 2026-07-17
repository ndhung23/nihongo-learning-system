import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { VocabularyModel } from "@/models/Vocabulary";

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
  collocations: z.array(z.string()).default([]),
  wordFamily: z.array(z.string()).default([]),
  audioUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  source: z.enum(["system", "user", "ai"]).default("user"),
  isPublished: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  await connectMongoDB();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const deckId = searchParams.get("deckId");
  const limit = Math.min(Number(searchParams.get("limit") || 50), 1500);

  const filter: Record<string, unknown> = {};

  if (deckId) {
    filter.deckId = deckId;
  }

  if (q) {
    filter.$text = { $search: q };
  }

  const vocabulary = await VocabularyModel.find(filter)
    .sort(q ? { score: { $meta: "textScore" } } : { createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({ data: vocabulary });
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission("flashcard:create");
    await connectMongoDB();

    const payload = CreateVocabularySchema.parse(await request.json());
    const vocabulary = await VocabularyModel.create(payload);

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
