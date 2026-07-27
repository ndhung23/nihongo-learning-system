import { notFound } from "next/navigation";
import { isTestLevel } from "@/lib/jlptTestLevels";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";
import { JlptTestModel } from "@/models/JlptTest";
import { JlptTestClient } from "./JlptTestClient";

export default async function JlptTestPage({
  params,
}: Readonly<{
  params: Promise<{ level: string; testNumber: string }>;
}>) {
  const { level: rawLevel, testNumber: rawTestNumber } = await params;
  const level = rawLevel.toUpperCase();
  const testNumber = Number(rawTestNumber);

  if (
    !isTestLevel(level) ||
    !Number.isInteger(testNumber) ||
    testNumber < 1
  ) {
    notFound();
  }

  await connectMongoDB();
  const [course, test] = await Promise.all([
    DeckModel.findOne({
      contentType: "jlpt-test",
      "jlptTest.level": level,
      "jlptTest.number": testNumber,
      status: "published",
      visibility: "public",
    }).select({ _id: 1 }).lean(),
    JlptTestModel.findOne({ level, number: testNumber }).select({ title: 1, "sections.listening": 1 }).lean(),
  ]);

  if (!course) {
    notFound();
  }

  return (
    <JlptTestClient
      courseId={course._id.toString()}
      hasListening={Boolean(test?.sections?.listening?.length)}
      level={level}
      testTitle={test?.title || "Đề thi"}
      testNumber={testNumber}
    />
  );
}
