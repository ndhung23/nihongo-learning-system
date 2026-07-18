import { notFound } from "next/navigation";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";
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
    !/^N[1-5]$/.test(level) ||
    !Number.isInteger(testNumber) ||
    testNumber < 1
  ) {
    notFound();
  }

  await connectMongoDB();
  const course = await DeckModel.findOne({
    contentType: "jlpt-test",
    "jlptTest.level": level,
    "jlptTest.number": testNumber,
    status: "published",
    visibility: "public",
  })
    .select({ _id: 1 })
    .lean();

  if (!course) {
    notFound();
  }

  return (
    <JlptTestClient
      courseId={course._id.toString()}
      level={level}
      testNumber={testNumber}
    />
  );
}
