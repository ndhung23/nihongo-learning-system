"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiBookOpen, FiX } from "react-icons/fi";

type Props = {
  courseId: string;
  level: string;
  slug: string;
  tags: string[];
  title: string;
  vocabularyCount: number;
};

export function CourseStudyButton({
  courseId,
  level,
  slug,
  tags,
  title,
  vocabularyCount,
}: Readonly<Props>) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const normalizedLevel = level.toLowerCase();
  const courseText = [slug, title, level, ...tags].join(" ").toLowerCase();
  const hasLessons =
    (normalizedLevel === "n5" || normalizedLevel === "n4") &&
    courseText.includes("minna");
  const firstLesson = normalizedLevel === "n4" ? 26 : 1;
  const lessons = Array.from({ length: 25 }, (_, index) => firstLesson + index);

  function startStudy(lesson: string) {
    window.localStorage.setItem("selectedCourseId", courseId);
    router.push(
      `/flashcards/study?mode=flashcard&deckId=${encodeURIComponent(courseId)}&lesson=${lesson}`,
    );
  }

  return (
    <>
      <button
        className="mt-5 flex h-11 w-full items-center justify-center rounded-2xl bg-slate-950 font-black text-white transition hover:-translate-y-0.5 hover:bg-rose-600"
        onClick={() => (hasLessons ? setIsOpen(true) : startStudy("all"))}
        type="button"
      >
        {hasLessons ? "Chọn bài để học" : "Học khóa này"}
      </button>

      {isOpen && (
        <div
          aria-label={`Chọn bài trong ${title}`}
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-2xl rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-600">
                  Từ vựng {level.toUpperCase()}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Chọn bài để bắt đầu</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">{title}</p>
              </div>
              <button
                aria-label="Đóng"
                className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <FiX />
              </button>
            </div>

            <button
              className="mt-5 flex w-full items-center justify-between rounded-2xl border border-teal-200 bg-teal-50 px-5 py-4 text-left font-black text-teal-800 transition hover:-translate-y-0.5 hover:bg-teal-100"
              onClick={() => startStudy("all")}
              type="button"
            >
              <span className="inline-flex items-center gap-3">
                <FiBookOpen /> Học tất cả bài {lessons[0]}-{lessons.at(-1)}
              </span>
              <span>{vocabularyCount} từ</span>
            </button>

            <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-7">
              {lessons.map((lesson) => (
                <button
                  className="h-12 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                  key={lesson}
                  onClick={() => startStudy(String(lesson))}
                  type="button"
                >
                  Bài {lesson}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
