"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FiBook, FiClipboard, FiLayers, FiX } from "react-icons/fi";
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

export function Sidebar({ mobileOpen = false, onMobileClose }: Readonly<{ mobileOpen?: boolean; onMobileClose?: () => void }>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const sidebarItems = navItems.flatMap((item) => {
    if (item.screen !== "study") {
      return [{
        key: item.screen,
        href: routeByScreen[item.screen],
        icon: item.icon,
        label: labelByScreen[item.screen],
      }];
    }

    return [
      { key: "reading", href: "/flashcards/reading", icon: FiBook, label: "readingPractice" as MessageKey },
      { key: "tests", href: "/flashcards/discover?type=test", icon: FiClipboard, label: "testPractice" as MessageKey },
      { key: "vocabulary", href: "/flashcards/discover?type=flashcard", icon: FiLayers, label: "vocabularyPractice" as MessageKey },
    ];
  });

  return (
    <>
    {mobileOpen && <button aria-label="Đóng menu" className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden" onClick={onMobileClose} type="button" />}
    <aside className={`group/sidebar fixed inset-y-0 left-0 z-50 flex h-screen w-[min(86vw,320px)] flex-col overflow-hidden border-r border-slate-800 bg-slate-950 px-3 py-4 text-white shadow-[18px_0_60px_rgba(15,23,42,0.28)] transition-transform duration-200 ease-out lg:sticky lg:z-30 lg:w-[64px] lg:px-2 lg:transition-[width] lg:hover:w-60 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <button aria-label="Đóng menu" className="absolute right-3 top-4 grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white lg:hidden" onClick={onMobileClose} type="button"><FiX /></button>
      <Link className="group mb-5 flex h-12 items-center gap-3 overflow-hidden rounded-xl px-1.5 text-left" href="/flashcards">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e11d48] text-lg font-black text-white shadow-lg shadow-rose-600/20 transition duration-150 group-hover:-translate-y-0.5 group-hover:rotate-3">
          日
        </span>
        <span className="whitespace-nowrap opacity-100 transition duration-200 lg:opacity-0 lg:group-hover/sidebar:opacity-100">
          <span className="block text-xl font-black leading-5 tracking-tight text-white">Nihongo</span>
          <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-teal-600">Learning</span>
        </span>
      </Link>

      <nav className="space-y-1">
        {sidebarItems.map((item) => {
          const expectedType = item.key === "tests" ? "test" : item.key === "vocabulary" ? "flashcard" : "";
          const isActive = (item.key === "library" && pathname === "/") || pathname === item.href ||
            (pathname === "/flashcards/discover" && expectedType === searchParams.get("type"));
          const Icon = item.icon;

          return (
            <Link
              className={`group flex h-11 w-full items-center gap-3 overflow-hidden rounded-xl px-2 text-left text-sm font-bold transition-all duration-150 ${
                isActive
                  ? "bg-rose-600 text-white shadow-xl shadow-rose-950/25"
                  : "text-slate-300 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
              }`}
              href={item.href}
              key={item.key}
              onClick={onMobileClose}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition duration-150 ${isActive ? "bg-white/15" : "bg-white/8 group-hover:bg-white/12"}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="whitespace-nowrap opacity-100 transition duration-150 lg:opacity-0 lg:group-hover/sidebar:opacity-100">{t(item.label)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-300/10 p-3 opacity-100 transition duration-150 lg:opacity-0 lg:group-hover/sidebar:opacity-100">
        <p className="text-xs font-black text-amber-900">{t("todayStreak")}</p>
        <div className="mt-3 flex items-end gap-1.5">
          {[30, 45, 35, 62, 50, 78, 58].map((height, index) => (
            <div className="flex-1 rounded-full bg-amber-200" key={index} style={{ height: Math.round(height * 0.65) }} />
          ))}
        </div>
        <p className="mt-3 text-[10px] font-semibold leading-4 text-amber-100/80">
          {t("streakDescription")}
        </p>
      </div>

    </aside>
    </>
  );
}
