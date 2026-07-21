"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCheck, FiChevronLeft, FiChevronRight, FiEdit3, FiX } from "react-icons/fi";

type Question = { level: string; testNumber: number; section: "vocabularyKanji" | "grammarReading"; questionId: string; prompt: string; highlightText: string };
type Suggestion = { id: string; level: string; testNumber: number; questionId: string; prompt: string; currentHighlightText: string; suggestedHighlightText: string; note?: string; username?: string; status: "pending" | "approved" | "rejected" };
const PAGE_SIZE = 25;
const levels = ["N5", "N4", "N3", "N2", "N1"];

export function PaginatedHighlightsClient({ questions, suggestions }: Readonly<{ questions: Question[]; suggestions: Suggestion[] }>) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [testNumber, setTestNumber] = useState("all");
  const [page, setPage] = useState(1);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");

  const availableTests = useMemo(() => {
    const result: Record<string, number[]> = {};
    for (const item of questions) result[item.level] = Array.from(new Set([...(result[item.level] ?? []), item.testNumber])).sort((a, b) => a - b);
    return result;
  }, [questions]);
  const testOptions = level === "all" ? Array.from(new Set(questions.map((item) => item.testNumber))).sort((a, b) => a - b) : availableTests[level] ?? [];
  const filtered = useMemo(() => questions.filter((item) =>
    (level === "all" || item.level === level) &&
    (testNumber === "all" || item.testNumber === Number(testNumber)) &&
    `${item.questionId} ${item.prompt}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [questions, level, testNumber, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [query, level, testNumber]);

  async function review(id: string, action: "approve" | "reject") {
    setLoading(id); setMessage("");
    const response = await fetch(`/api/admin/jlpt-highlights/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const payload = await response.json(); setLoading("");
    if (!response.ok) return setMessage(payload.message || "Không thể xử lý góp ý.");
    router.refresh();
  }
  async function save(item: Question) {
    const key = `${item.level}-${item.testNumber}-${item.section}-${item.questionId}`;
    setLoading(key); setMessage("");
    const response = await fetch("/api/admin/jlpt-highlights", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, highlightText: values[key] ?? item.highlightText }) });
    const payload = await response.json(); setLoading("");
    if (!response.ok) return setMessage(payload.message || "Không thể lưu highlight.");
    setMessage("Đã cập nhật highlight."); router.refresh();
  }

  const pending = suggestions.filter((item) => item.status === "pending");
  return <div>
    <p className="text-xs font-black uppercase tracking-[.28em] text-teal-700">Admin · JLPT</p><h1 className="mt-3 text-4xl font-black">Quản lý highlight</h1><p className="mt-3 text-slate-500">Duyệt góp ý của người học hoặc tự chọn đoạn chữ cần highlight.</p>
    {message && <p className="mt-5 rounded-xl bg-amber-50 p-4 font-bold text-amber-800">{message}</p>}
    <section className="mt-8"><h2 className="text-2xl font-black">Góp ý chờ duyệt <span className="text-base text-slate-400">({pending.length})</span></h2><div className="mt-4 grid gap-4">
      {pending.map((item) => <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap justify-between gap-4"><div><b>{item.level} · Đề {item.testNumber} · {item.questionId}</b><p className="mt-2 text-lg font-black">{item.prompt}</p><p className="mt-2 text-sm text-slate-500">Người gửi: {item.username || "Người học"}{item.note ? ` · ${item.note}` : ""}</p></div><div className="flex gap-2"><button disabled={loading === item.id} onClick={() => review(item.id, "approve")} className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 font-black text-white disabled:opacity-50"><FiCheck /> Duyệt</button><button disabled={loading === item.id} onClick={() => review(item.id, "reject")} className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 font-black text-white disabled:opacity-50"><FiX /> Từ chối</button></div></div><div className="mt-4 flex flex-wrap gap-3 text-sm"><span className="rounded-xl bg-slate-100 px-3 py-2">Hiện tại: <b>{item.currentHighlightText || "Không có"}</b></span><span className="rounded-xl bg-teal-50 px-3 py-2 text-teal-800">Đề xuất: <b>{item.suggestedHighlightText}</b></span></div></article>)}
      {!pending.length && <p className="rounded-2xl border border-dashed p-6 text-slate-500">Không có góp ý đang chờ.</p>}
    </div></section>
    <section className="mt-10"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-black">Chỉnh trực tiếp</h2><p className="mt-1 text-sm font-bold text-slate-500">Tìm thấy {filtered.length.toLocaleString("vi-VN")} câu hỏi</p></div><div className="text-right text-xs font-bold text-slate-500">{levels.map((item) => <span key={item} className="ml-2 mt-1 inline-block rounded-full bg-white px-3 py-1">{item}: {(availableTests[item] ?? []).length} đề</span>)}</div></div>
      <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_150px_150px]"><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 rounded-xl border border-slate-200 px-4" placeholder="Tìm nội dung hoặc mã câu hỏi..." /><select value={level} onChange={(event) => { setLevel(event.target.value); setTestNumber("all"); }} className="h-12 rounded-xl border border-slate-200 px-3 font-bold"><option value="all">Tất cả cấp độ</option>{levels.map((item) => <option key={item}>{item}</option>)}</select><select value={testNumber} onChange={(event) => setTestNumber(event.target.value)} className="h-12 rounded-xl border border-slate-200 px-3 font-bold"><option value="all">Tất cả đề</option>{testOptions.map((item) => <option value={item} key={item}>Đề {item}</option>)}</select></div>
      <div className="mt-4 grid gap-3">{paginated.map((item) => { const key = `${item.level}-${item.testNumber}-${item.section}-${item.questionId}`; return <article key={key} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-black text-teal-700">{item.level} · Đề {item.testNumber} · {item.questionId}</p><p className="mt-2 font-bold">{item.prompt}</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={values[key] ?? item.highlightText} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} className="h-11 flex-1 rounded-xl border border-slate-200 px-3" placeholder="Để trống nếu không highlight" /><button disabled={loading === key} onClick={() => save(item)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 font-black text-white disabled:opacity-50"><FiEdit3 /> Lưu</button></div></article>; })}</div>
      {!paginated.length && <p className="mt-4 rounded-2xl border border-dashed p-8 text-center font-bold text-slate-500">Không có câu hỏi phù hợp.</p>}
      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
    </section>
  </div>;
}

function Pagination({ page, totalPages, totalItems, onPageChange }: Readonly<{ page: number; totalPages: number; totalItems: number; onPageChange: (page: number) => void }>) {
  if (!totalItems) return null;
  const start = (page - 1) * PAGE_SIZE + 1, end = Math.min(page * PAGE_SIZE, totalItems);
  return <nav className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4" aria-label="Phân trang câu hỏi"><p className="text-sm font-bold text-slate-500">Hiển thị {start}–{end} / {totalItems}</p><div className="flex items-center gap-2"><button disabled={page === 1} onClick={() => onPageChange(page - 1)} className="grid h-10 w-10 place-items-center rounded-xl border disabled:opacity-30" aria-label="Trang trước"><FiChevronLeft /></button><span className="min-w-24 text-center text-sm font-black">Trang {page}/{totalPages}</span><button disabled={page === totalPages} onClick={() => onPageChange(page + 1)} className="grid h-10 w-10 place-items-center rounded-xl border disabled:opacity-30" aria-label="Trang sau"><FiChevronRight /></button></div></nav>;
}
