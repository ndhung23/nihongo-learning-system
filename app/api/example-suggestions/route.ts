import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { ExampleSuggestionModel } from "@/models/ExampleSuggestion";
import { VocabularyModel } from "@/models/Vocabulary";

const SuggestionSchema = z.object({
  vocabularyId: z.string().min(1),
  suggestedJa: z.string().trim().min(3).max(500),
  suggestedVi: z.string().trim().max(500).optional(),
  note: z.string().trim().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = SuggestionSchema.parse(await request.json());

    if (!Types.ObjectId.isValid(payload.vocabularyId)) {
      return NextResponse.json({ message: "ID từ vựng không hợp lệ." }, { status: 400 });
    }

    await connectMongoDB();

    const vocabulary = await VocabularyModel.findById(payload.vocabularyId).select("deckId term meaningVi").lean();

    if (!vocabulary) {
      return NextResponse.json({ message: "Không tìm thấy từ vựng." }, { status: 404 });
    }

    const session = await getAuthSession();
    const suggestion = await ExampleSuggestionModel.create({
      vocabularyId: vocabulary._id,
      deckId: vocabulary.deckId,
      userId: session?.userId,
      username: session?.username,
      term: vocabulary.term,
      meaningVi: vocabulary.meaningVi,
      suggestedJa: payload.suggestedJa,
      suggestedVi: payload.suggestedVi,
      note: payload.note,
    });

    return NextResponse.json({ data: { id: suggestion._id.toString() } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Mẫu câu góp ý chưa hợp lệ.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể gửi góp ý mẫu câu." }, { status: 500 });
  }
}
