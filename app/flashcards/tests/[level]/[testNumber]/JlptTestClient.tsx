"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiBookOpen,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiHeadphones,
  FiLayers,
} from "react-icons/fi";
import { HighlightFeedback } from "./HighlightFeedback";

type Section = "vocabulary-kanji" | "grammar-reading" | "listening";
type PracticeMode = Section | "full";
type FeedbackMode = "immediate" | "at-end";

type Question = {
  id: string;
  group: string;
  instruction: string;
  prompt: string;
  highlightText?: string;
  imageUrl?: string;
  audioUrl?: string;
  options: string[];
  sourceSection?: Section;
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
  hasListening,
  level,
  testTitle,
  testNumber,
}: Readonly<{ courseId: string; hasListening: boolean; level: string; testTitle: string; testNumber: number }>) {
  const [section, setSection] = useState<PracticeMode | null>(null);
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
  const learningVisitRecorded = useRef(false);

  const title = testTitle;

  useEffect(() => {
    if (learningVisitRecorded.current) return;
    learningVisitRecorded.current = true;

    fetch(`/api/courses/${courseId}/learn`, { method: "POST" }).catch(
      () => undefined,
    );
  }, [courseId]);

  async function startSection(nextSection: PracticeMode) {
    setLoading(true);
    setMessage("");

    try {
      const requestedSections: Section[] = nextSection === "full"
        ? hasListening ? ["vocabulary-kanji", "grammar-reading", "listening"] : ["vocabulary-kanji", "grammar-reading"]
        : [nextSection];
      const loadedSections = await Promise.all(
        requestedSections.map(async (requestedSection) => {
          const response = await fetch(
            `/api/jlpt-tests/${level.toLowerCase()}/${testNumber}?section=${requestedSection}`,
            { cache: "no-store" },
          );
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.message || "Không thể tải đề thi.");
          }
          return (payload.test.questions as Question[]).map((question) => ({
            ...question,
            sourceSection: requestedSection,
          }));
        }),
      );

      setSection(nextSection);
      setQuestions(loadedSections.flat());
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
      const sectionsToGrade: Section[] = section === "full"
        ? hasListening ? ["vocabulary-kanji", "grammar-reading", "listening"] : ["vocabulary-kanji", "grammar-reading"]
        : [section];
      const payloads = await Promise.all(
        sectionsToGrade.map(async (gradeSection) => {
          const validIds = new Set(
            questions
              .filter((question) => question.sourceSection === gradeSection)
              .map((question) => question.id),
          );
          const response = await fetch(
            `/api/jlpt-tests/${level.toLowerCase()}/${testNumber}/grade`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                section: gradeSection,
                answers: Object.entries(answers)
                  .filter(([questionId]) => validIds.has(questionId))
                  .map(([questionId, selectedIndex]) => ({ questionId, selectedIndex })),
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
          return payload as { results: GradeResult[]; summary: GradeSummary };
        }),
      );
      const combinedResults = payloads.flatMap((payload) => payload.results);
      const combinedSummary = payloads.reduce(
        (total, payload) => ({
          answered: total.answered + payload.summary.answered,
          total: total.total + payload.summary.total,
          correct: total.correct + payload.summary.correct,
          percentage: 0,
        }),
        { answered: 0, total: 0, correct: 0, percentage: 0 },
      );
      combinedSummary.percentage = combinedSummary.total
        ? Math.round((combinedSummary.correct / combinedSummary.total) * 100)
        : 0;

      setResults(
        Object.fromEntries(
          combinedResults.map((result) => [
            result.questionId,
            result,
          ]),
        ),
      );
      setSummary(combinedSummary);
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
    playUiSound("select");
    const questionSection = questions.find((question) => question.id === questionId)?.sourceSection;
    const gradeSection = section === "full" ? questionSection : section;
    if (!gradeSection) return;

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
            section: gradeSection,
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
        playUiSound(result.correct ? "correct" : "wrong");
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

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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
            {hasListening ? <SectionButton
              description="聴解 (Choukai)"
              disabled={loading}
              icon={<FiHeadphones />}
              onClick={() => startSection("listening")}
              title="Nghe hiểu"
            /> : null}
            <SectionButton
              description="Làm toàn bộ đề trong một lần"
              disabled={loading}
              icon={<FiLayers />}
              onClick={() => startSection("full")}
              title="Luyện full"
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

  if (section === "full") {
    return (
      <FullTestView
        answers={answers}
        checkingAnswer={checkingAnswer}
        feedbackMode={feedbackMode}
        level={level}
        message={message}
        onChooseAnswer={chooseAnswer}
        onLeave={leaveSection}
        onSubmit={submitTest}
        onToggleFeedback={setFeedbackMode}
        questions={questions}
        results={results}
        submitting={submitting}
        summary={summary}
        testNumber={testNumber}
        title={title}
      />
    );
  }

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
            {section === "vocabulary-kanji" ? "Từ vựng + Kanji" : section === "grammar-reading" ? "Ngữ pháp + Reading" : "Nghe hiểu"}
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
        <QuestionMedia question={question} />

        {section !== "listening" ? <HighlightFeedback
          level={level}
          testNumber={testNumber}
          section={section === "vocabulary-kanji" ? "vocabularyKanji" : "grammarReading"}
          questionId={question.id}
          prompt={question.prompt}
        /> : null}

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
              onClick={() => {
                playUiSound("next");
                setCurrentIndex((value) => value + 1);
              }}
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

function FullTestView({
  answers,
  checkingAnswer,
  feedbackMode,
  level,
  message,
  onChooseAnswer,
  onLeave,
  onSubmit,
  onToggleFeedback,
  questions,
  results,
  submitting,
  summary,
  testNumber,
  title,
}: Readonly<{
  answers: Record<string, number>;
  checkingAnswer: boolean;
  feedbackMode: FeedbackMode;
  level: string;
  message: string;
  onChooseAnswer: (questionId: string, selectedIndex: number) => void;
  onLeave: () => void;
  onSubmit: () => void;
  onToggleFeedback: (mode: FeedbackMode) => void;
  questions: Question[];
  results: Record<string, GradeResult>;
  submitting: boolean;
  summary: GradeSummary | null;
  testNumber: number;
  title: string;
}>) {
  const [secondsLeft, setSecondsLeft] = useState(90 * 60);

  useEffect(() => {
    if (summary || secondsLeft <= 0) return;
    const timer = window.setInterval(
      () => setSecondsLeft((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [secondsLeft, summary]);

  const answeredCount = Object.keys(answers).length;
  const groups = questions.reduce<Array<{ label: string; questions: Question[] }>>(
    (items, question) => {
      const sectionLabel = question.sourceSection === "vocabulary-kanji"
        ? "Từ vựng · Kanji"
        : question.sourceSection === "grammar-reading" ? "Ngữ pháp · Reading" : "Nghe hiểu";
      const label = `${sectionLabel} — ${question.group || "Câu hỏi"}`;
      const current = items.at(-1);
      if (current?.label === label) current.questions.push(question);
      else items.push({ label, questions: [question] });
      return items;
    },
    [],
  );
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-[1500px] px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button className="inline-flex items-center gap-2 text-sm font-black text-rose-600" onClick={onLeave} type="button">
            <FiArrowLeft /> Chọn phần khác
          </button>
          <h1 className="mt-2 text-2xl font-black text-slate-950">{title} · Luyện full</h1>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Làm toàn bộ {questions.length} câu hỏi trong một lần.
          </p>
        </div>
        <AnswerVisibilityToggle mode={feedbackMode} onChange={onToggleFeedback} />
      </div>

      {summary && (
        <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 font-black text-emerald-800">
          <FiCheck className="mr-2 inline" />
          Kết quả: {summary.correct}/{summary.total} câu đúng · {summary.percentage}%
        </section>
      )}

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {questions.map((question, questionIndex) => {
            const selectedIndex = answers[question.id];
            const result = feedbackMode === "immediate" || summary ? results[question.id] : undefined;

            return (
              <article
                className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                id={`full-question-${questionIndex + 1}`}
                key={question.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-teal-700">{question.group}</p>
                  <span className="text-sm font-black text-slate-500">Câu {questionIndex + 1}</span>
                </div>
                {question.instruction && (
                  <p className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">
                    {question.instruction}
                  </p>
                )}
                <h2 className="mt-5 whitespace-pre-wrap text-lg font-black leading-8 text-slate-950">
                  <HighlightedPrompt highlightText={question.highlightText} prompt={question.prompt} />
                </h2>
                <QuestionMedia question={question} />
                {question.sourceSection !== "listening" ? <HighlightFeedback
                  level={level}
                  testNumber={testNumber}
                  section={question.sourceSection === "vocabulary-kanji" ? "vocabularyKanji" : "grammarReading"}
                  questionId={question.id}
                  prompt={question.prompt}
                /> : null}
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => {
                    const selected = selectedIndex === optionIndex;
                    const correct = result?.correctIndex === optionIndex;
                    const wrong = Boolean(result) && selected && !correct;
                    const tone = correct
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : wrong
                        ? "border-rose-500 bg-rose-50 text-rose-900"
                        : selected
                          ? "border-blue-500 bg-blue-50 text-blue-900"
                          : "border-slate-200 hover:border-teal-400";
                    return (
                      <button
                        className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 text-left font-bold transition ${tone}`}
                        disabled={Boolean(summary) || checkingAnswer}
                        key={`${question.id}-${optionIndex}`}
                        onClick={() => onChooseAnswer(question.id, optionIndex)}
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
                  <div className={`mt-4 rounded-xl p-4 font-bold ${result.correct ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                    {result.correct ? "Chính xác" : `Đáp án đúng: ${question.options[result.correctIndex]}`}
                    {result.explanation && <p className="mt-2 text-sm font-semibold text-slate-600">{result.explanation}</p>}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <aside className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border-2 border-teal-500 bg-teal-50/90 p-4 shadow-lg">
          <div className="flex items-center justify-center gap-2 text-lg font-black text-slate-800">
            <FiClock className="text-teal-600" />
            {minutes}:{String(seconds).padStart(2, "0")}
          </div>
          {!summary && (
            <button
              className="mt-4 h-11 w-full rounded-full bg-slate-800 font-black text-white transition hover:bg-rose-600 disabled:opacity-50"
              disabled={submitting || answeredCount === 0}
              onClick={onSubmit}
              type="button"
            >
              {submitting ? "Đang chấm..." : "Nộp bài"}
            </button>
          )}
          <p className="mt-3 text-center text-xs font-bold text-slate-500">
            {answeredCount}/{questions.length} câu đã trả lời
          </p>
          <div className="mt-4 space-y-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-black text-teal-800">{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {group.questions.map((question) => {
                    const index = questions.findIndex((item) => item.id === question.id);
                    const result = feedbackMode === "immediate" || summary ? results[question.id] : undefined;
                    const tone = result
                      ? result.correct ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                      : answers[question.id] !== undefined
                        ? "border-blue-600 bg-blue-100 text-blue-800"
                        : "border-slate-300 bg-white text-slate-700";
                    return (
                      <button
                        className={`grid h-9 w-9 place-items-center rounded-full border text-xs font-black ${tone}`}
                        key={question.id}
                        onClick={() => document.getElementById(`full-question-${index + 1}`)?.scrollIntoView({ behavior: "smooth" })}
                        type="button"
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {message && <p className="mt-5 rounded-xl bg-rose-50 p-4 font-bold text-rose-700">{message}</p>}
    </main>
  );
}

function AnswerVisibilityToggle({
  mode,
  onChange,
}: Readonly<{ mode: FeedbackMode; onChange: (mode: FeedbackMode) => void }>) {
  return (
    <div className="flex rounded-xl border border-slate-200 bg-slate-950 p-1 text-xs font-black">
      <button
        className={`rounded-lg px-3 py-2 transition ${mode === "immediate" ? "bg-rose-500 text-white" : "text-slate-300 hover:text-white"}`}
        onClick={() => onChange("immediate")}
        type="button"
      >
        Hiện đáp án
      </button>
      <button
        className={`rounded-lg px-3 py-2 transition ${mode === "at-end" ? "bg-rose-500 text-white" : "text-slate-300 hover:text-white"}`}
        onClick={() => onChange("at-end")}
        type="button"
      >
        Ẩn đáp án
      </button>
    </div>
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

function QuestionMedia({ question }: Readonly<{ question: Question }>) {
  if (!question.imageUrl && !question.audioUrl) return null;
  return (
    <div className="mt-5 space-y-4">
      {question.audioUrl ? (
        <audio className="w-full" controls preload="metadata" src={question.audioUrl}>
          Trình duyệt của bạn không hỗ trợ phát âm thanh.
        </audio>
      ) : null}
      {question.imageUrl ? (
        <img alt="Tranh minh họa câu hỏi" className="mx-auto max-h-[520px] w-auto max-w-full rounded-xl border border-slate-200 object-contain" src={question.imageUrl} />
      ) : null}
    </div>
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

type UiSound = "select" | "next" | "correct" | "wrong";

function playUiSound(sound: UiSound) {
  try {
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(sound === "wrong" ? 0.12 : 0.09, now + 0.01);
    master.gain.exponentialRampToValueAtTime(0.0001, now + (sound === "correct" ? 0.32 : 0.2));
    master.connect(context.destination);

    const notes = sound === "correct"
      ? [{ frequency: 523.25, start: 0 }, { frequency: 659.25, start: 0.09 }, { frequency: 783.99, start: 0.18 }]
      : sound === "wrong"
        ? [{ frequency: 220, start: 0 }, { frequency: 174.61, start: 0.1 }]
        : sound === "next"
          ? [{ frequency: 440, start: 0 }, { frequency: 587.33, start: 0.07 }]
          : [{ frequency: 620, start: 0 }];

    notes.forEach(({ frequency, start }) => {
      const oscillator = context.createOscillator();
      const noteGain = context.createGain();
      oscillator.type = sound === "wrong" ? "sawtooth" : "sine";
      oscillator.frequency.setValueAtTime(frequency, now + start);
      noteGain.gain.setValueAtTime(0.0001, now + start);
      noteGain.gain.exponentialRampToValueAtTime(1, now + start + 0.008);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.11);
      oscillator.connect(noteGain);
      noteGain.connect(master);
      oscillator.start(now + start);
      oscillator.stop(now + start + 0.12);
    });
    window.setTimeout(() => context.close().catch(() => undefined), 700);
  } catch {
    // Âm thanh là hiệu ứng bổ trợ; không làm gián đoạn bài thi nếu trình duyệt không hỗ trợ.
  }
}
