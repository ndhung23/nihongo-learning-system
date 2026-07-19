"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiBookmark, FiCheckSquare, FiCompass, FiPlay, FiSearch, FiSquare, FiTrash2 } from "react-icons/fi";
import { readVocabularyBookmarks, type VocabularyBookmark, writeVocabularyBookmarks } from "../bookmarkStorage";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<VocabularyBookmark[]>([]);
  const [query, setQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    const syncBookmarks = () => setBookmarks(readVocabularyBookmarks());

    syncBookmarks();
    window.addEventListener("nihongo-vocabulary-bookmarks-updated", syncBookmarks);
    window.addEventListener("storage", syncBookmarks);

    return () => {
      window.removeEventListener("nihongo-vocabulary-bookmarks-updated", syncBookmarks);
      window.removeEventListener("storage", syncBookmarks);
    };
  }, []);

  const filteredBookmarks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return bookmarks;
    }

    return bookmarks.filter((bookmark) =>
      [bookmark.term, bookmark.kana, bookmark.romaji, bookmark.meaning, bookmark.example, bookmark.exampleVi, bookmark.courseTitle]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [bookmarks, query]);

  const removeBookmark = (key: string) => {
    const nextBookmarks = bookmarks.filter((bookmark) => bookmark.key !== key);
    writeVocabularyBookmarks(nextBookmarks);
    setBookmarks(nextBookmarks);
    setSelectedKeys((current) => current.filter((selectedKey) => selectedKey !== key));
  };

  const visibleKeys = filteredBookmarks.map((bookmark) => bookmark.key);
  const allVisibleSelected = visibleKeys.length > 0 && visibleKeys.every((key) => selectedKeys.includes(key));

  const toggleSelection = (key: string) => {
    setSelectedKeys((current) => (current.includes(key) ? current.filter((selectedKey) => selectedKey !== key) : [...current, key]));
  };

  const toggleAllVisible = () => {
    setSelectedKeys((current) =>
      allVisibleSelected
        ? current.filter((key) => !visibleKeys.includes(key))
        : Array.from(new Set([...current, ...visibleKeys])),
    );
  };

  const prepareBookmarkPractice = () => {
    const selected = bookmarks.filter((bookmark) => selectedKeys.includes(bookmark.key));
    window.sessionStorage.setItem("nihongo-bookmark-study-selection", JSON.stringify(selected));
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-700">Cá nhân</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Bookmark của tôi</h1>
          <p className="mt-3 max-w-2xl text-slate-500">Các từ vựng bạn đã lưu để ôn lại nhanh.</p>
        </div>
        <label className="flex h-12 w-full max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-teal-300 focus-within:shadow-lg focus-within:shadow-teal-500/10">
          <FiSearch className="text-slate-400" />
          <input
            className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-400"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm từ bookmark..."
            value={query}
          />
        </label>
      </div>

      {bookmarks.length === 0 ? (
        <section className="mt-8 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-xl shadow-slate-900/[0.04]">
          <FiBookmark className="mx-auto h-10 w-10 text-rose-500" />
          <h2 className="mt-4 text-2xl font-black text-slate-950">Chưa có bookmark</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">Bấm “Bookmark từ” trong màn học hoặc danh sách từ vựng để lưu lại.</p>
          <Link className="mt-6 inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-5 font-black text-white transition hover:-translate-y-0.5 hover:bg-rose-600" href="/flashcards/discover">
            <FiCompass /> Khám phá khóa học
          </Link>
        </section>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <button className="flex items-center gap-2 font-black text-slate-700 transition hover:text-teal-700" onClick={toggleAllVisible} type="button">
              {allVisibleSelected ? <FiCheckSquare /> : <FiSquare />} {allVisibleSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-500">Đã chọn {selectedKeys.length} từ</span>
              {selectedKeys.length > 0 && (
                <Link
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-teal-600 px-5 font-black text-white shadow-lg shadow-teal-600/15 transition hover:-translate-y-0.5 hover:bg-teal-700"
                  href="/flashcards/study?scope=bookmarks&mode=flashcard"
                  onClick={prepareBookmarkPractice}
                >
                  <FiPlay /> Luyện tập
                </Link>
              )}
            </div>
          </div>
          <section className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredBookmarks.map((bookmark) => (
            <article
              className={`relative cursor-pointer rounded-[1.5rem] border bg-white p-5 shadow-xl shadow-slate-900/[0.04] transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-500/10 ${
                selectedKeys.includes(bookmark.key) ? "border-teal-500 ring-4 ring-teal-500/10" : "border-slate-200 hover:border-teal-300"
              }`}
              key={bookmark.key}
              onClick={() => toggleSelection(bookmark.key)}
            >
              <span className={`absolute right-16 top-7 text-xl ${selectedKeys.includes(bookmark.key) ? "text-teal-600" : "text-slate-300"}`}>
                {selectedKeys.includes(bookmark.key) ? <FiCheckSquare /> : <FiSquare />}
              </span>
              <div className="flex items-start justify-between gap-3">
                <div className="pr-14">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600">{bookmark.courseTitle || "Từ vựng riêng"}</p>
                  <h2 className="mt-3 text-2xl font-black text-slate-950">{bookmark.term}</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">{[bookmark.kana, bookmark.romaji].filter(Boolean).join(" / ")}</p>
                </div>
                <button
                  aria-label="Xóa bookmark"
                  className="grid h-10 w-10 place-items-center rounded-full border border-rose-100 bg-rose-50 text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeBookmark(bookmark.key);
                  }}
                  type="button"
                >
                  <FiTrash2 />
                </button>
              </div>
              <p className="mt-4 rounded-2xl bg-teal-50 px-4 py-3 font-black text-teal-800">{bookmark.meaning}</p>
              {bookmark.example ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600">
                  <p>{bookmark.example}</p>
                  {bookmark.exampleVi ? <p className="mt-2 text-slate-500">{bookmark.exampleVi}</p> : null}
                </div>
              ) : null}
              {bookmark.deckId ? (
                <Link className="mt-5 flex h-11 items-center justify-center rounded-2xl bg-slate-950 font-black text-white transition hover:-translate-y-0.5 hover:bg-teal-700" href={`/flashcards/study?mode=flashcard&deckId=${bookmark.deckId}`} onClick={(event) => event.stopPropagation()}>
                  Học lại khóa này
                </Link>
              ) : null}
            </article>
          ))}
          </section>
        </>
      )}

      {bookmarks.length > 0 && filteredBookmarks.length === 0 ? (
        <div className="mt-8 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-center font-bold text-slate-500">
          Không tìm thấy bookmark phù hợp.
        </div>
      ) : null}
    </div>
  );
}
