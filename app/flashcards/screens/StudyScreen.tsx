"use client";

import { useState } from "react";
import { FiArrowLeft, FiBookOpen, FiCheck, FiGlobe, FiLink, FiRotateCcw, FiSearch, FiVolume2, FiX } from "react-icons/fi";
import { modes } from "../data";
import type { AnswerState, StudyMode, Word } from "../types";
import { MetricCard } from "../components/Cards";

type GradeResult = {
  score: number;
  isNatural: boolean;
  correctedSentence: string;
  naturalSentence: string;
  feedbackVi: string;
  grammarNotes: string[];
  vocabularyHints: string[];
};

export function StudyScreen({
  answerState,
  answers,
  currentWord,
  flipped,
  mode,
  stats,
  title,
  vocabularyOpen,
  vocabularyQuery,
  words,
  typingAnswer,
  typingState,
  onBack,
  onChoose,
  onCloseVocabulary,
  onContinueFlashcard,
  onContinueMeaning,
  onFlip,
  onModeChange,
  onNext,
  onOpenVocabulary,
  onSpeak,
  onSkipWord,
  onTypingAnswerChange,
  onTypingSubmit,
  onVocabularyQueryChange,
  selectedAnswer,
}: Readonly<{
  answerState: AnswerState;
  answers: string[];
  currentWord: Word;
  flipped: boolean;
  mode: StudyMode;
  stats: {
    newWords: number;
    review: number;
    total: number;
  };
  title: string;
  vocabularyOpen: boolean;
  vocabularyQuery: string;
  words: Word[];
  typingAnswer: string;
  typingState: AnswerState;
  onBack: () => void;
  onChoose: (answer: string) => void;
  onCloseVocabulary: () => void;
  onContinueFlashcard: () => void;
  onContinueMeaning: () => void;
  onFlip: () => void;
  onModeChange: (mode: StudyMode) => void;
  onNext: () => void;
  onOpenVocabulary: () => void;
  onSpeak: (text?: string) => void;
  onSkipWord: () => void;
  onTypingAnswerChange: (value: string) => void;
  onTypingSubmit: () => void;
  onVocabularyQueryChange: (value: string) => void;
  selectedAnswer: string;
}>) {
  const filteredWords = words.filter((word) => {
    const query = vocabularyQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [word.term, word.kana, word.romaji, word.meaning, word.type].some((value) => value.toLowerCase().includes(query));
  });

  return (
    <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-10">
      <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/[0.04]">
        <button className="mb-5 flex h-12 items-center gap-3 rounded-2xl px-2 text-left font-black text-slate-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50" onClick={onBack} type="button">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200">
            <FiArrowLeft />
          </span>
          {title}
        </button>

        <div className="space-y-2">
          {modes.map((item) => {
            const Icon = item.icon;
            const active = item.id === mode;
            return (
              <button
                className={`group w-full rounded-2xl border p-3 text-left transition-all duration-300 ${
                  active
                    ? "border-rose-200 bg-rose-50 text-rose-700 shadow-lg shadow-rose-500/8"
                    : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700"
                }`}
                key={item.id}
                onClick={() => onModeChange(item.id)}
                type="button"
              >
                <span className="flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl transition ${active ? "bg-white" : "bg-slate-50 group-hover:bg-teal-50"}`}>
                    <Icon />
                  </span>
                  <span>
                    <span className="block font-black">{item.title}</span>
                    <span className="block text-xs text-slate-400">{item.subtitle}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <button
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 font-black text-teal-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-100"
          onClick={onOpenVocabulary}
          type="button"
        >
          <FiBookOpen /> Xem từ vựng
        </button>
      </aside>

      <section>
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <MetricCard label="Tổng từ" value={String(stats.total)} tone="bg-indigo-50 text-indigo-700" />
          <MetricCard label="Cần học" value={String(stats.newWords)} tone="bg-teal-50 text-teal-700" />
          <MetricCard label="Cần ôn" value={String(stats.review)} tone="bg-amber-50 text-amber-700" />
        </div>

        {mode === "meaning" && (
          <MeaningExercise
            answerState={answerState}
            answers={answers}
            currentWord={currentWord}
            onChoose={onChoose}
            onNext={onContinueMeaning}
            onSpeak={onSpeak}
            selectedAnswer={selectedAnswer}
          />
        )}
        {mode === "flashcard" && <FlashcardExercise currentWord={currentWord} flipped={flipped} onFlip={onFlip} onKnown={onSkipWord} onNext={onContinueFlashcard} onSpeak={onSpeak} />}
        {mode === "typing" && (
          <TypingExercise
            answer={typingAnswer}
            currentWord={currentWord}
            onAnswerChange={onTypingAnswerChange}
            onNext={onTypingSubmit}
            onSpeak={onSpeak}
            state={typingState}
          />
        )}
        {mode === "example" && <ExampleExercise currentWord={currentWord} key={currentWord.id || currentWord.term} onNext={onNext} onSpeak={onSpeak} />}
      </section>
      {vocabularyOpen && (
        <VocabularyDialog
          filteredWords={filteredWords}
          onClose={onCloseVocabulary}
          onQueryChange={onVocabularyQueryChange}
          query={vocabularyQuery}
          title={title}
          total={words.length}
        />
      )}
    </div>
  );
}

function MeaningExercise({
  answerState,
  answers,
  currentWord,
  onChoose,
  onNext,
  onSpeak,
  selectedAnswer,
}: Readonly<{
  answerState: AnswerState;
  answers: string[];
  currentWord: Word;
  onChoose: (answer: string) => void;
  onNext: () => void;
  onSpeak: (text?: string) => void;
  selectedAnswer: string;
}>) {
  return (
    <div>
      <div className="overflow-hidden rounded-[2rem] border border-teal-100 bg-white shadow-2xl shadow-teal-500/8">
        <div className="relative bg-[linear-gradient(135deg,#ccfbf1,#fff7ed)] p-8 text-center">
          <button className="absolute left-5 top-5 rounded-full bg-white/70 px-4 py-2 text-sm font-black text-rose-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white" type="button">
            <FiRotateCcw className="mr-1 inline" /> Học lại
          </button>
          <span className="absolute right-5 top-5 rounded-full bg-amber-200 px-4 py-2 text-sm font-black text-amber-800">Cycle 1</span>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-teal-800">Chọn nghĩa đúng</p>
          <h2 className="mt-5 text-4xl font-black tracking-tight">
            {currentWord.term}
            <span className="ml-2 text-base font-bold text-slate-500">({currentWord.type})</span>
            <button
              aria-label="Ph\u00e1t \u00e2m ti\u1ebfng Nh\u1eadt"
              className="ml-3 inline-grid h-11 w-11 place-items-center rounded-full bg-white/80 text-teal-700 transition hover:-translate-y-0.5 hover:bg-white"
              onClick={() => onSpeak()}
              type="button"
            >
              <FiVolume2 />
            </button>
          </h2>
          <p className="mt-3 font-medium text-slate-500">{currentWord.kana} / {currentWord.romaji}</p>
        </div>
      </div>

      {answerState === "idle" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {answers.map((answer) => (
            <button
              className="group flex min-h-16 items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 text-left font-black shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-500/10"
              key={answer}
              onClick={() => onChoose(answer)}
              type="button"
            >
              <span className="h-6 w-6 rounded-full border-2 border-slate-300 transition group-hover:border-teal-500 group-hover:bg-teal-50" />
              {answer}
            </button>
          ))}
        </div>
      ) : (
        <ResultPanel currentWord={currentWord} isCorrect={answerState === "correct"} onNext={onNext} onSpeak={onSpeak} selectedAnswer={selectedAnswer} />
      )}
    </div>
  );
}

function VocabularyDialog({
  filteredWords,
  onClose,
  onQueryChange,
  query,
  title,
  total,
}: Readonly<{
  filteredWords: Word[];
  onClose: () => void;
  onQueryChange: (value: string) => void;
  query: string;
  title: string;
  total: number;
}>) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-950/25">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-600">Danh sách từ vựng</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">{total} từ trong khóa học</p>
            </div>
            <button className="grid h-11 w-11 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" onClick={onClose} type="button">
              <FiX />
            </button>
          </div>
          <label className="mt-5 flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-teal-300 focus-within:bg-white">
            <FiSearch className="text-slate-400" />
            <input
              className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-400"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Tìm theo tiếng Nhật, kana, romaji hoặc nghĩa..."
              value={query}
            />
          </label>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-2">
            {filteredWords.map((word) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/40" key={`${word.term}-${word.meaning}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-950">{word.term}</h3>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {[word.kana, word.romaji].filter(Boolean).join(" / ") || "IT"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">{word.type}</span>
                </div>
                <p className="mt-3 text-sm font-bold text-teal-800">{word.meaning}</p>
              </article>
            ))}
          </div>
          {filteredWords.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-500">
              Không tìm thấy từ phù hợp.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  currentWord,
  isCorrect,
  onNext,
  onSpeak,
  selectedAnswer,
}: Readonly<{
  currentWord: Word;
  isCorrect: boolean;
  onNext: () => void;
  onSpeak: (text?: string) => void;
  selectedAnswer: string;
}>) {
  return (
    <div className={`mt-6 rounded-[2rem] border-2 p-6 shadow-2xl ${isCorrect ? "border-teal-300 bg-teal-50 shadow-teal-500/10" : "border-rose-300 bg-rose-50 shadow-rose-500/10"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-slate-300 pb-4">
        <p className={`text-lg font-black ${isCorrect ? "text-teal-700" : "text-rose-600"}`}>
          {isCorrect ? <FiCheck className="mr-2 inline" /> : <FiX className="mr-2 inline" />}
          {isCorrect ? "Chính xác!" : "Chưa đúng rồi!"}
        </p>
        <button className={`rounded-2xl px-5 py-3 font-black text-white transition-all duration-300 hover:-translate-y-0.5 ${isCorrect ? "bg-teal-600 hover:bg-teal-700" : "bg-rose-600 hover:bg-rose-700"}`} onClick={onNext} type="button">
          Tiếp tục
        </button>
      </div>
      <div className="pt-5">
        {!isCorrect && <p className="mb-2 text-sm font-bold text-rose-700">Bạn đã chọn: {selectedAnswer}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-3xl font-black">{currentWord.term}</h3>
          <SoundButton onSpeak={() => onSpeak()} />
        </div>
        <p className="mt-1 text-xl font-bold">{currentWord.meaning}</p>
        <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
          <p className="font-semibold italic">
            {currentWord.example}
            <button aria-label="Ph\u00e1t \u00e2m c\u00e2u m\u1eabu" className="ml-2 inline-grid h-8 w-8 place-items-center rounded-full text-teal-700 transition hover:bg-teal-50" onClick={() => onSpeak(currentWord.example)} type="button">
              <FiVolume2 />
            </button>
          </p>
          <ExampleTranslation currentWord={currentWord} />
        </div>
        <DeepLearnActions />
      </div>
    </div>
  );
}

function FlashcardExercise({
  currentWord,
  flipped,
  onFlip,
  onKnown,
  onNext,
  onSpeak,
}: Readonly<{
  currentWord: Word;
  flipped: boolean;
  onFlip: () => void;
  onKnown: () => void;
  onNext: () => void;
  onSpeak: (text?: string) => void;
}>) {
  return (
    <div>
      <button className="group block min-h-[360px] w-full [perspective:1200px]" onClick={onFlip} type="button">
        <div
          className="relative min-h-[360px] rounded-[2rem] transition-transform duration-500 [transform-style:preserve-3d] group-hover:-translate-y-1"
          style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          <div className="absolute inset-0 rounded-[2rem] border border-indigo-100 bg-white p-8 text-center shadow-2xl shadow-indigo-500/8 [backface-visibility:hidden]">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-black text-teal-700">{"T\u1eeb m\u1edbi"}</span>
              <span className="text-sm font-bold text-slate-400">{"B\u1ea5m \u0111\u1ec3 l\u1eadt"}</span>
            </div>
            <div className="grid min-h-64 place-items-center">
              <div>
                <h2 className="text-5xl font-black text-indigo-600">{currentWord.term}</h2>
                <p className="mt-5 text-slate-500">{currentWord.kana} / {currentWord.romaji}</p>
                <p className="mt-8 text-sm font-black uppercase tracking-widest text-slate-400">{"M\u1eb7t tr\u01b0\u1edbc"}</p>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 rounded-[2rem] border border-teal-100 bg-[linear-gradient(135deg,#ecfeff,#fff7ed)] p-8 text-center shadow-2xl shadow-teal-500/10 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-700">{"M\u1eb7t sau"}</span>
              <span className="text-sm font-bold text-slate-400">{"B\u1ea5m \u0111\u1ec3 quay l\u1ea1i"}</span>
            </div>
            <div className="grid min-h-64 place-items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-teal-700">{"Ngh\u0129a"}</p>
                <h2 className="mt-4 text-4xl font-black">{currentWord.meaning}</h2>
                <p className="mt-5 text-lg text-slate-500">{currentWord.exampleVi}</p>
              </div>
            </div>
          </div>
        </div>
      </button>
      <div className="mt-5 flex flex-wrap justify-between gap-3">
        <button className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-black text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700" onClick={onKnown} type="button">
          {"\u0110\u00e3 thu\u1ed9c"}
        </button>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-5 py-3 font-black text-teal-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-100" onClick={() => onSpeak()} type="button">
            <FiVolume2 /> {"Nghe"}
          </button>
          <button className="rounded-2xl bg-indigo-600 px-7 py-3 font-black text-white shadow-lg shadow-indigo-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-700" onClick={onNext} type="button">
            {"Ti\u1ebfp t\u1ee5c"}
          </button>
        </div>
      </div>
      <DeepLearnActions />
    </div>
  );
}

function TypingExercise({
  answer,
  currentWord,
  onAnswerChange,
  onNext,
  onSpeak,
  state,
}: Readonly<{
  answer: string;
  currentWord: Word;
  onAnswerChange: (value: string) => void;
  onNext: () => void;
  onSpeak: (text?: string) => void;
  state: AnswerState;
}>) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-900/[0.05]">
      <p className="text-center text-sm font-black uppercase tracking-[0.24em] text-teal-700">{"G\u00f5 t\u1eeb ti\u1ebfng Nh\u1eadt"}</p>
      <h2 className="mt-5 text-center text-4xl font-black">{currentWord.meaning}</h2>
      <p className="mt-3 text-center text-slate-500">{"C\u00f3 th\u1ec3 nh\u1eadp Kanji, Kana ho\u1eb7c Romaji."}</p>
      <div className="mt-5 flex justify-center">
        <button className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-5 py-3 font-black text-teal-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-100" onClick={() => onSpeak()} type="button">
          <FiVolume2 /> {"Nghe l\u1ea1i t\u1eeb"}
        </button>
      </div>
      <input
        className={`mt-8 h-16 w-full rounded-2xl border px-5 text-center text-xl font-bold outline-none transition-all duration-300 focus:bg-white focus:shadow-xl ${
          state === "wrong"
            ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:shadow-rose-500/10"
            : "border-slate-200 bg-slate-50 focus:border-teal-400 focus:shadow-teal-500/10"
        }`}
        onChange={(event) => onAnswerChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onNext();
          }
        }}
        placeholder={"\u4f8b: \u30b7\u30b9\u30c6\u30e0\u958b\u767a / \u3057\u3059\u3066\u3080\u304b\u3044\u306f\u3064 / shisutemu kaihatsu"}
        value={answer}
      />
      {state === "wrong" && (
        <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-center text-sm font-bold text-rose-700">
          {"Ch\u01b0a kh\u1edbp. \u0110\u00e1p \u00e1n c\u00f3 th\u1ec3 l\u00e0"} {currentWord.term}, {currentWord.kana || "kana"} {"ho\u1eb7c"} {currentWord.romaji || "romaji"}.
        </p>
      )}
      <button className="mt-5 h-14 w-full rounded-2xl bg-slate-950 font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-700" onClick={onNext} type="button">
        {"Ti\u1ebfp t\u1ee5c"}
      </button>
    </div>
  );
}

function ExampleExercise({ currentWord, onNext, onSpeak }: Readonly<{ currentWord: Word; onNext: () => void; onSpeak: (text?: string) => void }>) {
  const [sentence, setSentence] = useState("");
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestedJa, setSuggestedJa] = useState(currentWord.example);
  const [suggestedVi, setSuggestedVi] = useState(currentWord.exampleVi);
  const [suggestionNote, setSuggestionNote] = useState("");
  const [suggestionStatus, setSuggestionStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [suggestionError, setSuggestionError] = useState("");
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState("");

  async function gradeSentence() {
    const trimmedSentence = sentence.trim();

    if (!trimmedSentence) {
      setGradeError("H\u00e3y vi\u1ebft m\u1ed9t c\u00e2u ti\u1ebfng Nh\u1eadt tr\u01b0\u1edbc \u0111\u00e3.");
      setGrade(null);
      return;
    }

    setGrading(true);
    setGradeError("");
    setGrade(null);

    try {
      const response = await fetch("/api/flashcards/grade-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence: trimmedSentence,
          word: {
            term: currentWord.term,
            kana: currentWord.kana,
            romaji: currentWord.romaji,
            meaning: currentWord.meaning,
            example: currentWord.example,
            exampleVi: currentWord.exampleVi,
          },
        }),
      });
      const payload = (await response.json()) as { data?: GradeResult; message?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "AI ch\u01b0a ch\u1ea5m \u0111\u01b0\u1ee3c c\u00e2u n\u00e0y.");
      }

      setGrade(payload.data);
    } catch (error) {
      setGradeError(error instanceof Error ? error.message : "AI ch\u01b0a ch\u1ea5m \u0111\u01b0\u1ee3c c\u00e2u n\u00e0y.");
    } finally {
      setGrading(false);
    }
  }

  async function submitExampleSuggestion() {
    if (!currentWord.id) {
      setSuggestionError("Từ này chưa có ID trong dữ liệu nên chưa gửi góp ý được.");
      setSuggestionStatus("error");
      return;
    }

    setSuggestionStatus("sending");
    setSuggestionError("");

    try {
      const response = await fetch("/api/example-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vocabularyId: currentWord.id,
          suggestedJa,
          suggestedVi,
          note: suggestionNote,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Không thể gửi góp ý mẫu câu.");
      }

      setSuggestionStatus("sent");
      setSuggestionNote("");
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : "Không thể gửi góp ý mẫu câu.");
      setSuggestionStatus("error");
    }
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-teal-200 bg-white shadow-2xl shadow-teal-500/8">
      <div className="bg-teal-50 p-8 text-center">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-teal-700">{"\u0110\u1eb7t c\u00e2u v\u1edbi t\u1eeb n\u00e0y"}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <h2 className="text-4xl font-black">{currentWord.term}</h2>
          <SoundButton onSpeak={() => onSpeak()} />
        </div>
        <p className="mt-2 text-lg font-bold text-rose-700">{currentWord.meaning} / {currentWord.kana}</p>
      </div>
      <div className="border-t border-teal-100 p-6">
        <p className="mb-4 text-sm font-black text-teal-700">{"G\u1ee3i \u00fd m\u1eabu"}</p>
        <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-lg font-semibold">
          <p className="min-w-0 flex-1">{currentWord.example}</p>
          <SoundButton onSpeak={() => onSpeak(currentWord.example)} />
        </div>
        <button
          className="mt-3 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 transition hover:-translate-y-0.5 hover:bg-amber-100"
          onClick={() => {
            setSuggestionOpen((value) => !value);
            setSuggestionStatus("idle");
            setSuggestionError("");
          }}
          type="button"
        >
          Góp ý mẫu câu này
        </button>
        {suggestionOpen && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-widest text-amber-700">Câu Nhật đề xuất</span>
                <textarea className="min-h-24 w-full rounded-2xl border border-amber-200 bg-white p-3 text-sm font-bold outline-none focus:border-amber-400" onChange={(event) => setSuggestedJa(event.target.value)} value={suggestedJa} />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-widest text-amber-700">Nghĩa tiếng Việt</span>
                <textarea className="min-h-24 w-full rounded-2xl border border-amber-200 bg-white p-3 text-sm font-bold outline-none focus:border-amber-400" onChange={(event) => setSuggestedVi(event.target.value)} value={suggestedVi} />
              </label>
            </div>
            <input
              className="mt-3 h-11 w-full rounded-2xl border border-amber-200 bg-white px-4 text-sm font-bold outline-none focus:border-amber-400"
              onChange={(event) => setSuggestionNote(event.target.value)}
              placeholder="Ghi chú thêm cho admin, ví dụ: câu này tự nhiên hơn vì..."
              value={suggestionNote}
            />
            {suggestionStatus === "sent" && <p className="mt-3 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-700">Đã gửi góp ý mẫu câu. Admin sẽ xem và chọn nếu phù hợp.</p>}
            {suggestionError && <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{suggestionError}</p>}
            <button className="mt-3 h-11 rounded-2xl bg-amber-500 px-5 font-black text-white transition hover:bg-amber-600 disabled:opacity-60" disabled={suggestionStatus === "sending"} onClick={submitExampleSuggestion} type="button">
              {suggestionStatus === "sending" ? "Đang gửi..." : "Gửi cho admin duyệt"}
            </button>
          </div>
        )}
        <ExampleTranslation currentWord={currentWord} />
        <textarea
          className="mt-5 min-h-32 w-full rounded-2xl border border-slate-200 bg-white p-4 outline-none transition-all duration-300 focus:border-teal-400 focus:shadow-xl focus:shadow-teal-500/10"
          onChange={(event) => {
            setSentence(event.target.value);
            setGrade(null);
            setGradeError("");
          }}
          placeholder={"T\u1ef1 \u0111\u1eb7t m\u1ed9t c\u00e2u ti\u1ebfng Nh\u1eadt..."}
          value={sentence}
        />
        {gradeError && <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{gradeError}</p>}
        {grade && <GradeFeedback grade={grade} />}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            className="rounded-2xl bg-teal-100 px-6 py-4 font-black text-teal-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={grading}
            onClick={gradeSentence}
            type="button"
          >
            {grading ? "\u0110ang ch\u1ea5m..." : "\u0043h\u1ea5m b\u1eb1ng AI"}
          </button>
          <button className="rounded-2xl bg-rose-600 px-6 py-4 font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-700" onClick={onNext} type="button">
            {"Qua t\u1eeb ti\u1ebfp theo"}
          
          </button>
        </div>
      </div>
    </div>
  );
}

function SoundButton({ onSpeak }: Readonly<{ onSpeak: () => void }>) {
  return (
    <button
      aria-label="Ph\u00e1t \u00e2m ti\u1ebfng Nh\u1eadt"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-teal-200 bg-teal-50 text-teal-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-100"
      onClick={onSpeak}
      type="button"
    >
      <FiVolume2 />
    </button>
  );
}

function ExampleTranslation({ currentWord }: Readonly<{ currentWord: Word }>) {
  const [open, setOpen] = useState(false);
  const reading = getExampleReading(currentWord);

  return (
    <div className="mt-3">
      <button
        className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-100"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <FiGlobe />
        {open ? "\u1ea8n d\u1ecbch" : "D\u1ecbch ngh\u0129a"}
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">{"Ngh\u0129a t\u1eeb"}</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{currentWord.meaning}</p>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-indigo-500">{"D\u1ecbch c\u00e2u"}</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{currentWord.exampleVi}</p>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-indigo-500">{"Phi\u00ean \u00e2m"}</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{reading}</p>
        </div>
      )}
    </div>
  );
}

function GradeFeedback({ grade }: Readonly<{ grade: GradeResult }>) {
  return (
    <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">{"AI nh\u1eadn x\u00e9t"}</p>
          <p className="mt-1 text-sm font-bold text-slate-600">{grade.feedbackVi}</p>
        </div>
        <span className="rounded-2xl bg-white px-4 py-2 text-xl font-black text-teal-700">{grade.score}/100</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <FeedbackBox label="C\u00e2u \u0111\u00e3 s\u1eeda" value={grade.correctedSentence} />
        <FeedbackBox label="T\u1ef1 nhi\u00ean h\u01a1n" value={grade.naturalSentence} />
      </div>

      {(grade.grammarNotes.length > 0 || grade.vocabularyHints.length > 0) && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <FeedbackList items={grade.grammarNotes} title="Ng\u1eef ph\u00e1p" />
          <FeedbackList items={grade.vocabularyHints} title="G\u1ee3i \u00fd t\u1eeb v\u1ef1ng" />
        </div>
      )}
    </div>
  );
}

function FeedbackBox({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-base font-black text-slate-900">{value}</p>
    </div>
  );
}

function FeedbackList({ items, title }: Readonly<{ items: string[]; title: string }>) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{title}</p>
      <ul className="mt-2 space-y-2 text-sm font-bold text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function getExampleReading(word: Word) {
  const kana = word.kana || word.term;
  const romaji = word.romaji;

  if (word.example.includes(word.term)) {
    const kanaSentence = word.example.replace(word.term, kana).replace(/\u3092\u78ba\u8a8d\u3057\u307e\u3059\u3002/g, "\u3092\u304b\u304f\u306b\u3093\u3057\u307e\u3059\u3002");
    const romajiSentence = romaji
      ? word.example.includes("\u3067\u3059\u3002")
        ? `${romaji} desu.`
        : `${romaji} o kakunin shimasu.`
      : "";

    return [kanaSentence, romajiSentence].filter(Boolean).join(" / ");
  }

  return [kana, romaji].filter(Boolean).join(" / ");
}

function DeepLearnActions() {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
      <span className="font-bold text-slate-600">{"H\u1ecdc s\u00e2u h\u01a1n"}</span>
      {["T\u1eeb li\u00ean quan", "Collocation", "Word family"].map((item) => (
        <button className="rounded-full border border-amber-300 bg-amber-50 px-5 py-2 font-bold text-amber-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-100" key={item} type="button">
          <FiLink className="mr-2 inline" />
          {item}
        </button>
      ))}
    </div>
  );
}
