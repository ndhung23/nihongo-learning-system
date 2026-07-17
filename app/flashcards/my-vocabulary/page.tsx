import Link from "next/link";
import { FiEdit3, FiPlus } from "react-icons/fi";

export default function MyVocabularyPage() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-600">Cá nhân</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Từ vựng riêng tôi</h1>
          <p className="mt-3 max-w-2xl text-slate-500">Nơi quản lý các từ bạn tự thêm, ghi chú riêng và ví dụ cá nhân.</p>
        </div>
        <Link className="inline-flex h-12 items-center gap-2 rounded-2xl bg-rose-600 px-5 font-black text-white shadow-xl shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700" href="/flashcards/add">
          <FiPlus /> Thêm từ mới
        </Link>
      </div>

      <section className="mt-8 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-xl shadow-slate-900/[0.04]">
        <FiEdit3 className="mx-auto h-10 w-10 text-teal-600" />
        <h2 className="mt-4 text-2xl font-black text-slate-950">Chưa có từ riêng</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">Các từ bạn tự tạo sẽ được gom ở đây để học và chỉnh sửa nhanh.</p>
      </section>
    </div>
  );
}
