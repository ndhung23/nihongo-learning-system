"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ApiActivityIndicator } from "./ApiActivityIndicator";
import { LanguageProvider } from "../i18n/LanguageProvider";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const initialTheme = window.localStorage.getItem("nihongo-theme") === "dark" ? "dark" : "light";
    queueMicrotask(() => setTheme(initialTheme));
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
    <main className={`nihongo-app theme-${theme} min-h-screen bg-[#fbfaf5] text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100`}>
      <ApiActivityIndicator />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(225,29,72,0.08),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(20,184,166,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.4),transparent)] dark:bg-[radial-gradient(circle_at_16%_12%,rgba(244,63,94,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(45,212,191,0.12),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.78),transparent)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[72px_1fr]">
        <Sidebar />
        <section className="min-w-0">
          <Topbar theme={theme} onToggleTheme={toggleTheme} />
          {children}
        </section>
      </div>
    </main>
    </LanguageProvider>
  );
}
