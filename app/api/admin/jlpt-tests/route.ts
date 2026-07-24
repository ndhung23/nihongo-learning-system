import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";
import { JlptTestModel } from "@/models/JlptTest";

const QuestionSchema = z.object({
  group: z.string().trim().min(1).max(100),
  instruction: z.string().trim().max(500).default(""),
  prompt: z.string().trim().min(1).max(3000),
  highlightText: z.string().trim().max(300).default(""),
  options: z.array(z.string().trim().min(1).max(500)).min(2).max(6),
  correctIndex: z.coerce.number().int().min(0),
  explanation: z.string().trim().max(2000).default(""),
}).superRefine((question, context) => {
  if (question.correctIndex >= question.options.length) {
    context.addIssue({ code: "custom", path: ["correctIndex"], message: "Đáp án đúng không hợp lệ." });
  }
});

const CreateTestSchema = z.object({
  level: z.enum(["N5", "N4", "N3", "N2", "N1"]),
  number: z.coerce.number().int().min(1).max(999),
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().max(1000).default(""),
  visibility: z.enum(["private", "public", "unlisted"]).default("public"),
  status: z.enum(["draft", "published", "hidden"]).default("published"),
  sections: z.object({
    vocabularyKanji: z.array(QuestionSchema).min(1),
    grammarReading: z.array(QuestionSchema).min(1),
  }),
});

export async function POST(request: NextRequest) {
  try {
    await requirePermission("admin:course:write");
    await connectMongoDB();
    const payload = CreateTestSchema.parse(await request.json());
    if (await JlptTestModel.exists({ level: payload.level, number: payload.number })) {
      return NextResponse.json({ message: `${payload.level} đề số ${payload.number} đã tồn tại.` }, { status: 409 });
    }
    const decorate = (questions: z.infer<typeof QuestionSchema>[], section: "vk" | "gr") =>
      questions.map((question, index) => ({ ...question, id: `${payload.level.toLowerCase()}-t${payload.number}-${section}-q${index + 1}` }));
    const vocabularyKanji = decorate(payload.sections.vocabularyKanji, "vk");
    const grammarReading = decorate(payload.sections.grammarReading, "gr");
    const questionCount = vocabularyKanji.length + grammarReading.length;
    const test = await JlptTestModel.create({
      level: payload.level,
      number: payload.number,
      title: payload.title,
      sourceFile: "admin-editor",
      sectionDefinitions: {
        vocabularyKanji: { key: "vocabulary-kanji", title: "Từ vựng + Kanji", sourceGroups: [...new Set(vocabularyKanji.map((item) => item.group))] },
        grammarReading: { key: "grammar-reading", title: "Ngữ pháp + Reading", sourceGroups: [...new Set(grammarReading.map((item) => item.group))] },
      },
      sections: { vocabularyKanji, grammarReading },
      questionCount,
      source: "private-import",
      importedAt: new Date(),
    });
    try {
      await DeckModel.create({
        title: payload.title,
        slug: `de-thi-${payload.level.toLowerCase()}-minh-hoa-so-${payload.number}`,
        description: payload.description || "Luyện thi theo hai phần: Từ vựng + Kanji và Ngữ pháp + Reading.",
        level: payload.level.toLowerCase(),
        languagePair: { source: "ja", target: "vi" },
        sourceType: "system",
        visibility: payload.visibility,
        status: payload.status,
        price: { amount: 0, currency: "VND" },
        tags: ["JLPT", payload.level, "Test", "Từ vựng + Kanji"],
        contentType: "jlpt-test",
        jlptTest: { level: payload.level, number: payload.number, testId: test._id },
        stats: { vocabularyCount: questionCount, learnerCount: 0 },
      });
    } catch (error) {
      await JlptTestModel.deleteOne({ _id: test._id });
      throw error;
    }
    revalidateTag("courses", { expire: 0 });
    return NextResponse.json({ data: { id: String(test._id), level: payload.level, number: payload.number, title: payload.title, questionCount } }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message || "Dữ liệu đề thi chưa hợp lệ.", issues: error.issues }, { status: 400 });
    }
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ message: "Số đề hoặc đường dẫn đề thi đã tồn tại." }, { status: 409 });
    }
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể tạo đề thi." }, { status: 500 });
  }
}
