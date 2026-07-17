import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";
import { VocabularyModel } from "@/models/Vocabulary";

const UpdateVocabularySchema = z.object({
  term: z.string().trim().min(1).optional(),
  kana: z.string().trim().optional(),
  romaji: z.string().trim().optional(),
  meaningVi: z.string().trim().min(1).optional(),
  partOfSpeech: z.string().trim().optional(),
  level: z.enum(["kana", "n5", "n4", "n3", "n2", "n1", "custom"]).optional(),
  lesson: z.coerce.number().int().min(1).max(99).optional(),
  isPublished: z.boolean().optional(),
  examples: z
    .array(
      z.object({
        ja: z.string().trim().min(1),
        vi: z.string().trim().optional(),
      }),
    )
    .optional(),
});

type RouteContext = {
  params: Promise<{ id: string; vocabularyId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requirePermission("admin:course:write");
    await connectMongoDB();

    const { id, vocabularyId } = await context.params;

    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(vocabularyId)) {
      return NextResponse.json({ message: "ID không hợp lệ." }, { status: 400 });
    }

    const payload = UpdateVocabularySchema.parse(await request.json());
    const vocabulary = await VocabularyModel.findOneAndUpdate(
      { _id: vocabularyId, deckId: id },
      { $set: payload },
      { new: true },
    ).lean();

    if (!vocabulary) {
      return NextResponse.json({ message: "Không tìm thấy từ vựng." }, { status: 404 });
    }

    return NextResponse.json({ data: vocabulary });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Dữ liệu từ vựng không hợp lệ.", issues: error.issues }, { status: 400 });
    }

    return handleError(error, "Không thể cập nhật từ vựng.");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requirePermission("admin:course:write");
    await connectMongoDB();

    const { id, vocabularyId } = await context.params;

    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(vocabularyId)) {
      return NextResponse.json({ message: "ID không hợp lệ." }, { status: 400 });
    }

    const vocabulary = await VocabularyModel.findOneAndDelete({ _id: vocabularyId, deckId: id }).lean();

    if (!vocabulary) {
      return NextResponse.json({ message: "Không tìm thấy từ vựng." }, { status: 404 });
    }

    await syncVocabularyCount(id);

    return NextResponse.json({ data: { id: vocabularyId } });
  } catch (error) {
    return handleError(error, "Không thể xóa từ vựng.");
  }
}

async function syncVocabularyCount(deckId: string) {
  const vocabularyCount = await VocabularyModel.countDocuments({ deckId });
  await DeckModel.findByIdAndUpdate(deckId, { $set: { "stats.vocabularyCount": vocabularyCount } });
}

function handleError(error: unknown, fallback: string) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { message: error.message, code: error.code },
      { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
    );
  }

  return NextResponse.json({ message: error instanceof Error ? error.message : fallback }, { status: 500 });
}
