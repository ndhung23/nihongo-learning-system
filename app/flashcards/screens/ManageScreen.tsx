import { FiArrowLeft, FiSearch } from "react-icons/fi";
import { words } from "../data";

export function ManageScreen({ onBack }: Readonly<{ onBack: () => void }>) {
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
      <button className="mb-5 flex items-center gap-2 rounded-full px-2 py-1 text-sm font-bold text-slate-500 transition hover:text-rose-600" onClick={onBack} type="button">
        <FiArrowLeft /> Quay lại
      </button>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-700">Quản trị bộ từ</p>
          <h1 className="mt-2 text-4xl font-black">Danh sách từ vựng</h1>
        </div>
        <button className="rounded-2xl bg-rose-600 px-5 py-3 font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-700" type="button">
          Thêm từ
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 md:flex-row">
        <label className="flex h-14 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition-all duration-300 focus-within:border-teal-400">
          <FiSearch className="text-slate-400" />
          <input className="w-full bg-transparent outline-none" placeholder="Tìm từ vựng hoặc nghĩa..." />
        </label>
        <button className="rounded-2xl border border-slate-200 bg-white px-5 font-bold text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700" type="button">
          Tất cả từ vựng
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/[0.05]">
        <div className="hidden grid-cols-[1fr_1fr_1fr_1.4fr] bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500 md:grid">
          <span>Từ vựng & loại</span>
          <span>Nghĩa</span>
          <span>Phiên âm</span>
          <span>Câu ví dụ</span>
        </div>
        {words.map((word) => (
          <div className="grid gap-4 border-t border-slate-100 px-5 py-5 text-sm transition-colors hover:bg-rose-50/50 md:grid-cols-[1fr_1fr_1fr_1.4fr]" key={word.term}>
            <div>
              <p className="text-base font-black">{word.term}</p>
              <p className="font-bold text-rose-600">{word.type}</p>
            </div>
            <p>{word.meaning}</p>
            <p className="text-slate-500">{word.kana} / {word.romaji}</p>
            <div>
              <p>{word.example}</p>
              <p className="mt-1 text-slate-500">{word.exampleVi}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
