import Link from "next/link";
import { FiArrowLeft, FiBookOpen } from "react-icons/fi";
import { connectMongoDB } from "@/lib/mongodb";
import { JlptTestModel } from "@/models/JlptTest";

export const dynamic = "force-dynamic";

export default async function JlptTestsPage() {
  await connectMongoDB();
  const tests = await JlptTestModel.find({})
    .select({ level: 1, number: 1, title: 1, questionCount: 1 })
    .sort({ level: -1, number: 1 })
    .lean();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <Link
        className="inline-flex items-center gap-2 text-sm font-black text-slate-600 hover:text-rose-600"
        href="/flashcards"
      >
        <FiArrowLeft /> Quay lại khóa học
      </Link>
      <h1 className="mt-6 text-4xl font-black text-slate-950">
        Đề thi JLPT minh họa
      </h1>
      <p className="mt-3 text-slate-500">
        Chọn đề và làm riêng phần Từ vựng + Kanji hoặc Ngữ pháp + Reading.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tests.map((test) => (
          <Link
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg transition hover:-translate-y-1 hover:border-teal-300"
            href={`/flashcards/tests/${test.level.toLowerCase()}/${test.number}`}
            key={test._id.toString()}
          >
            <FiBookOpen className="text-2xl text-teal-700" />
            <h2 className="mt-4 text-xl font-black text-slate-950">
              Đề thi {test.level} minh họa số {test.number}
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-500">
              {test.questionCount} câu · 2 phần thi
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
