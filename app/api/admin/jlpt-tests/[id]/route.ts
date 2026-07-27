import { Types } from "mongoose";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireAuth } from "@/lib/auth/session";
import { TEST_LEVELS, testLevelToCourseLevel } from "@/lib/jlptTestLevels";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";
import { JlptTestModel } from "@/models/JlptTest";

const QuestionSchema = z.object({
  group: z.string().trim().min(1, "Nhóm câu hỏi không được để trống.").max(100),
  instruction: z.string().trim().max(500).default(""),
  prompt: z.string().trim().min(1, "Nội dung câu hỏi không được để trống.").max(3000),
  highlightText: z.string().trim().max(300).default(""),
  imageUrl: z.string().trim().url().or(z.literal("")).default(""),
  audioUrl: z.string().trim().url().or(z.literal("")).default(""),
  options: z.array(z.string().trim().min(1).max(500)).min(2, "Mỗi câu hỏi cần ít nhất 2 lựa chọn.").max(6),
  correctIndex: z.coerce.number().int().min(0),
  explanation: z.string().trim().max(2000).default(""),
}).superRefine((question, context) => {
  if (question.correctIndex >= question.options.length) {
    context.addIssue({ code: "custom", path: ["correctIndex"], message: "Đáp án đúng không hợp lệ." });
  }
});

const UpdateTestSchema = z.object({
  level: z.enum(TEST_LEVELS),
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().max(1000).default(""),
  visibility: z.enum(["private", "public", "unlisted"]).default("public"),
  status: z.enum(["draft", "published", "hidden"]).default("published"),
  sections: z.object({
    vocabularyKanji: z.array(QuestionSchema),
    grammarReading: z.array(QuestionSchema),
    listening: z.array(QuestionSchema).default([]),
  }),
}).superRefine((test, context) => {
  if (test.sections.vocabularyKanji.length + test.sections.grammarReading.length + test.sections.listening.length === 0) {
    context.addIssue({ code: "custom", path: ["sections"], message: "Đề thi cần có ít nhất 1 câu hỏi." });
  }
});

function invalidIdResponse() {
  return NextResponse.json({ message: "Mã đề thi không hợp lệ." }, { status: 400 });
}

function ownershipFilter(session: Awaited<ReturnType<typeof requireAuth>>, id: Types.ObjectId) {
  return session.roles.includes("admin") ? { _id: id } : { _id: id, createdBy: new Types.ObjectId(session.userId) };
}

export async function GET(_request: Request, context: RouteContext<"/api/admin/jlpt-tests/[id]">) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) return invalidIdResponse();
    await connectMongoDB();
    const objectId = new Types.ObjectId(id);
    const [test, deck] = await Promise.all([
      JlptTestModel.collection.findOne(ownershipFilter(session, objectId)),
      DeckModel.findOne({ "jlptTest.testId": objectId }).select("description visibility status").lean(),
    ]);
    if (!test) return NextResponse.json({ message: "Không tìm thấy đề thi." }, { status: 404 });
    return NextResponse.json({
      data: {
        id,
        level: test.level,
        number: test.number,
        title: test.title,
        description: deck?.description || "",
        visibility: deck?.visibility || "public",
        status: deck?.status || "published",
        sections: test.sections,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể tải đề thi." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/admin/jlpt-tests/[id]">) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) return invalidIdResponse();
    const payload = UpdateTestSchema.parse(await request.json());
    await connectMongoDB();
    const objectId = new Types.ObjectId(id);
    const existing = await JlptTestModel.findOne(ownershipFilter(session, objectId)).select("level number").lean();
    if (!existing) return NextResponse.json({ message: "Không tìm thấy đề thi." }, { status: 404 });
    if (payload.level !== existing.level && await JlptTestModel.exists({ level: payload.level, number: existing.number })) {
      return NextResponse.json({ message: `${payload.level} đề số ${existing.number} đã tồn tại.` }, { status: 409 });
    }

    const decorate = (questions: z.infer<typeof QuestionSchema>[], section: "vk" | "gr" | "ls") =>
      questions.map((question, index) => ({
        ...question,
        id: `${payload.level.toLowerCase()}-t${existing.number}-${section}-q${index + 1}`,
      }));
    const vocabularyKanji = decorate(payload.sections.vocabularyKanji, "vk");
    const grammarReading = decorate(payload.sections.grammarReading, "gr");
    const listening = decorate(payload.sections.listening, "ls");
    const questionCount = vocabularyKanji.length + grammarReading.length + listening.length;

    await JlptTestModel.updateOne(
      { _id: objectId },
      {
        $set: {
          level: payload.level,
          title: payload.title,
          sections: { vocabularyKanji, grammarReading, listening },
          sectionDefinitions: {
            vocabularyKanji: { key: "vocabulary-kanji", title: "Từ vựng + Kanji", sourceGroups: [...new Set(vocabularyKanji.map((item) => item.group))] },
            grammarReading: { key: "grammar-reading", title: "Ngữ pháp + Reading", sourceGroups: [...new Set(grammarReading.map((item) => item.group))] },
            listening: { key: "listening", title: "Nghe hiểu", sourceGroups: [...new Set(listening.map((item) => item.group))] },
          },
          questionCount,
          importedAt: new Date(),
        },
      },
    );
    await DeckModel.updateOne(
      { "jlptTest.testId": objectId },
      {
        $set: {
          title: payload.title,
          description: payload.description,
          visibility: payload.visibility,
          status: payload.status,
          level: testLevelToCourseLevel(payload.level),
          "jlptTest.level": payload.level,
          "stats.vocabularyCount": questionCount,
        },
      },
    );
    revalidateTag("courses", { expire: 0 });
    return NextResponse.json({
      data: { id, level: payload.level, number: existing.number, title: payload.title, questionCount, sectionCount: listening.length ? 3 : 2 },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message || "Dữ liệu đề thi chưa hợp lệ." }, { status: 400 });
    }
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể cập nhật đề thi." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/admin/jlpt-tests/[id]">) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) return invalidIdResponse();
    await connectMongoDB();
    const objectId = new Types.ObjectId(id);
    const test = await JlptTestModel.findOne(ownershipFilter(session, objectId)).select("_id").lean();
    if (!test) return NextResponse.json({ message: "Không tìm thấy đề thi." }, { status: 404 });

    await Promise.all([
      JlptTestModel.deleteOne({ _id: objectId }),
      DeckModel.deleteOne({ "jlptTest.testId": objectId }),
    ]);
    revalidateTag("courses", { expire: 0 });
    return NextResponse.json({ message: "Đã xóa đề thi." });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể xóa đề thi." }, { status: 500 });
  }
}
