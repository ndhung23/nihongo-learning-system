"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "../data";

const routeByScreen = {
  library: "/flashcards",
  add: "/flashcards/add",
  study: "/flashcards/study",
  manage: "/flashcards/manage",
} as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-slate-200/80 bg-white/86 px-5 py-6 shadow-[18px_0_60px_rgba(15,23,42,0.04)] backdrop-blur-xl lg:flex lg:flex-col">
      <Link className="group mb-10 flex items-center gap-3 text-left" href="/flashcards">
        <span className="grid h-14 w-14 place-items-center rounded-[1.35rem] bg-[#e11d48] text-2xl font-black text-white shadow-xl shadow-rose-600/20 transition duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
          日
        </span>
        <span>
          <span className="block text-2xl font-black tracking-tight text-slate-950">Nihongo</span>
          <span className="block text-xs font-bold uppercase tracking-[0.22em] text-teal-600">Learning</span>
        </span>
      </Link>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const href = routeByScreen[item.screen];
          const isActive = pathname === href;
          const Icon = item.icon;

          return (
            <Link
              className={`group flex h-14 w-full items-center gap-4 rounded-2xl px-4 text-left font-bold transition-all duration-300 ${
                isActive
                  ? "bg-slate-950 text-white shadow-xl shadow-slate-900/12"
                  : "text-slate-600 hover:-translate-y-0.5 hover:bg-rose-50 hover:text-rose-700"
              }`}
              href={href}
              key={item.label}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-xl transition duration-300 ${isActive ? "bg-white/12" : "bg-slate-100 group-hover:bg-white"}`}>
                <Icon className="h-5 w-5" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-black text-amber-900">Streak hôm nay</p>
        <div className="mt-4 flex items-end gap-2">
          {[30, 45, 35, 62, 50, 78, 58].map((height, index) => (
            <div className="flex-1 rounded-full bg-amber-200" key={index} style={{ height }} />
          ))}
        </div>
        <p className="mt-4 text-xs font-semibold leading-5 text-amber-800">
          Giữ 12 ngày liên tiếp. Hoàn thành 10 từ nữa để nhận thêm điểm nước.
        </p>
      </div>

      <div className="mt-auto rounded-[1.5rem] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-900/18">
        <p className="text-sm font-black">Creator roadmap</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Sau khi ổn flashcard, mình sẽ nối khóa học, review và marketplace.
        </p>
      </div>
    </aside>
  );
}
