import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { JlptTestModel } from "@/models/JlptTest";

const BodySchema = z.object({
  level: z.string().regex(/^N[1-5]$/),
  testNumber: z.number().int().positive(),
  section: z.enum(["vocabularyKanji", "grammarReading"]),
  questionId: z.string().trim().min(1),
  highlightText: z.string().trim().max(300),
});

export async function PATCH(request: Request) {
  try {
    await requirePermission("admin:course:write");
    const body = BodySchema.parse(await request.json());
    await connectMongoDB();

    const test = await JlptTestModel.findOne({ level: body.level, number: body.testNumber })
      .select({ [`sections.${body.section}`]: 1 })
      .lean();
    const question = (test?.sections?.[body.section] ?? []).find((item: { id: string }) => item.id === body.questionId);
    if (!question) return NextResponse.json({ message: "Không tìm thấy câu hỏi." }, { status: 404 });
    if (body.highlightText && !question.prompt.includes(body.highlightText)) {
      return NextResponse.json({ message: "Đoạn highlight phải nằm nguyên vẹn trong câu hỏi." }, { status: 400 });
    }

    await JlptTestModel.updateOne(
      { level: body.level, number: body.testNumber },
      { $set: { [`sections.${body.section}.$[question].highlightText`]: body.highlightText } },
      { arrayFilters: [{ "question.id": body.questionId }] },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Dữ liệu highlight không hợp lệ." }, { status: 400 });
    return NextResponse.json({ message: "Không thể cập nhật highlight." }, { status: 500 });
  }
}
