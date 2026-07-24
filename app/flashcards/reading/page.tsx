import Link from "next/link";
import { FiBookOpen, FiClock, FiHome } from "react-icons/fi";

export default function ReadingPracticePage() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-5xl place-items-center px-4 py-12 sm:px-6">
      <section className="w-full rounded-[2.5rem] border border-teal-200 bg-white p-8 text-center shadow-2xl shadow-teal-500/10 sm:p-12 dark:border-teal-900 dark:bg-slate-900">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-500 text-3xl text-white shadow-xl shadow-teal-500/25">
          <FiBookOpen />
        </span>
        <p className="mt-7 text-xs font-black uppercase tracking-[0.28em] text-teal-700">Luyện đọc tiếng Nhật</p>
        <h1 className="mt-3 text-4xl font-black text-slate-950 dark:text-white">Tính năng đang được phát triển</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-500 dark:text-slate-300">
          Khu vực luyện đọc sẽ có bài đọc theo cấp độ JLPT, furigana, từ vựng gợi ý và câu hỏi kiểm tra nội dung.
        </p>
        <div className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full bg-amber-100 px-5 py-3 font-black text-amber-800">
          <FiClock /> Sắp ra mắt
        </div>
        <div className="mt-8">
          <Link className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 font-black text-white transition hover:-translate-y-0.5 hover:bg-teal-700" href="/flashcards">
            <FiHome /> Về trang chủ
          </Link>
        </div>
      </section>
    </div>
  );
}
