"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiBookOpen, FiCheckSquare, FiEdit3, FiPlay, FiPlus, FiSquare } from "react-icons/fi";

type PersonalVocabulary = {
  _id: string;
  term: string;
  kana?: string;
  romaji?: string;
  meaningVi: string;
  partOfSpeech?: string;
  examples?: Array<{ ja: string; vi?: string }>;
};

export default function MyVocabularyPage() {
  const [items, setItems] = useState<PersonalVocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    void fetch("/api/vocabulary?scope=mine", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { data?: PersonalVocabulary[]; message?: string };

        if (!response.ok) {
          throw new Error(payload.message || "Không thể tải bộ từ vựng riêng.");
        }

        if (active) {
          setItems(payload.data || []);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Không thể tải bộ từ vựng riêng.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]));
  };

  const preparePractice = (ids: string[]) => {
    window.sessionStorage.setItem("nihongo-personal-study-selection", JSON.stringify(ids));
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-600">Cá nhân</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Từ vựng riêng tôi</h1>
          <p className="mt-3 max-w-2xl text-slate-500">Nơi quản lý các từ bạn tự thêm, ghi chú riêng và ví dụ cá nhân.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {items.length > 0 && (
            <Link
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-teal-600 px-5 font-black text-white shadow-xl shadow-teal-600/20 transition hover:-translate-y-0.5 hover:bg-teal-700"
              href="/flashcards/study?scope=mine&mode=flashcard"
              onClick={() => preparePractice(selectedIds.length > 0 ? selectedIds : items.map((item) => item._id))}
            >
              <FiPlay /> {selectedIds.length > 0 ? `Luyện ${selectedIds.length} từ` : "Luyện tất cả"}
            </Link>
          )}
          <Link className="inline-flex h-12 items-center gap-2 rounded-2xl bg-rose-600 px-5 font-black text-white shadow-xl shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700" href="/flashcards/add">
            <FiPlus /> Thêm từ mới
          </Link>
        </div>
      </div>

      {loading && (
        <section className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white p-10 text-center font-bold text-slate-500">
          Đang tải từ vựng riêng...
        </section>
      )}

      {!loading && error && (
        <section className="mt-8 rounded-[1.75rem] border border-rose-200 bg-rose-50 p-8 text-center font-bold text-rose-700">
          {error}
        </section>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <button
              className="flex items-center gap-2 font-black text-slate-700 transition hover:text-teal-700"
              onClick={() => setSelectedIds(allSelected ? [] : items.map((item) => item._id))}
              type="button"
            >
              {allSelected ? <FiCheckSquare /> : <FiSquare />} {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
            <span className="text-sm font-bold text-slate-500">Đã chọn {selectedIds.length}/{items.length} từ</span>
          </div>
          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const selected = selectedIds.includes(item._id);

            return (
            <article
              className={`relative cursor-pointer rounded-[1.5rem] border bg-white p-5 shadow-xl shadow-slate-900/[0.04] transition ${
                selected ? "border-teal-500 ring-4 ring-teal-500/10" : "border-slate-200 hover:border-teal-300"
              }`}
              key={item._id}
              onClick={() => toggleSelection(item._id)}
            >
              <span className={`absolute right-4 top-4 text-xl ${selected ? "text-teal-600" : "text-slate-300"}`}>
                {selected ? <FiCheckSquare /> : <FiSquare />}
              </span>
              <div className="flex items-start justify-between gap-3">
                <div className="pr-8">
                  <h2 className="text-2xl font-black text-slate-950">{item.term}</h2>
                  {(item.kana || item.romaji) && (
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {[item.kana, item.romaji].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                {item.partOfSpeech && <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">{item.partOfSpeech}</span>}
              </div>
              <p className="mt-4 font-black text-teal-700">{item.meaningVi}</p>
              {item.examples?.[0]?.ja && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold text-slate-700">{item.examples[0].ja}</p>
                  {item.examples[0].vi && <p className="mt-1 text-sm font-semibold text-slate-500">{item.examples[0].vi}</p>}
                </div>
              )}
            </article>
            );
          })}
          </section>
        </>
      )}

      {!loading && !error && items.length === 0 && (
        <section className="mt-8 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-xl shadow-slate-900/[0.04]">
          <FiEdit3 className="mx-auto h-10 w-10 text-teal-600" />
          <h2 className="mt-4 text-2xl font-black text-slate-950">Chưa có từ riêng</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">Các từ bạn tự tạo sẽ được gom ở đây để học và chỉnh sửa nhanh.</p>
        </section>
      )}

      {!loading && !error && items.length > 0 && (
        <p className="mt-6 flex items-center gap-2 text-sm font-bold text-slate-500">
          <FiBookOpen /> Tổng cộng {items.length} từ riêng
        </p>
      )}
    </div>
  );
}
