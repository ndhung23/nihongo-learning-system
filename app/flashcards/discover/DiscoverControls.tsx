"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FiSearch, FiX } from "react-icons/fi";

export function DiscoverControls({
  initialLevel,
  initialQuery,
  initialSort,
  type,
}: Readonly<{
  initialLevel: string;
  initialQuery: string;
  initialSort: string;
  type: string;
}>) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [level, setLevel] = useState(initialLevel);
  const [sort, setSort] = useState(initialSort);
  const [isPending, startTransition] = useTransition();

  function navigate(next: {
    level?: string;
    query?: string;
    sort?: string;
  }) {
    const nextLevel = next.level ?? level;
    const nextQuery = next.query ?? query;
    const nextSort = next.sort ?? sort;
    const params = new URLSearchParams({ type });

    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextLevel) params.set("level", nextLevel);
    if (nextSort !== "newest") params.set("sort", nextSort);

    startTransition(() => {
      router.replace(`/flashcards/discover?${params.toString()}`, {
        scroll: false,
      });
    });
  }

  useEffect(() => {
    if (query === initialQuery) {
      return;
    }

    const timeout = window.setTimeout(() => {
      navigate({ query });
    }, 350);

    return () => window.clearTimeout(timeout);
    // Chỉ tự tìm lại khi nội dung ô tìm kiếm thay đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, query]);

  function clearFilters() {
    setQuery("");
    setLevel("");
    setSort("newest");
    navigate({ query: "", level: "", sort: "newest" });
  }

  const hasFilters = Boolean(query || level || sort !== "newest");

  return (
    <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/[0.04] lg:grid-cols-[minmax(280px,1fr)_170px_220px_auto]">
      <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-teal-300 focus-within:bg-white">
        <FiSearch className="text-slate-400" />
        <input
          className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-400"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm theo tên khóa học, mô tả, tag..."
          type="search"
          value={query}
        />
        {isPending && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
        )}
      </label>

      <select
        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none transition focus:border-teal-300"
        name="level"
        onChange={(event) => {
          const nextLevel = event.target.value;
          setLevel(nextLevel);
          navigate({ level: nextLevel });
        }}
        value={level}
      >
        <option value="">Tất cả cấp độ</option>
        <option value="n5">JLPT N5</option>
        <option value="n4">JLPT N4</option>
        <option value="n3">JLPT N3</option>
        <option value="n2">JLPT N2</option>
        <option value="n1">JLPT N1</option>
      </select>

      <select
        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none transition focus:border-teal-300"
        name="sort"
        onChange={(event) => {
          const nextSort = event.target.value;
          setSort(nextSort);
          navigate({ sort: nextSort });
        }}
        value={sort}
      >
        <option value="newest">Mới nhất trước</option>
        <option value="learners">Nhiều học viên nhất</option>
        <option value="oldest">Cũ nhất trước</option>
      </select>

      {hasFilters && (
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 font-black text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
          onClick={clearFilters}
          type="button"
        >
          <FiX /> Xóa lọc
        </button>
      )}
    </div>
  );
}
