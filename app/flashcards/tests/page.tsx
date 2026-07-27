import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { AdminJlptTestsClient } from "@/app/admin/jlpt-tests/AdminJlptTestsClient";
import { getAuthSession } from "@/lib/auth/session";
import { parseTestLevel } from "@/lib/jlptTestLevels";
import { connectMongoDB } from "@/lib/mongodb";
import { JlptTestModel } from "@/models/JlptTest";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 9;

export default async function JlptTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const session = await getAuthSession();
  const params = await searchParams;
  const query = String(params.q || "").trim().slice(0, 100);
  const requestedPage = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);

  if (!session) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <Link className="inline-flex items-center gap-2 text-sm font-black text-slate-600 hover:text-rose-600" href="/flashcards">
          <FiArrowLeft /> Quay lại khóa học
        </Link>
        <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h1 className="text-2xl font-black text-slate-950">Bạn chưa đăng nhập</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">Hãy đăng nhập để tạo và quản lý đề thi của bạn.</p>
        </section>
      </main>
    );
  }

  await connectMongoDB();
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const queriedLevel = parseTestLevel(query);
  const filter = {
    createdBy: session.userId,
    ...(query ? {
      $or: [
        { title: { $regex: escapedQuery, $options: "i" } },
        { level: queriedLevel || query.toUpperCase() },
      ],
    } : {}),
  };
  const totalTests = await JlptTestModel.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalTests / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const tests = await JlptTestModel.find(filter)
    .select({ level: 1, number: 1, title: 1, questionCount: 1, "sections.listening": 1 })
    .sort({ updatedAt: -1, _id: -1 })
    .skip((currentPage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <Link className="mb-6 inline-flex items-center gap-2 text-sm font-black text-slate-600 hover:text-rose-600" href="/flashcards">
        <FiArrowLeft /> Quay lại khóa học
      </Link>
      <AdminJlptTestsClient
        currentPage={currentPage}
        initialTests={tests.map((test) => ({
          id: test._id.toString(),
          level: test.level,
          number: test.number,
          title: test.title,
          questionCount: test.questionCount,
          sectionCount: test.sections?.listening?.length ? 3 : 2,
        }))}
        personal
        query={query}
        totalPages={totalPages}
        totalTests={totalTests}
      />
    </main>
  );
}
