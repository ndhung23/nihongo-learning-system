"use client";

import { useEffect, useRef, useState } from "react";
import { FiAward, FiBookOpen, FiCheckCircle, FiChevronLeft, FiChevronRight, FiCpu, FiFolder, FiPlus, FiTarget, FiUsers, FiX } from "react-icons/fi";
import type { StudyMode } from "../types";
import { ActionCard } from "../components/Cards";
import { GachaDailyPanel } from "../components/GachaDailyPanel";

type PublicCourse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: string;
  stats?: {
    vocabularyCount?: number;
    learnerCount?: number;
    ratingAverage?: number;
    ratingCount?: number;
  };
  tags?: string[];
  type?: string;
  jlptTest?: {
    level?: string;
    number?: number;
  };
};

export function LibraryScreen({
  onAdd,
  onManage,
  onStudy,
  onTest,
}: Readonly<{
  onAdd: () => void;
  onManage: () => void;
  onStudy: (mode?: StudyMode, deckId?: string, lesson?: string) => void;
  onTest: (level?: string, number?: number) => void;
}>) {
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [learningCourses, setLearningCourses] = useState<PublicCourse[]>([]);
  const [coursePage, setCoursePage] = useState(1);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [lessonPickerCourse, setLessonPickerCourse] = useState<PublicCourse | null>(null);
  const discoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedCourseId(window.localStorage.getItem("selectedCourseId"));

    void fetch("/api/courses?sort=newest&limit=24")
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((payload: { data?: PublicCourse[] }) => setCourses(payload.data || []))
      .catch(() => setCourses([]));

    void fetch("/api/courses/learning", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((payload: { data?: PublicCourse[] }) => setLearningCourses(payload.data || []))
      .catch(() => setLearningCourses([]));
  }, []);

  function scrollToDiscover() {
    discoverRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectCourse(courseId: string) {
    setSelectedCourseId(courseId);
    window.localStorage.setItem("selectedCourseId", courseId);
  }

  function isLessonCourse(course: PublicCourse) {
    const haystack = [course.slug, course.title, course.level, ...(course.tags || [])].join(" ").toLowerCase();
    return (course.level === "n5" || course.level === "n4") && haystack.includes("minna");
  }

  function getLessonNumbers(course: PublicCourse) {
    const start = course.level === "n4" ? 26 : 1;
    return Array.from({ length: 25 }, (_, index) => start + index);
  }

  function isTestCourse(course: PublicCourse) {
    return Boolean(course.jlptTest?.level && course.jlptTest.number) || course.type === "jlpt-test" || course.slug.startsWith("de-thi-") || course.slug === "n5-test-ngu-phap-tu-vung-doc-hieu" || (course.tags || []).some((tag) => tag.toLowerCase() === "test");
  }

  function openCourseStudy(course: PublicCourse) {
    selectCourse(course.id);
    setLearningCourses((current) => [
      course,
      ...current.filter((item) => item.id !== course.id),
    ]);

    if (isTestCourse(course)) {
      onTest(course.jlptTest?.level, course.jlptTest?.number);
      return;
    }

    if (isLessonCourse(course)) {
      setLessonPickerCourse(course);
      return;
    }

    onStudy("flashcard", course.id);
  }

  function startLesson(lesson: string) {
    if (!lessonPickerCourse) {
      return;
    }

    selectCourse(lessonPickerCourse.id);
    setLessonPickerCourse(null);
    onStudy("flashcard", lessonPickerCourse.id, lesson);
  }

  const coursePageSize = 6;
  const courseTotalPages = Math.max(
    Math.ceil(courses.length / coursePageSize),
    1,
  );
  const visibleCoursePage = Math.min(coursePage, courseTotalPages);
  const paginatedCourses = courses.slice(
    (visibleCoursePage - 1) * coursePageSize,
    visibleCoursePage * coursePageSize,
  );

  return (
    <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-10">
      <section className="min-w-0">
        <div className="rounded-[2rem] border border-slate-200 bg-white/88 p-6 shadow-2xl shadow-slate-900/[0.05] backdrop-blur">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-600">Bắt đầu hành trình tiếng Nhật</p>
              <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Học đúng cách. Tiến bộ mỗi ngày.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Từ người mới bắt đầu đến mục tiêu JLPT: học từ vựng bằng flashcard, luyện đề N5–N1, nhận giải thích từ AI và duy trì động lực với nhiệm vụ Gacha.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button className="rounded-2xl bg-rose-600 px-5 py-3 font-black text-white shadow-xl shadow-rose-600/20 transition-all duration-300 hover:-translate-y-1 hover:bg-rose-700" onClick={scrollToDiscover} type="button">
                  Khám phá khóa học
                </button>
                <button className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-700 transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:text-teal-700 hover:shadow-xl hover:shadow-teal-500/10" onClick={() => onStudy("flashcard")} type="button">
                  Học thử ngay
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="flex items-center gap-4 rounded-2xl bg-rose-50 p-4 text-rose-700">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-xl"><FiBookOpen /></span>
                <div><p className="font-black">Flashcard thông minh</p><p className="mt-1 text-xs font-semibold text-slate-500">Lật thẻ, chọn nghĩa, gõ từ và đặt câu.</p></div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl bg-teal-50 p-4 text-teal-700">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-xl"><FiAward /></span>
                <div><p className="font-black">Luyện thi JLPT N5–N1</p><p className="mt-1 text-xs font-semibold text-slate-500">Đề minh họa với đáp án và hai phần thi.</p></div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl bg-amber-50 p-4 text-amber-700">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-xl"><FiCpu /></span>
                <div><p className="font-black">AI hỗ trợ học sâu</p><p className="mt-1 text-xs font-semibold text-slate-500">Ví dụ, từ đồng nghĩa, trái nghĩa và góp ý câu.</p></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <ActionCard icon={FiTarget} title="Phiên hôm nay" text="1 từ đang chờ ôn theo SRS." action="Ôn tập ngay" onClick={() => onStudy("flashcard")} />
          <ActionCard icon={FiFolder} title="Khám phá khóa học" text="Chọn khóa học public như IT Japanese." action="Xem khóa học" onClick={scrollToDiscover} />
          <ActionCard icon={FiPlus} title="Tạo bộ mới" text="Tự nhập từ hoặc import từ file." action="Tạo bộ" onClick={onAdd} />
        </div>

        <div className="mt-10 scroll-mt-28" ref={discoverRef}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-600">Khám phá khóa học</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Chọn khóa học để bắt đầu</h2>
            </div>
            {selectedCourseId && (
              <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm font-black text-teal-800">
                <FiCheckCircle /> Đã chọn khóa học
              </span>
            )}
          </div>

          <div
            className="mt-6 grid gap-5 lg:grid-cols-2"
            data-testid="library-course-grid"
          >
            {courses.length > 0 ? (
              paginatedCourses.map((course) => {
                const isSelected = selectedCourseId === course.id;

                return (
                  <article
                    className={`rounded-[1.75rem] border bg-white p-5 shadow-xl shadow-slate-900/[0.05] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                      isSelected ? "border-teal-400 ring-4 ring-teal-100" : "border-slate-200 hover:border-rose-300"
                    }`}
                    key={course.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">{course.level}</p>
                        <h3 className="mt-2 text-xl font-black text-slate-950">{course.title}</h3>
                      </div>
                      <span className="shrink-0 rounded-2xl bg-rose-50 px-3 py-2 text-center text-sm font-black text-rose-700">
                        {course.stats?.vocabularyCount || 0} {isTestCourse(course) ? "câu" : "từ"}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{course.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(course.tags || []).slice(0, 4).map((tag) => (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 inline-flex items-center gap-2 text-sm font-black text-slate-500">
                      <FiUsers className="text-teal-700" />
                      {course.stats?.learnerCount || 900} học viên
                    </p>
                    <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
                      <button
                        className={`h-11 rounded-2xl px-4 font-black transition-all duration-300 ${
                          isSelected ? "bg-teal-700 text-white" : "bg-slate-950 text-white hover:-translate-y-0.5 hover:bg-rose-700"
                        }`}
                        onClick={() => openCourseStudy(course)}
                        type="button"
                      >
                        {isSelected ? "Đang học" : "Chọn khóa học"}
                      </button>
                      <button
                        className="h-11 rounded-2xl border border-teal-200 bg-teal-50 px-4 font-black text-teal-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-100"
                        onClick={() => openCourseStudy(course)}
                        type="button"
                      >
                        {isTestCourse(course) ? "Làm bài" : "Học ngay"}
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 p-6 text-sm font-bold text-slate-500">
                Chưa có khóa học public để hiển thị.
              </div>
            )}
          </div>
          {courseTotalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                disabled={visibleCoursePage === 1}
                onClick={() =>
                  setCoursePage((current) => Math.max(current - 1, 1))
                }
                type="button"
              >
                <FiChevronLeft /> Trước
              </button>
              {Array.from({ length: courseTotalPages }, (_, index) => {
                const pageNumber = index + 1;
                return (
                  <button
                    aria-current={
                      pageNumber === visibleCoursePage ? "page" : undefined
                    }
                    className={`grid h-10 min-w-10 place-items-center rounded-xl px-3 text-sm font-black ${
                      pageNumber === visibleCoursePage
                        ? "bg-slate-950 text-white"
                        : "border border-slate-200 bg-white text-slate-600"
                    }`}
                    key={pageNumber}
                    onClick={() => setCoursePage(pageNumber)}
                    type="button"
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                disabled={visibleCoursePage === courseTotalPages}
                onClick={() =>
                  setCoursePage((current) =>
                    Math.min(current + 1, courseTotalPages),
                  )
                }
                type="button"
              >
                Sau <FiChevronRight />
              </button>
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-700">Tủ sách cá nhân</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Bộ từ đang học</h2>
          </div>
          <span className="rounded-full bg-teal-50 px-4 py-2 text-sm font-black text-teal-800">
            {learningCourses.length} khóa đang học
          </span>
        </div>

        <div
          className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
          data-testid="learning-course-grid"
        >
          {learningCourses.map((course) => (
            <article
              className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.05] transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-2xl"
              key={course.id}
            >
              <div className="h-2 bg-gradient-to-r from-teal-500 to-sky-500" />
              <div className="p-5">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 text-3xl text-slate-800 transition group-hover:bg-slate-950 group-hover:text-white">
                  <FiBookOpen />
                </span>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-teal-700">
                  {course.level}
                </p>
                <h3 className="mt-2 text-lg font-black text-slate-950">
                  {course.title}
                </h3>
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  {course.stats?.vocabularyCount || 0}{" "}
                  {isTestCourse(course) ? "câu hỏi" : "từ vựng"} ·{" "}
                  {course.stats?.learnerCount || 0} học viên
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(course.tags || []).slice(0, 4).map((tag) => (
                    <span
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  className="mt-6 h-11 w-full rounded-2xl bg-slate-950 font-black text-white transition hover:bg-teal-700"
                  onClick={() => openCourseStudy(course)}
                  type="button"
                >
                  {isTestCourse(course) ? "Tiếp tục làm bài" : "Tiếp tục học"}
                </button>
              </div>
            </article>
          ))}
          {learningCourses.length === 0 && (
            <div className="min-h-72 rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 p-6 text-center">
              <FiBookOpen className="mx-auto mt-14 text-4xl text-slate-400" />
              <p className="mt-5 font-black text-slate-800">
                Bạn chưa học khóa nào
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Bấm học một khóa ở phần Khám phá để khóa xuất hiện tại đây.
              </p>
            </div>
          )}
          <button className="group min-h-72 rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-teal-400 hover:bg-white hover:shadow-2xl hover:shadow-teal-500/10" onClick={onAdd} type="button">
            <span className="mx-auto mt-16 grid h-16 w-16 place-items-center rounded-2xl bg-teal-50 text-3xl text-teal-700 transition-all duration-300 group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white">
              <FiPlus />
            </span>
            <span className="mt-5 block text-lg font-black">Tạo bộ từ mới</span>
            <span className="mt-2 block text-sm text-slate-500">Nhập thủ công hoặc import CSV</span>
          </button>
        </div>
      </section>

      <GachaDailyPanel />
      {lessonPickerCourse && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-600">Từ vựng {lessonPickerCourse.level.toUpperCase()}</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Chọn bài để bắt đầu</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">{lessonPickerCourse.title}</p>
              </div>
              <button
                className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                onClick={() => setLessonPickerCourse(null)}
                type="button"
              >
                <FiX />
              </button>
            </div>

            <button
              className="mt-5 flex w-full items-center justify-between rounded-2xl border border-teal-200 bg-teal-50 px-5 py-4 text-left font-black text-teal-800 transition hover:-translate-y-0.5 hover:bg-teal-100"
              onClick={() => startLesson("all")}
              type="button"
            >
              <span className="inline-flex items-center gap-3">
                <FiBookOpen /> Học tất cả bài {getLessonNumbers(lessonPickerCourse)[0]}-{getLessonNumbers(lessonPickerCourse).at(-1)}
              </span>
              <span>{lessonPickerCourse.stats?.vocabularyCount || 0} từ</span>
            </button>

            <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-7">
              {getLessonNumbers(lessonPickerCourse).map((lessonNumber) => {
                const lesson = String(lessonNumber);

                return (
                  <button
                    className="h-12 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                    key={lesson}
                    onClick={() => startLesson(lesson)}
                    type="button"
                  >
                    Bài {lesson}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
