"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ApiActivityIndicator } from "./ApiActivityIndicator";
import { LanguageProvider } from "../i18n/LanguageProvider";

const DictionaryPanel = dynamic(
  () => import("./DictionaryPanel").then((module) => module.DictionaryPanel),
  { ssr: false },
);
const AiChatbox = dynamic(
  () => import("./AiChatbox").then((module) => module.AiChatbox),
  { ssr: false },
);

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [dictionaryPinned, setDictionaryPinned] = useState(false);
  const [dictionaryPreferenceKey, setDictionaryPreferenceKey] = useState("nihongo-dictionary-pinned:guest");

  useEffect(() => {
    const initialTheme = window.localStorage.getItem("nihongo-theme") === "dark" ? "dark" : "light";
    queueMicrotask(() => setTheme(initialTheme));

    async function loadDictionaryPreference() {
      let owner = "guest";
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json() as { user?: { userId?: string; id?: string } };
          owner = payload.user?.userId || payload.user?.id || "guest";
        }
      } catch {
        owner = "guest";
      }

      const preferenceKey = `nihongo-dictionary-pinned:${owner}`;
      setDictionaryPreferenceKey(preferenceKey);
      setDictionaryPinned(window.localStorage.getItem(preferenceKey) === "true");
    }

    void loadDictionaryPreference();
    window.addEventListener("nihongo-auth-changed", loadDictionaryPreference);
    return () => window.removeEventListener("nihongo-auth-changed", loadDictionaryPreference);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function toggleTheme() {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      window.localStorage.setItem("nihongo-theme", nextTheme);
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      return nextTheme;
    });
  }

  return (
    <LanguageProvider>
    <main className={`nihongo-app theme-${theme} min-h-screen bg-[#fbfaf5] text-slate-950 transition-colors duration-150 dark:bg-slate-950 dark:text-slate-100`}>
      <ApiActivityIndicator />
      <DictionaryPanel key={dictionaryPreferenceKey} onPinnedChange={setDictionaryPinned} pinned={dictionaryPinned} preferenceKey={dictionaryPreferenceKey} />
      <AiChatbox dictionaryPinned={dictionaryPinned} />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(225,29,72,0.08),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(20,184,166,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.4),transparent)] dark:bg-[radial-gradient(circle_at_16%_12%,rgba(244,63,94,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(45,212,191,0.12),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.78),transparent)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[64px_1fr]">
        <Suspense fallback={<div className="hidden w-[64px] bg-slate-950 lg:block" />}>
          <Sidebar />
        </Suspense>
        <section className={`min-w-0 transition-[padding] duration-150 ${dictionaryPinned ? "xl:pr-[390px]" : ""}`}>
          <Topbar theme={theme} onToggleTheme={toggleTheme} />
          {children}
        </section>
      </div>
    </main>
    </LanguageProvider>
  );
}
