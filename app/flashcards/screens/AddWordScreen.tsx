import { FiArrowLeft, FiBookmark, FiZap } from "react-icons/fi";
import { FormField } from "../components/FormField";

export function AddWordScreen({ onBack }: Readonly<{ onBack: () => void }>) {
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
      <button className="mb-5 flex items-center gap-2 rounded-full px-2 py-1 text-sm font-bold text-slate-500 transition hover:text-rose-600" onClick={onBack} type="button">
        <FiArrowLeft /> Quay lại
      </button>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-600">Tạo dữ liệu học</p>
          <h1 className="mt-2 text-4xl font-black">Thêm từ mới</h1>
        </div>
        <button className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 font-black text-indigo-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-100" type="button">
          Import CSV
        </button>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/[0.05]">
        <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Từ vựng & trợ lý AI</label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input className="h-13 flex-1 rounded-2xl border border-slate-200 px-4 outline-none transition-all duration-300 focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10" placeholder="Nhập một từ tiếng Nhật..." />
          <button className="rounded-2xl bg-teal-600 px-6 py-3 font-black text-white shadow-lg shadow-teal-600/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-700" type="button">
            <FiZap className="mr-2 inline" /> Gợi ý AI
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_440px]">
        <form className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/[0.05]">
          <FormField label="Từ loại" placeholder="n, v, adj, adv..." />
          <FormField label="Nghĩa tiếng Việt" placeholder="Nghĩa ngắn gọn..." />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Kana" placeholder="かな..." />
            <FormField label="Romaji" placeholder="romaji..." />
          </div>
          <FormField label="Ví dụ" placeholder="Ví dụ chứa từ vựng..." textarea />
          <FormField label="Dịch nghĩa ví dụ" placeholder="VD: Tôi học tiếng Nhật mỗi ngày" />
        </form>

        <div className="grid min-h-96 place-items-center rounded-[2rem] border border-dashed border-teal-300 bg-teal-50/60 p-6 text-center">
          <div>
            <FiBookmark className="mx-auto h-12 w-12 text-teal-500" />
            <p className="mt-4 font-black text-slate-600">Preview thẻ học</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">Ảnh, ví dụ và từ liên quan sẽ hiện ở đây sau khi nhập dữ liệu.</p>
          </div>
        </div>
      </div>

      <button className="mt-5 h-14 w-full rounded-2xl bg-slate-950 font-black text-white shadow-xl shadow-slate-900/12 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-700" type="button">
        Lưu vào bộ từ
      </button>
    </div>
  );
}
