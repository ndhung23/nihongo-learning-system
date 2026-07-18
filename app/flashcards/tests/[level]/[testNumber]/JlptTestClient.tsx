"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiBookOpen,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
} from "react-icons/fi";

type Section = "vocabulary-kanji" | "grammar-reading";
type FeedbackMode = "immediate" | "at-end";

type Question = {
  id: string;
  group: string;
  instruction: string;
  prompt: string;
  highlightText?: string;
  options: string[];
};

type GradeResult = {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
  correctIndex: number;
  explanation: string;
};

type GradeSummary = {
  answered: number;
  total: number;
  correct: number;
  percentage: number;
};

export function JlptTestClient({
  courseId,
  level,
  testNumber,
}: Readonly<{ courseId: string; level: string; testNumber: number }>) {
  const [section, setSection] = useState<Section | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, GradeResult>>({});
  const [summary, setSummary] = useState<GradeSummary | null>(null);
  const [feedbackMode, setFeedbackMode] =
    useState<FeedbackMode>("immediate");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [message, setMessage] = useState("");

  const title = `Đề thi ${level} minh họa số ${testNumber}`;

  useEffect(() => {
    fetch(`/api/courses/${courseId}/learn`, { method: "POST" }).catch(
      () => undefined,
    );
  }, [courseId]);

  async function startSection(nextSection: Section) {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/jlpt-tests/${level.toLowerCase()}/${testNumber}?section=${nextSection}`,
        { cache: "no-store" },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Không thể tải đề thi.");
      }

      setSection(nextSection);
      setQuestions(payload.test.questions);
      setAnswers({});
      setResults({});
      setSummary(null);
      setCurrentIndex(0);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể tải đề thi.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitTest() {
    if (!section || questions.length === 0) return;

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/jlpt-tests/${level.toLowerCase()}/${testNumber}/grade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section,
            answers: Object.entries(answers).map(
              ([questionId, selectedIndex]) => ({
                questionId,
                selectedIndex,
              }),
            ),
          }),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Bạn cần đăng nhập trước khi nộp bài.");
        }
        throw new Error(payload.message || "Không thể chấm bài.");
      }

      setResults(
        Object.fromEntries(
          (payload.results as GradeResult[]).map((result) => [
            result.questionId,
            result,
          ]),
        ),
      );
      setSummary(payload.summary);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể chấm bài.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function chooseAnswer(questionId: string, selectedIndex: number) {
    if (!section || summary || checkingAnswer) return;

    setAnswers((current) => ({ ...current, [questionId]: selectedIndex }));

    if (feedbackMode === "at-end") return;

    setCheckingAnswer(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/jlpt-tests/${level.toLowerCase()}/${testNumber}/grade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section,
            answers: [{ questionId, selectedIndex }],
          }),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Bạn cần đăng nhập để xem đáp án.");
        }
        throw new Error(payload.message || "Không thể kiểm tra đáp án.");
      }

      const result = (payload.results as GradeResult[])[0];
      if (result) {
        setResults((current) => ({
          ...current,
          [result.questionId]: result,
        }));
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể kiểm tra đáp án.",
      );
    } finally {
      setCheckingAnswer(false);
    }
  }

  function leaveSection() {
    setSection(null);
    setQuestions([]);
    setAnswers({});
    setResults({});
    setSummary(null);
    setCurrentIndex(0);
    setMessage("");
  }

  if (!section) {
    return (
      <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        <Link
          className="inline-flex items-center gap-2 text-sm font-black text-slate-600 hover:text-rose-600"
          href="/flashcards"
        >
          <FiArrowLeft /> Quay lại khóa học
        </Link>
        <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-600">
            JLPT {level}
          </p>
          <h1 className="mt-3 text-4xl font-black text-slate-950">{title}</h1>
          <p className="mt-3 text-slate-500">
            Chọn một phần thi để bắt đầu. Đáp án chỉ được kiểm tra trên máy chủ
            sau khi bạn nộp bài.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <SectionButton
              description="文字・語彙 (Moji / Goi)"
              disabled={loading}
              icon={<FiFileText />}
              onClick={() => startSection("vocabulary-kanji")}
              title="Từ vựng + Kanji"
            />
            <SectionButton
              description="文法・読解 (Bunpou / Dokkai)"
              disabled={loading}
              icon={<FiBookOpen />}
              onClick={() => startSection("grammar-reading")}
              title="Ngữ pháp + Reading"
            />
          </div>
          {message && (
            <p className="mt-5 rounded-xl bg-rose-50 p-4 font-bold text-rose-700">
              {message}
            </p>
          )}
        </div>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="grid min-h-[calc(100vh-5rem)] place-items-center p-6">
        <p className="font-bold text-slate-500">
          {loading ? "Đang tải đề thi..." : "Phần thi này chưa có câu hỏi."}
        </p>
      </main>
    );
  }

  const question = questions[currentIndex];
  const selectedIndex = answers[question.id];
  const result =
    feedbackMode === "immediate" || summary
      ? results[question.id]
      : undefined;
  const answeredCount = Object.keys(answers).length;

  return (
    <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            className="inline-flex items-center gap-2 text-sm font-black text-rose-600"
            onClick={leaveSection}
            type="button"
          >
            <FiArrowLeft /> Chọn phần khác
          </button>
          <h1 className="mt-3 text-2xl font-black text-slate-950">{title}</h1>
          <p className="text-sm font-bold text-slate-500">
            {section === "vocabulary-kanji"
              ? "Từ vựng + Kanji"
              : "Ngữ pháp + Reading"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 bg-slate-950 p-1 text-xs font-black">
            <button
              className={`rounded-lg px-3 py-2 transition ${
                feedbackMode === "immediate"
                  ? "bg-rose-500 text-white"
                  : "text-slate-300 hover:text-white"
              }`}
              onClick={() => setFeedbackMode("immediate")}
              type="button"
            >
              Hiện đáp án
            </button>
            <button
              className={`rounded-lg px-3 py-2 transition ${
                feedbackMode === "at-end"
                  ? "bg-rose-500 text-white"
                  : "text-slate-300 hover:text-white"
              }`}
              onClick={() => setFeedbackMode("at-end")}
              type="button"
            >
              Ẩn đáp án
            </button>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">
            {answeredCount}/{questions.length} câu đã trả lời
          </div>
        </div>
      </div>

      {summary && (
        <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-black text-emerald-800">
            <FiCheck className="mr-2 inline" />
            Kết quả: {summary.correct}/{summary.total} câu đúng ·{" "}
            {summary.percentage}%
          </p>
        </section>
      )}

      <section className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
        <div className="flex items-center justify-between gap-3 text-sm font-bold text-slate-500">
          <span>{question.group}</span>
          <span>
            Câu {currentIndex + 1}/{questions.length}
          </span>
        </div>
        {question.instruction && (
          <p className="mt-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            {question.instruction}
          </p>
        )}
        <h2 className="mt-6 whitespace-pre-wrap text-xl font-black leading-relaxed text-slate-950 sm:text-2xl">
          <HighlightedPrompt
            highlightText={question.highlightText}
            prompt={question.prompt}
          />
        </h2>

        <div className="mt-6 grid gap-3">
          {question.options.map((option, optionIndex) => {
            const selected = selectedIndex === optionIndex;
            const isCorrect = result?.correctIndex === optionIndex;
            const isWrongSelection = Boolean(result) && selected && !isCorrect;
            const tone = isCorrect
              ? "border-emerald-500 bg-emerald-50 text-emerald-900"
              : isWrongSelection
                ? "border-rose-500 bg-rose-50 text-rose-900"
                : selected
                  ? "border-blue-500 bg-blue-50 text-blue-900"
                  : "border-slate-200 bg-white text-slate-800 hover:border-teal-300";

            return (
              <button
                className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left font-bold transition ${tone}`}
                disabled={Boolean(summary) || checkingAnswer}
                key={`${question.id}-${optionIndex}`}
                onClick={() => chooseAnswer(question.id, optionIndex)}
                type="button"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current text-xs">
                  {optionIndex + 1}
                </span>
                {option}
              </button>
            );
          })}
        </div>

        {result && (
          <div
            className={`mt-5 rounded-xl p-4 font-bold ${
              result.correct
                ? "bg-emerald-50 text-emerald-800"
                : "bg-rose-50 text-rose-800"
            }`}
          >
            {summary
              ? result.correct
                ? "Chính xác"
                : "Chưa đúng"
              : `Đáp án đúng: ${question.options[result.correctIndex]}`}
            {result.explanation && (
              <p className="mt-2 text-sm font-semibold text-slate-600">
                {result.explanation}
              </p>
            )}
          </div>
        )}

        <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-5">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 font-black disabled:opacity-30"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((value) => value - 1)}
            type="button"
          >
            <FiChevronLeft /> Trước
          </button>
          <div className="flex gap-3">
            {!summary && (
              <button
                className="h-11 rounded-xl bg-emerald-600 px-5 font-black text-white disabled:opacity-50"
                disabled={submitting || answeredCount === 0}
                onClick={submitTest}
                type="button"
              >
                {submitting ? "Đang chấm..." : "Nộp bài"}
              </button>
            )}
            <button
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-5 font-black text-white disabled:opacity-30"
              disabled={currentIndex === questions.length - 1}
              onClick={() => setCurrentIndex((value) => value + 1)}
              type="button"
            >
              Tiếp <FiChevronRight />
            </button>
          </div>
        </div>
        {message && (
          <p className="mt-4 rounded-xl bg-rose-50 p-4 font-bold text-rose-700">
            {message}{" "}
            {message.includes("đăng nhập") && (
              <Link className="underline" href="/login">
                Đăng nhập
              </Link>
            )}
          </p>
        )}
      </section>

      <div className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        {questions.map((item, index) => {
          const answered = answers[item.id] !== undefined;
          const graded =
            feedbackMode === "immediate" || summary
              ? results[item.id]
              : undefined;
          const tone =
            index === currentIndex
              ? "bg-blue-700 text-white"
              : graded
                ? graded.correct
                  ? "bg-emerald-600 text-white"
                  : "bg-rose-600 text-white"
                : answered
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-600";

          return (
            <button
              className={`h-9 w-9 rounded-lg text-xs font-black ${tone}`}
              key={item.id}
              onClick={() => setCurrentIndex(index)}
              type="button"
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </main>
  );
}

function HighlightedPrompt({
  highlightText,
  prompt,
}: Readonly<{ highlightText?: string; prompt: string }>) {
  if (!highlightText) return prompt;

  const start = prompt.indexOf(highlightText);
  if (start < 0) return prompt;

  return (
    <>
      {prompt.slice(0, start)}
      <span className="underline decoration-2 decoration-rose-500 underline-offset-4">
        {highlightText}
      </span>
      {prompt.slice(start + highlightText.length)}
    </>
  );
}

function SectionButton({
  description,
  disabled,
  icon,
  onClick,
  title,
}: Readonly<{
  description: string;
  disabled: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
}>) {
  return (
    <button
      className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-left shadow-lg transition hover:-translate-y-1 hover:border-teal-300 disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-2xl text-teal-700">
        {icon}
      </span>
      <strong className="mt-5 block text-2xl font-black text-slate-950">
        {title}
      </strong>
      <span className="mt-2 block font-semibold text-slate-500">
        {description}
      </span>
    </button>
  );
}
