import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireAuth } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { JlptTestModel } from "@/models/JlptTest";

const sectionMap = {
  "vocabulary-kanji": "vocabularyKanji",
  "grammar-reading": "grammarReading",
} as const;

const bodySchema = z.object({
  section: z.enum(["vocabulary-kanji", "grammar-reading"]),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1).max(100),
        selectedIndex: z.number().int().min(0).max(20),
      }),
    )
    .max(200),
});

type PrivateQuestion = {
  id: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export async function POST(
  request: Request,
  context: RouteContext<"/api/jlpt-tests/[level]/[testNumber]/grade">,
) {
  try {
    await requireAuth();

    const { level: rawLevel, testNumber: rawTestNumber } =
      await context.params;
    const level = rawLevel.toUpperCase();
    const testNumber = Number(rawTestNumber);

    if (
      !/^N[1-5]$/.test(level) ||
      !Number.isInteger(testNumber) ||
      testNumber < 1
    ) {
      return NextResponse.json(
        { ok: false, message: "Tham số đề thi không hợp lệ." },
        { status: 400 },
      );
    }

    const parsedBody = bodySchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { ok: false, message: "Dữ liệu nộp bài không hợp lệ." },
        { status: 400 },
      );
    }

    await connectMongoDB();

    const databaseSection = sectionMap[parsedBody.data.section];
    const test = await JlptTestModel.collection.findOne(
      { level, number: testNumber },
      {
        projection: {
          title: 1,
          [`sections.${databaseSection}`]: 1,
        },
      },
    );

    if (!test) {
      return NextResponse.json(
        { ok: false, message: "Không tìm thấy đề thi." },
        { status: 404 },
      );
    }

    const sectionData = test.sections as Record<string, PrivateQuestion[]>;
    const questions = sectionData[databaseSection] ?? [];
    const questionsById = new Map(
      questions.map((question) => [question.id, question]),
    );
    const uniqueAnswers = new Map(
      parsedBody.data.answers.map((answer) => [
        answer.questionId,
        answer.selectedIndex,
      ]),
    );

    const results = [...uniqueAnswers].flatMap(
      ([questionId, selectedIndex]) => {
        const question = questionsById.get(questionId);
        if (!question || selectedIndex >= question.options.length) {
          return [];
        }

        return [
          {
            questionId,
            selectedIndex,
            correct: selectedIndex === question.correctIndex,
            correctIndex: question.correctIndex,
            explanation: question.explanation ?? "",
          },
        ];
      },
    );
    const correctCount = results.filter((result) => result.correct).length;

    return NextResponse.json(
      {
        ok: true,
        summary: {
          answered: results.length,
          total: questions.length,
          correct: correctCount,
          percentage:
            questions.length > 0
              ? Math.round((correctCount / questions.length) * 100)
              : 0,
        },
        results,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { ok: false, message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    return NextResponse.json(
      { ok: false, message: "Không thể chấm bài lúc này." },
      { status: 500 },
    );
  }
}
