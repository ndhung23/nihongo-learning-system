import type { IconType } from "react-icons";
import { FiBookOpen, FiBookmark, FiChevronRight, FiLink } from "react-icons/fi";
import type { Deck } from "../types";

export function MetricCard({ label, tone, value }: Readonly<{ label: string; tone: string; value: string }>) {
  return (
    <div className={`rounded-[1.5rem] p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 ${tone}`}>
      <p className="text-3xl font-black">{value}</p>
      <p className="text-xs font-black uppercase tracking-widest opacity-70">{label}</p>
    </div>
  );
}

export function ActionCard({
  action,
  icon: Icon,
  onClick,
  text,
  title,
}: Readonly<{
  action: string;
  icon: IconType;
  onClick?: () => void;
  text: string;
  title: string;
}>) {
  return (
    <article className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/[0.04] transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-2xl hover:shadow-teal-500/10">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-xl text-teal-700 transition-all duration-300 group-hover:bg-teal-600 group-hover:text-white">
        <Icon />
      </span>
      <h3 className="mt-5 text-xl font-black">{title}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{text}</p>
      <button className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 font-black text-slate-700 transition-all duration-300 group-hover:bg-slate-950 group-hover:text-white" onClick={onClick} type="button">
        {action} <FiChevronRight />
      </button>
    </article>
  );
}

export function DeckCard({
  deck,
  onManage,
  onStudy,
}: Readonly<{
  deck: Deck;
  onManage: () => void;
  onStudy: () => void;
}>) {
  const accentClass = {
    red: "from-rose-500 to-red-500",
    green: "from-teal-500 to-emerald-500",
    blue: "from-sky-500 to-blue-500",
    violet: "from-violet-500 to-indigo-500",
    amber: "from-amber-500 to-orange-500",
  }[deck.accent];

  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.05] transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-2xl hover:shadow-teal-500/10">
      <div className={`h-2 bg-gradient-to-r ${accentClass}`} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 text-3xl text-slate-800 transition-all duration-300 group-hover:bg-slate-950 group-hover:text-white">
            <FiBookOpen />
          </span>
          <div className="flex gap-3 text-slate-400">
            <FiBookmark className="transition hover:text-rose-600" />
            <FiLink className="transition hover:text-teal-700" />
          </div>
        </div>
        <h3 className="mt-5 text-lg font-black">{deck.title}</h3>
        <p className="mt-3 text-sm text-slate-500">
          {deck.total} từ ·{" "}
          <button className="font-black text-teal-700 underline decoration-teal-300 underline-offset-4 transition hover:text-rose-700" onClick={onManage} type="button">
            Danh sách
          </button>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {deck.tags.map((tag) => (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-7 grid grid-cols-2 gap-2">
          <button className="rounded-2xl border border-teal-200 bg-teal-50 p-3 text-center font-black text-teal-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-100" onClick={onStudy} type="button">
            <span className="block text-2xl">{deck.newWords}</span>
            <span className="text-xs uppercase">Học mới</span>
          </button>
          <button className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-center font-black text-rose-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-100" onClick={onStudy} type="button">
            <span className="block text-2xl">{deck.review}</span>
            <span className="text-xs uppercase">Ôn tập</span>
          </button>
        </div>
      </div>
    </article>
  );
}
