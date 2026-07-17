"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiCheck, FiX } from "react-icons/fi";

type Suggestion = {
  _id: string;
  term: string;
  meaningVi: string;
  suggestedJa: string;
  suggestedVi?: string;
  note?: string;
  username?: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
};

export function ExampleSuggestionsClient({ suggestions }: Readonly<{ suggestions: Suggestion[] }>) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState("");

  async function reviewSuggestion(id: string, action: "approve" | "reject") {
    setLoadingId(id);
    setError("");

    try {
      const response = await fetch(`/api/admin/example-suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.message || "Không thể xử lý góp ý.");
        return;
      }

      router.refresh();
    } finally {
      setLoadingId("");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-700">Admin</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Mẫu câu góp ý</h1>
          <p className="mt-3 max-w-2xl text-slate-500">Duyệt mẫu câu người học gửi. Khi duyệt, câu sẽ được thêm vào ví dụ của từ vựng.</p>
        </div>
      </div>

      {error && <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

      <section className="mt-8 grid gap-4">
        {suggestions.map((suggestion) => (
          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.04]" key={suggestion._id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-slate-950">{suggestion.term}</h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone(suggestion.status)}`}>{statusLabel(suggestion.status)}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-slate-500">{suggestion.meaningVi}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">Người gửi: {suggestion.username || "Khách"} · {suggestion.createdAt ? new Date(suggestion.createdAt).toLocaleString("vi-VN") : ""}</p>
              </div>
              {suggestion.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-black text-white transition hover:bg-teal-800 disabled:opacity-60"
                    disabled={loadingId === suggestion._id}
                    onClick={() => reviewSuggestion(suggestion._id, "approve")}
                    type="button"
                  >
                    <FiCheck /> Duyệt
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-60"
                    disabled={loadingId === suggestion._id}
                    onClick={() => reviewSuggestion(suggestion._id, "reject")}
                    type="button"
                  >
                    <FiX /> Từ chối
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-teal-700">Câu Nhật đề xuất</p>
                <p className="mt-2 text-lg font-black text-slate-950">{suggestion.suggestedJa}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-rose-600">Nghĩa / ghi chú</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{suggestion.suggestedVi || "Chưa nhập nghĩa tiếng Việt."}</p>
                {suggestion.note && <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{suggestion.note}</p>}
              </div>
            </div>
          </article>
        ))}
      </section>

      {suggestions.length === 0 && (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-center font-bold text-slate-500">
          Chưa có góp ý mẫu câu nào.
        </div>
      )}
    </div>
  );
}

function statusLabel(status: Suggestion["status"]) {
  return {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Từ chối",
  }[status];
}

function statusTone(status: Suggestion["status"]) {
  return {
    pending: "bg-amber-50 text-amber-700",
    approved: "bg-teal-50 text-teal-700",
    rejected: "bg-rose-50 text-rose-700",
  }[status];
}
