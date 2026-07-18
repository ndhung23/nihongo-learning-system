import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { JlptTestModel } from "@/models/JlptTest";

const sectionMap = {
  "vocabulary-kanji": "vocabularyKanji",
  "grammar-reading": "grammarReading",
} as const;

type PublicSection = keyof typeof sectionMap;

export async function GET(
  request: Request,
  context: RouteContext<"/api/jlpt-tests/[level]/[testNumber]">,
) {
  const { level: rawLevel, testNumber: rawTestNumber } = await context.params;
  const level = rawLevel.toUpperCase();
  const testNumber = Number(rawTestNumber);
  const requestedSection = new URL(request.url).searchParams.get("section");

  if (
    !/^N[1-5]$/.test(level) ||
    !Number.isInteger(testNumber) ||
    testNumber < 1 ||
    !requestedSection ||
    !(requestedSection in sectionMap)
  ) {
    return NextResponse.json(
      { ok: false, message: "Tham số đề thi không hợp lệ." },
      { status: 400 },
    );
  }

  const section = requestedSection as PublicSection;
  const databaseKey = sectionMap[section];

  await connectMongoDB();

  const test = await JlptTestModel.findOne({ level, number: testNumber })
    .select({
      level: 1,
      number: 1,
      title: 1,
      [`sectionDefinitions.${databaseKey}`]: 1,
      [`sections.${databaseKey}.id`]: 1,
      [`sections.${databaseKey}.group`]: 1,
      [`sections.${databaseKey}.instruction`]: 1,
      [`sections.${databaseKey}.prompt`]: 1,
      [`sections.${databaseKey}.highlightText`]: 1,
      [`sections.${databaseKey}.options`]: 1,
    })
    .lean();

  if (!test) {
    return NextResponse.json(
      { ok: false, message: "Không tìm thấy đề thi." },
      { status: 404 },
    );
  }

  const sections = test.sections as Record<string, unknown[]>;
  const definitions = test.sectionDefinitions as Record<string, unknown>;

  return NextResponse.json(
    {
      ok: true,
      test: {
        level: test.level,
        number: test.number,
        title: test.title,
        section,
        definition: definitions[databaseKey],
        questions: sections[databaseKey] ?? [],
      },
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
