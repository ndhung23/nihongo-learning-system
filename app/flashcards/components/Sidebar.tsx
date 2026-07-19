"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "../data";
import { type MessageKey, useLanguage } from "../i18n/LanguageProvider";

const routeByScreen = {
  library: "/flashcards",
  add: "/flashcards/add",
  study: "/flashcards/study",
  manage: "/flashcards/manage",
  shop: "/flashcards/shop",
} as const;

const labelByScreen: Record<keyof typeof routeByScreen, MessageKey> = {
  library: "library",
  add: "addWord",
  study: "practice",
  manage: "list",
  shop: "coinShop",
};

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <aside className="group/sidebar sticky top-0 z-30 hidden h-screen w-[72px] overflow-hidden border-r border-slate-800 bg-slate-950 px-2 py-5 text-white shadow-[18px_0_60px_rgba(15,23,42,0.16)] transition-[width] duration-300 ease-out lg:flex lg:flex-col lg:hover:w-72">
      <Link className="group mb-9 flex h-14 items-center gap-3 overflow-hidden rounded-2xl px-2 text-left" href="/flashcards">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#e11d48] text-xl font-black text-white shadow-xl shadow-rose-600/20 transition duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
          日
        </span>
        <span className="whitespace-nowrap opacity-0 transition duration-200 group-hover/sidebar:opacity-100">
          <span className="block text-2xl font-black tracking-tight text-white">Nihongo</span>
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
              className={`group flex h-14 w-full items-center gap-4 overflow-hidden rounded-2xl px-3 text-left font-bold transition-all duration-300 ${
                isActive
                  ? "bg-rose-600 text-white shadow-xl shadow-rose-950/25"
                  : "text-slate-300 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
              }`}
              href={href}
              key={item.screen}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition duration-300 ${isActive ? "bg-white/15" : "bg-white/8 group-hover:bg-white/12"}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="whitespace-nowrap opacity-0 transition duration-200 group-hover/sidebar:opacity-100">{t(labelByScreen[item.screen])}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-[1.5rem] border border-amber-400/30 bg-amber-300/10 p-4 opacity-0 transition duration-200 group-hover/sidebar:opacity-100">
        <p className="text-sm font-black text-amber-900">{t("todayStreak")}</p>
        <div className="mt-4 flex items-end gap-2">
          {[30, 45, 35, 62, 50, 78, 58].map((height, index) => (
            <div className="flex-1 rounded-full bg-amber-200" key={index} style={{ height }} />
          ))}
        </div>
        <p className="mt-4 text-xs font-semibold leading-5 text-amber-100/80">
          {t("streakDescription")}
        </p>
      </div>

    </aside>
  );
}
