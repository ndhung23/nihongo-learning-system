import { revalidateTag } from "next/cache";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError, requireAuth } from "@/lib/auth/session";
import { TEST_LEVELS, testLevelLabel, testLevelToCourseLevel } from "@/lib/jlptTestLevels";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";
import { JlptTestModel } from "@/models/JlptTest";
import { UserModel } from "@/models/User";

const QuestionSchema = z.object({
  group: z.string().trim().min(1, "Nhóm câu hỏi không được để trống.").max(100),
  instruction: z.string().trim().max(500).default(""),
  prompt: z.string().trim().min(1, "Nội dung câu hỏi không được để trống.").max(3000),
  highlightText: z.string().trim().max(300).default(""),
  imageUrl: z.string().trim().url().or(z.literal("")).default(""),
  audioUrl: z.string().trim().url().or(z.literal("")).default(""),
  options: z.array(z.string().trim().min(1).max(500))
    .min(2, "Mỗi câu hỏi cần ít nhất 2 lựa chọn.")
    .max(6, "Mỗi câu hỏi chỉ được có tối đa 6 lựa chọn."),
  correctIndex: z.coerce.number().int().min(0),
  explanation: z.string().trim().max(2000).default(""),
}).superRefine((question, context) => {
  if (question.correctIndex >= question.options.length) {
    context.addIssue({ code: "custom", path: ["correctIndex"], message: "Đáp án đúng không hợp lệ." });
  }
});

const CreateTestSchema = z.object({
  level: z.enum(TEST_LEVELS),
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().max(1000).default(""),
  visibility: z.enum(["private", "public", "unlisted"]).default("public"),
  status: z.enum(["draft", "published", "hidden"]).default("published"),
  accessMode: z.enum(["public", "private", "password", "invite"]).default("public"),
  password: z.string().min(4).max(100).optional(),
  invitedEmails: z.array(z.string().trim().email()).max(50).default([]),
  sections: z.object({
    vocabularyKanji: z.array(QuestionSchema),
    grammarReading: z.array(QuestionSchema),
    listening: z.array(QuestionSchema).default([]),
  }),
}).superRefine((test, context) => {
  if (test.sections.vocabularyKanji.length + test.sections.grammarReading.length + test.sections.listening.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["sections"],
      message: "Đề thi cần có ít nhất 1 câu hỏi.",
    });
  }
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    await connectMongoDB();
    const payload = CreateTestSchema.parse(await request.json());
    if (payload.accessMode === "password" && !payload.password) return NextResponse.json({ message: "Hãy nhập mật khẩu cho đề thi." }, { status: 400 });
    const normalizedEmails = [...new Set(payload.invitedEmails.map((email) => email.toLowerCase()))];
    const invitedUsers = payload.accessMode === "invite" ? await UserModel.find({ email: { $in: normalizedEmails } }).select("_id email").lean() : [];
    const foundEmails = new Set(invitedUsers.map((user) => user.email));
    const missingEmails = normalizedEmails.filter((email) => !foundEmails.has(email));
    if (missingEmails.length) return NextResponse.json({ message: `Email chưa tồn tại trong hệ thống: ${missingEmails.join(", ")}` }, { status: 400 });
    if (payload.accessMode === "invite" && !invitedUsers.length) return NextResponse.json({ message: "Hãy nhập ít nhất một email đã đăng ký." }, { status: 400 });
    const accessPasswordHash = payload.accessMode === "password" ? await bcrypt.hash(payload.password!, 12) : undefined;
    const latestTest = await JlptTestModel.findOne({ level: payload.level })
      .select("number")
      .sort({ number: -1 })
      .lean();
    const internalNumber = (latestTest?.number || 0) + 1;
    if (internalNumber > 999) {
      return NextResponse.json({ message: "Nhóm đề này đã đạt giới hạn lưu trữ." }, { status: 409 });
    }
    const decorate = (questions: z.infer<typeof QuestionSchema>[], section: "vk" | "gr" | "ls") =>
      questions.map((question, index) => ({ ...question, id: `${payload.level.toLowerCase()}-t${internalNumber}-${section}-q${index + 1}` }));
    const vocabularyKanji = decorate(payload.sections.vocabularyKanji, "vk");
    const grammarReading = decorate(payload.sections.grammarReading, "gr");
    const listening = decorate(payload.sections.listening, "ls");
    const questionCount = vocabularyKanji.length + grammarReading.length + listening.length;
    const test = await JlptTestModel.create({
      createdBy: session.userId,
      level: payload.level,
      number: internalNumber,
      title: payload.title,
      accessMode: payload.accessMode,
      accessPasswordHash,
      allowedUserIds: invitedUsers.map((user) => user._id),
      sourceFile: "admin-editor",
      sectionDefinitions: {
        vocabularyKanji: { key: "vocabulary-kanji", title: "Từ vựng + Kanji", sourceGroups: [...new Set(vocabularyKanji.map((item) => item.group))] },
        grammarReading: { key: "grammar-reading", title: "Ngữ pháp + Reading", sourceGroups: [...new Set(grammarReading.map((item) => item.group))] },
        listening: { key: "listening", title: "Nghe hiểu", sourceGroups: [...new Set(listening.map((item) => item.group))] },
      },
      sections: { vocabularyKanji, grammarReading, listening },
      questionCount,
      source: "private-import",
      importedAt: new Date(),
    });
    const ownerId = new Types.ObjectId(session.userId);
    const ownershipResult = await JlptTestModel.collection.updateOne(
      { _id: test._id },
      { $set: { createdBy: ownerId } },
    );
    if (ownershipResult.matchedCount !== 1) {
      await JlptTestModel.deleteOne({ _id: test._id });
      throw new Error("Không thể gán quyền sở hữu cho đề thi.");
    }
    try {
      await DeckModel.create({
        title: payload.title,
        slug: `de-thi-${payload.level.toLowerCase()}-${internalNumber}`,
        description: payload.description || "Luyện thi theo hai phần: Từ vựng + Kanji và Ngữ pháp + Reading.",
        level: testLevelToCourseLevel(payload.level),
        languagePair: { source: "ja", target: "vi" },
        sourceType: "system",
        visibility: payload.accessMode === "public" ? "public" : "private",
        accessMode: payload.accessMode,
        accessPasswordHash,
        allowedUserIds: invitedUsers.map((user) => user._id),
        status: payload.status,
        price: { amount: 0, currency: "VND" },
        tags: ["Đề thi", testLevelLabel(payload.level), "Test", "Từ vựng + Kanji"],
        contentType: "jlpt-test",
        ownerId: session.userId,
        jlptTest: { level: payload.level, number: internalNumber, testId: test._id },
        stats: { vocabularyCount: questionCount, learnerCount: 0 },
      });
    } catch (error) {
      await JlptTestModel.deleteOne({ _id: test._id });
      throw error;
    }
    revalidateTag("courses", { expire: 0 });
    return NextResponse.json({ data: { id: String(test._id), level: payload.level, number: internalNumber, title: payload.title, questionCount, sectionCount: listening.length ? 3 : 2 } }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    }
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      const sectionLabel = issue?.path[1] === "vocabularyKanji"
        ? "Từ vựng + Kanji"
        : issue?.path[1] === "grammarReading"
          ? "Ngữ pháp + Reading"
          : "";
      const questionIndex = typeof issue?.path[2] === "number" ? issue.path[2] + 1 : null;
      const location = sectionLabel && questionIndex ? `Phần ${sectionLabel}, câu ${questionIndex}: ` : "";
      const detail = issue?.message === "Invalid input" ? "Dữ liệu câu hỏi chưa đúng định dạng." : issue?.message;
      return NextResponse.json({
        message: `${location}${detail || "Dữ liệu đề thi chưa hợp lệ."}`,
        issues: error.issues,
      }, { status: 400 });
    }
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ message: "Có đề khác vừa được tạo cùng lúc. Hãy bấm lưu lại." }, { status: 409 });
    }
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể tạo đề thi." }, { status: 500 });
  }
}
