import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireAuth } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { JlptHighlightSuggestionModel } from "@/models/JlptHighlightSuggestion";
import { JlptTestModel } from "@/models/JlptTest";

const BodySchema = z.object({
  level: z.string().regex(/^N[1-5]$/),
  testNumber: z.number().int().positive(),
  section: z.enum(["vocabularyKanji", "grammarReading"]),
  questionId: z.string().trim().min(1).max(100),
  suggestedHighlightText: z.string().trim().min(1).max(300),
  note: z.string().trim().max(500).optional().default(""),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = BodySchema.parse(await request.json());
    await connectMongoDB();

    const test = await JlptTestModel.findOne({ level: body.level, number: body.testNumber })
      .select({ [`sections.${body.section}`]: 1 })
      .lean();
    const question = (test?.sections?.[body.section] ?? []).find(
      (item: { id: string }) => item.id === body.questionId,
    );

    if (!question) return NextResponse.json({ message: "Không tìm thấy câu hỏi." }, { status: 404 });
    if (!question.prompt.includes(body.suggestedHighlightText)) {
      return NextResponse.json({ message: "Đoạn đề xuất phải nằm nguyên vẹn trong câu hỏi." }, { status: 400 });
    }

    const suggestion = await JlptHighlightSuggestionModel.create({
      ...body,
      userId: session.userId,
      username: session.username,
      prompt: question.prompt,
      currentHighlightText: question.highlightText ?? "",
    });
    return NextResponse.json({ id: String(suggestion._id) }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ message: error.message }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Thông tin góp ý không hợp lệ." }, { status: 400 });
    return NextResponse.json({ message: "Không thể gửi góp ý lúc này." }, { status: 500 });
  }
}
