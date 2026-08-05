"use client";

import { FormEvent, useState } from "react";
import { FiCpu, FiLoader, FiSend, FiStar, FiX } from "react-icons/fi";
import { getKnownDailyProgressStorageKey } from "./dailyProgressStorage";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function AiChatbox({ dictionaryPinned }: Readonly<{ dictionaryPinned: boolean }>) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const question = message.trim();
    if (!question || loading) return;

    const history = messages.slice(-10);
    setMessages((current) => [...current, { role: "user", content: question }]);
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/flashcards/grade-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", message: question, history }),
      });
      const payload = (await response.json()) as {
        data?: { answer?: string };
        message?: string;
        remainingAiCredits?: number;
      };
      if (!response.ok || !payload.data?.answer) {
        throw new Error(payload.message || "AI chưa thể trả lời lúc này.");
      }

      setMessages((current) => [...current, { role: "assistant", content: payload.data?.answer || "" }]);
      if (typeof payload.remainingAiCredits === "number") {
        const storageKey = getKnownDailyProgressStorageKey();
        const current = JSON.parse(window.localStorage.getItem(storageKey) || "{}") as Record<string, unknown>;
        window.localStorage.setItem(storageKey, JSON.stringify({ ...current, aiCredits: payload.remainingAiCredits }));
        window.dispatchEvent(new CustomEvent("nihongo-daily-progress-updated"));
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "AI chưa thể trả lời lúc này.");
    } finally {
      setLoading(false);
    }
  }

  const desktopPosition = dictionaryPinned ? "xl:right-[410px]" : "right-5";

  return (
    <>
      <button
        aria-label="Mở chatbox AI"
        className={`fixed bottom-[4.75rem] z-40 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 text-lg font-black text-white shadow-2xl shadow-fuchsia-500/35 ring-2 ring-white transition hover:-translate-y-1 hover:scale-[1.02] sm:bottom-20 sm:flex sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3 sm:text-sm ${desktopPosition}`}
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20"><FiCpu /></span>
        <span className="hidden sm:inline">Hỏi AI</span>
        <span className="hidden rounded-full bg-white/20 px-2 py-0.5 text-[10px] sm:inline">−1 lượt</span>
      </button>

      {open && (
        <section className={`fixed bottom-5 z-[60] flex h-[min(620px,calc(100vh-40px))] w-[calc(100vw-40px)] max-w-[410px] flex-col overflow-hidden rounded-[2rem] border border-violet-200 bg-white shadow-2xl shadow-violet-950/25 dark:border-violet-900 dark:bg-slate-900 ${desktopPosition}`}>
          <header className="flex items-center gap-3 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 p-4 text-white">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 text-xl"><FiStar /></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-black">Trợ lý AI tiếng Nhật</h2>
              <p className="text-xs font-semibold text-white/80">Mỗi câu hỏi sử dụng 1 lượt AI</p>
            </div>
            <button aria-label="Đóng chatbox AI" className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 hover:bg-white/25" onClick={() => setOpen(false)} type="button"><FiX /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-violet-50/40 p-4 dark:bg-slate-950/40">
            {messages.length === 0 && (
              <div className="rounded-2xl border border-violet-100 bg-white p-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Xin chào! Bạn có thể hỏi mình về từ vựng, Kanji, ngữ pháp, cách đặt câu hoặc cách học JLPT.
              </div>
            )}
            {messages.map((item, index) => (
              <div className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`} key={`${item.role}-${index}`}>
                <p className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm font-semibold leading-6 ${item.role === "user" ? "rounded-br-md bg-violet-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
                  {item.content}
                </p>
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-sm font-bold text-violet-600"><FiLoader className="animate-spin" /> AI đang suy nghĩ...</div>}
            {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
          </div>

          <form className="border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900" onSubmit={sendMessage}>
            <div className="flex items-end gap-2">
              <textarea
                className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-violet-200 px-4 py-3 text-sm font-semibold outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950"
                maxLength={1000}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Hỏi AI về tiếng Nhật..."
                value={message}
              />
              <button aria-label="Gửi câu hỏi" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/25 hover:bg-violet-700 disabled:opacity-50" disabled={loading || !message.trim()} type="submit">
                {loading ? <FiLoader className="animate-spin" /> : <FiSend />}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
