"use client";

import { useState } from "react";
import { FiFlag, FiX } from "react-icons/fi";

export function HighlightFeedback({ level, testNumber, section, questionId, prompt }: Readonly<{ level: string; testNumber: number; section: "vocabularyKanji" | "grammarReading"; questionId: string; prompt: string }>) {
  const [open, setOpen] = useState(false);
  const [highlightText, setHighlightText] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit() {
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch("/api/jlpt-highlight-suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level, testNumber, section, questionId, suggestedHighlightText: highlightText, note }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Không thể gửi góp ý.");
      setMessage("Đã gửi góp ý. Cảm ơn bạn!"); setHighlightText(""); setNote("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể gửi góp ý."); } finally { setSubmitting(false); }
  }
  return <div className="mt-3">
    <button className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-rose-600" onClick={() => setOpen(true)} type="button"><FiFlag /> Báo highlight chưa đúng</button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-black">Góp ý highlight</h3><p className="mt-1 text-sm text-slate-500">Nhập chính xác chữ hoặc cụm chữ cần gạch chân.</p></div><button className="rounded-xl p-2 hover:bg-slate-100" onClick={() => setOpen(false)} type="button" aria-label="Đóng"><FiX /></button></div>
      <p className="mt-5 rounded-xl bg-slate-50 p-4 font-bold text-slate-800">{prompt}</p>
      <label className="mt-5 block text-sm font-black">Đoạn cần highlight</label><input className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-rose-500" value={highlightText} onChange={(e) => setHighlightText(e.target.value)} placeholder="Ví dụ: 五百円" />
      <label className="mt-4 block text-sm font-black">Ghi chú (không bắt buộc)</label><textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-4 outline-none focus:border-rose-500" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mô tả ngắn lỗi highlight..." />
      {message && <p className="mt-3 text-sm font-bold text-rose-600">{message}</p>}<button className="mt-5 h-12 w-full rounded-xl bg-rose-600 font-black text-white disabled:opacity-50" disabled={submitting || !highlightText.trim()} onClick={submit} type="button">{submitting ? "Đang gửi..." : "Gửi góp ý"}</button>
    </div></div>}
  </div>;
}
