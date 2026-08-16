import Link from "next/link";
import { FiArrowLeft, FiBookOpen } from "react-icons/fi";
import { AdminJlptTestsClient } from "@/app/admin/jlpt-tests/AdminJlptTestsClient";
import { getAuthSession } from "@/lib/auth/session";
import { parseTestLevel } from "@/lib/jlptTestLevels";
import { connectMongoDB } from "@/lib/mongodb";
import { JlptTestModel } from "@/models/JlptTest";
import { LocalizedText } from "../i18n/LanguageProvider";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 9;

export default async function JlptTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const session = await getAuthSession({ resolvePermissions: false });
  const params = await searchParams;
  const query = String(params.q || "").trim().slice(0, 100);
  const requestedPage = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);

  if (!session) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <Link className="inline-flex items-center gap-2 text-sm font-black text-slate-600 hover:text-rose-600" href="/flashcards">
          <FiArrowLeft /> Quay lại khóa học
        </Link>
        <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center" data-scroll-reveal>
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
  const communityFilter = {
    createdBy: { $ne: session.userId },
    accessMode: "public",
    ...(query ? { $or: [{ title: { $regex: escapedQuery, $options: "i" } }, { level: queriedLevel || query.toUpperCase() }] } : {}),
  };
  const communityTests = await JlptTestModel.find(communityFilter)
    .select({ level: 1, number: 1, title: 1, questionCount: 1, "sections.listening": 1 })
    .sort({ updatedAt: -1, _id: -1 })
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
      <section className="mt-14 border-t border-slate-200 pt-9">
        <div data-scroll-reveal>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-600">Cộng đồng</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Đề thi cộng đồng</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Các đề thi công khai được chia sẻ bởi người học khác.</p>
        </div>
        {communityTests.length ? <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-scroll-reveal-stagger>{communityTests.map((test) => <Link className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/[0.04] transition hover:-translate-y-1 hover:border-teal-300" data-scroll-reveal-item href={`/flashcards/tests/${test.level.toLowerCase()}/${test.number}`} key={test._id.toString()}><span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-xl text-teal-700"><FiBookOpen /></span><div className="mt-5 flex items-start justify-between gap-3"><h3 className="text-xl font-black text-slate-950">{test.title}</h3><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase text-rose-700">{test.level}</span></div><p className="mt-4 text-sm font-bold text-slate-500"><LocalizedText text={`${test.questionCount} câu`} /> · <LocalizedText text={`${test.sections?.listening?.length ? 3 : 2} phần`} /></p><span className="mt-5 flex h-11 items-center justify-center rounded-2xl bg-slate-950 font-black text-white">Làm đề</span></Link>)}</div> : <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center font-bold text-slate-500" data-scroll-reveal>Chưa có đề thi công khai từ cộng đồng.</div>}
      </section>
    </main>
  );
}
