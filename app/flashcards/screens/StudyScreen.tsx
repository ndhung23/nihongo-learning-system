import { FiArrowLeft, FiCheck, FiLink, FiRotateCcw, FiVolume2, FiX } from "react-icons/fi";
import { modes } from "../data";
import type { AnswerState, StudyMode, Word } from "../types";
import { MetricCard } from "../components/Cards";

export function StudyScreen({
  answerState,
  answers,
  currentWord,
  flipped,
  mode,
  onBack,
  onChoose,
  onFlip,
  onModeChange,
  onNext,
  selectedAnswer,
}: Readonly<{
  answerState: AnswerState;
  answers: string[];
  currentWord: Word;
  flipped: boolean;
  mode: StudyMode;
  onBack: () => void;
  onChoose: (answer: string) => void;
  onFlip: () => void;
  onModeChange: (mode: StudyMode) => void;
  onNext: () => void;
  selectedAnswer: string;
}>) {
  return (
    <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-10">
      <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/[0.04]">
        <button className="mb-5 flex h-12 items-center gap-3 rounded-2xl px-2 text-left font-black text-slate-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50" onClick={onBack} type="button">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200">
            <FiArrowLeft />
          </span>
          JLPT N5
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
      </aside>

      <section>
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <MetricCard label="Tổng từ" value="914" tone="bg-indigo-50 text-indigo-700" />
          <MetricCard label="Cần học" value="913" tone="bg-teal-50 text-teal-700" />
          <MetricCard label="Cần ôn" value="1" tone="bg-amber-50 text-amber-700" />
        </div>

        {mode === "meaning" && (
          <MeaningExercise
            answerState={answerState}
            answers={answers}
            currentWord={currentWord}
            onChoose={onChoose}
            onNext={onNext}
            selectedAnswer={selectedAnswer}
          />
        )}
        {mode === "flashcard" && <FlashcardExercise currentWord={currentWord} flipped={flipped} onFlip={onFlip} onNext={onNext} />}
        {mode === "typing" && <TypingExercise currentWord={currentWord} onNext={onNext} />}
        {mode === "example" && <ExampleExercise currentWord={currentWord} onNext={onNext} />}
      </section>
    </div>
  );
}

function MeaningExercise({
  answerState,
  answers,
  currentWord,
  onChoose,
  onNext,
  selectedAnswer,
}: Readonly<{
  answerState: AnswerState;
  answers: string[];
  currentWord: Word;
  onChoose: (answer: string) => void;
  onNext: () => void;
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
            <FiVolume2 className="ml-3 inline text-teal-700" />
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
        <ResultPanel currentWord={currentWord} isCorrect={answerState === "correct"} onNext={onNext} selectedAnswer={selectedAnswer} />
      )}
    </div>
  );
}

function ResultPanel({
  currentWord,
  isCorrect,
  onNext,
  selectedAnswer,
}: Readonly<{
  currentWord: Word;
  isCorrect: boolean;
  onNext: () => void;
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
        <h3 className="text-3xl font-black">{currentWord.term}</h3>
        <p className="mt-1 text-xl font-bold">{currentWord.meaning}</p>
        <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
          <p className="font-semibold italic">{currentWord.example} <FiVolume2 className="ml-2 inline text-teal-700" /></p>
          <p className="mt-2 text-sm text-slate-500">{currentWord.exampleVi}</p>
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
  onNext,
}: Readonly<{
  currentWord: Word;
  flipped: boolean;
  onFlip: () => void;
  onNext: () => void;
}>) {
  return (
    <div>
      <button
        className="group min-h-[360px] w-full rounded-[2rem] border border-indigo-100 bg-white p-8 text-center shadow-2xl shadow-indigo-500/8 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-indigo-500/14"
        onClick={onFlip}
        type="button"
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-black text-teal-700">Từ mới</span>
          <span className="text-sm font-bold text-slate-400">Bấm để lật</span>
        </div>
        <div className="grid min-h-64 place-items-center">
          {!flipped ? (
            <div>
              <h2 className="text-5xl font-black text-indigo-600">{currentWord.term}</h2>
              <p className="mt-5 text-slate-500">{currentWord.kana} / {currentWord.romaji}</p>
              <p className="mt-8 text-sm font-black uppercase tracking-widest text-slate-400">Mặt trước</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-teal-700">Mặt sau</p>
              <h2 className="mt-4 text-4xl font-black">{currentWord.meaning}</h2>
              <p className="mt-5 text-lg text-slate-500">{currentWord.exampleVi}</p>
            </div>
          )}
        </div>
      </button>
      <div className="mt-5 flex flex-wrap justify-between gap-3">
        <button className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-black text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700" type="button">
          Đã thuộc
        </button>
        <button className="rounded-2xl bg-indigo-600 px-7 py-3 font-black text-white shadow-lg shadow-indigo-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-700" onClick={onNext} type="button">
          Tiếp tục
        </button>
      </div>
      <DeepLearnActions />
    </div>
  );
}

function TypingExercise({ currentWord, onNext }: Readonly<{ currentWord: Word; onNext: () => void }>) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-900/[0.05]">
      <p className="text-center text-sm font-black uppercase tracking-[0.24em] text-teal-700">Gõ từ tiếng Nhật</p>
      <h2 className="mt-5 text-center text-4xl font-black">{currentWord.meaning}</h2>
      <p className="mt-3 text-center text-slate-500">Gợi ý: {currentWord.type}</p>
      <input className="mt-8 h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-center text-xl font-bold outline-none transition-all duration-300 focus:border-teal-400 focus:bg-white focus:shadow-xl focus:shadow-teal-500/10" placeholder="Nhập từ tiếng Nhật..." />
      <button className="mt-5 h-14 w-full rounded-2xl bg-slate-950 font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-700" onClick={onNext} type="button">
        Kiểm tra
      </button>
    </div>
  );
}

function ExampleExercise({ currentWord, onNext }: Readonly<{ currentWord: Word; onNext: () => void }>) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-teal-200 bg-white shadow-2xl shadow-teal-500/8">
      <div className="bg-teal-50 p-8 text-center">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-teal-700">Đặt câu với từ này</p>
        <h2 className="mt-4 text-4xl font-black">{currentWord.term}</h2>
        <p className="mt-2 text-lg font-bold text-rose-700">{currentWord.meaning} / {currentWord.kana}</p>
      </div>
      <div className="border-t border-teal-100 p-6">
        <p className="mb-4 text-sm font-black text-teal-700">Gợi ý mẫu</p>
        <p className="rounded-2xl bg-slate-50 p-4 text-lg font-semibold">{currentWord.example}</p>
        <textarea className="mt-5 min-h-32 w-full rounded-2xl border border-slate-200 bg-white p-4 outline-none transition-all duration-300 focus:border-teal-400 focus:shadow-xl focus:shadow-teal-500/10" placeholder="Tự đặt một câu tiếng Nhật..." />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button className="rounded-2xl bg-teal-100 px-6 py-4 font-black text-teal-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-200" type="button">
            Chấm bằng AI
          </button>
          <button className="rounded-2xl bg-rose-600 px-6 py-4 font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-700" onClick={onNext} type="button">
            Qua từ tiếp theo
          </button>
        </div>
      </div>
    </div>
  );
}

function DeepLearnActions() {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
      <span className="font-bold text-slate-600">Học sâu hơn</span>
      {["Từ liên quan", "Collocation", "Word family"].map((item) => (
        <button className="rounded-full border border-amber-300 bg-amber-50 px-5 py-2 font-bold text-amber-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-100" key={item} type="button">
          <FiLink className="mr-2 inline" />
          {item}
        </button>
      ))}
    </div>
  );
}
