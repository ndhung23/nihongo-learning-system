import { connectMongoDB } from "@/lib/mongodb";
import { JlptTestModel } from "@/models/JlptTest";
import { AdminJlptTestsClient } from "./AdminJlptTestsClient";

export default async function AdminJlptTestsPage() {
  await connectMongoDB();
  const tests = await JlptTestModel.find({}).select("level number title questionCount").sort({ level: -1, number: 1 }).lean();
  return <AdminJlptTestsClient initialTests={tests.map((test) => ({
    id: String(test._id),
    level: test.level as "N5" | "N4" | "N3" | "N2" | "N1",
    number: test.number,
    title: test.title,
    questionCount: test.questionCount,
  }))} />;
}
