import { FiFolder, FiPlus, FiTarget } from "react-icons/fi";
import { decks } from "../data";
import type { StudyMode } from "../types";
import { ActionCard, DeckCard, MetricCard } from "../components/Cards";
import { DailyPanel } from "../components/DailyPanel";

export function LibraryScreen({
  onAdd,
  onManage,
  onStudy,
}: Readonly<{
  onAdd: () => void;
  onManage: () => void;
  onStudy: (mode?: StudyMode) => void;
}>) {
  return (
    <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-10">
      <section className="min-w-0">
        <div className="rounded-[2rem] border border-slate-200 bg-white/88 p-6 shadow-2xl shadow-slate-900/[0.05] backdrop-blur">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-600">Luyện tiếng Nhật mỗi ngày</p>
              <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Xây tủ từ vựng của riêng bạn.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Học bằng flashcard, chọn nghĩa, gõ từ và tự đặt câu. Mỗi thẻ có kana, romaji, ví dụ và trạng thái ôn tập.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button className="rounded-2xl bg-rose-600 px-5 py-3 font-black text-white shadow-xl shadow-rose-600/20 transition-all duration-300 hover:-translate-y-1 hover:bg-rose-700" onClick={() => onStudy("meaning")} type="button">
                  Bắt đầu luyện
                </button>
                <button className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-700 transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:text-teal-700 hover:shadow-xl hover:shadow-teal-500/10" onClick={onAdd} type="button">
                  Thêm từ mới
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <MetricCard label="Tổng từ" value="914" tone="bg-rose-50 text-rose-700" />
              <MetricCard label="Cần học" value="913" tone="bg-teal-50 text-teal-700" />
              <MetricCard label="Cần ôn" value="1" tone="bg-amber-50 text-amber-700" />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <ActionCard icon={FiTarget} title="Phiên hôm nay" text="1 từ đang chờ ôn theo SRS." action="Ôn tập ngay" onClick={() => onStudy("meaning")} />
          <ActionCard icon={FiFolder} title="Khám phá bộ" text="JLPT, Kanji, Kaiwa và IT Japanese." action="Xem bộ gợi ý" />
          <ActionCard icon={FiPlus} title="Tạo bộ mới" text="Tự nhập từ hoặc import từ file." action="Tạo bộ" onClick={onAdd} />
        </div>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-700">Tủ sách cá nhân</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Bộ từ đang học</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Cá nhân", "JLPT", "Kanji", "Ngữ pháp", "Cộng đồng"].map((tab, index) => (
              <button
                className={`rounded-full border px-4 py-2 text-sm font-bold transition-all duration-300 ${
                  index === 0
                    ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/10"
                    : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-rose-300 hover:text-rose-700"
                }`}
                key={tab}
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {decks.map((deck, index) => (
            <DeckCard
              deck={deck}
              key={deck.title}
              onManage={onManage}
              onStudy={() => onStudy(index === 0 ? "meaning" : "flashcard")}
            />
          ))}
          <button className="group min-h-72 rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-teal-400 hover:bg-white hover:shadow-2xl hover:shadow-teal-500/10" onClick={onAdd} type="button">
            <span className="mx-auto mt-16 grid h-16 w-16 place-items-center rounded-2xl bg-teal-50 text-3xl text-teal-700 transition-all duration-300 group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white">
              <FiPlus />
            </span>
            <span className="mt-5 block text-lg font-black">Tạo bộ từ mới</span>
            <span className="mt-2 block text-sm text-slate-500">Nhập thủ công hoặc import CSV</span>
          </button>
        </div>
      </section>

      <DailyPanel />
    </div>
  );
}
