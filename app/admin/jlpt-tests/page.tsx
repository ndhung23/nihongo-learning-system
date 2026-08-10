import { connectMongoDB } from "@/lib/mongodb";
import type { TestLevel } from "@/lib/jlptTestLevels";
import { JlptTestModel } from "@/models/JlptTest";
import { AdminJlptTestsClient } from "./AdminJlptTestsClient";
import { requireAdminPage } from "@/lib/admin/page-auth";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminJlptTestsPage({ searchParams }: Readonly<{ searchParams: SearchParams }>) {
  await requireAdminPage("admin:jlpt-test:read");
  const params = await searchParams;
  await connectMongoDB();
  const tests = await JlptTestModel.find({}).select("level number title questionCount sections.listening").sort({ updatedAt: -1, _id: -1 }).lean();
  return <AdminJlptTestsClient initialTests={tests.map((test) => ({
    id: String(test._id),
    level: test.level as TestLevel,
    number: test.number,
    title: test.title,
    questionCount: test.questionCount,
    sectionCount: test.sections?.listening?.length ? 3 : 2,
  }))} initialCreate={firstParam(params.create) === "1"} />;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}
