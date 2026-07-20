"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiCheck, FiChevronRight, FiHelpCircle, FiRefreshCw, FiSkipForward, FiTarget, FiVolume2, FiX } from "react-icons/fi";
import { getKanaCharacters, KANA_GROUP_LABELS, type KanaCharacter, type KanaScript } from "../data";
import { hiraganaToKatakana, RomajiKanaInput } from "../../components/RomajiKanaInput";

type Result = "correct" | "incorrect" | null;

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

export function KanaQuiz({ script }: Readonly<{ script: KanaScript }>) {
  const allCharacters = useMemo(() => getKanaCharacters(script), [script]);
  const firstGroup = KANA_GROUP_LABELS[0];
  const [selectedGroups, setSelectedGroups] = useState<string[]>([firstGroup]);
  const [queue, setQueue] = useState<KanaCharacter[]>(() =>
    shuffle(allCharacters.filter((item) => item.group === firstGroup)),
  );
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [best, setBest] = useState(0);
  const [hintCharacter, setHintCharacter] = useState<KanaCharacter | null>(null);
  const current = queue[0];
  const title = script === "hiragana" ? "Hiragana" : "Katakana";
  const isHiragana = script === "hiragana";

  useEffect(() => {
    setBest(Number(window.localStorage.getItem(`kana-best-${script}`) || 0));
  }, [script]);

  useEffect(() => {
    if (!hintCharacter) return;
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setHintCharacter(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [hintCharacter]);

  function resetQueue(groups = selectedGroups) {
    setQueue(shuffle(allCharacters.filter((item) => groups.includes(item.group))));
    setAnswer("");
    setResult(null);
  }

  function toggleGroup(group: string) {
    const nextGroups = selectedGroups.includes(group)
      ? selectedGroups.filter((item) => item !== group)
      : [...selectedGroups, group];
    if (!nextGroups.length) return;
    setSelectedGroups(nextGroups);
    resetQueue(nextGroups);
    setCorrect(0);
    setAttempted(0);
  }

  function submitAnswer(event: FormEvent) {
    event.preventDefault();
    if (!current || result || !answer.trim()) return;
    const normalizedAnswer = answer.trim().toLowerCase();
    const hiraganaAnswer =
      getKanaCharacters("hiragana").find((item) => item.romaji === current.romaji)?.kana || "";
    const isCorrect =
      normalizedAnswer === current.romaji ||
      answer.trim() === current.kana ||
      answer.trim() === hiraganaAnswer ||
      answer.trim() === hiraganaToKatakana(hiraganaAnswer);
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    setResult(isCorrect ? "correct" : "incorrect");
    setCorrect(nextCorrect);
    setAttempted((value) => value + 1);
    if (nextCorrect > best) {
      setBest(nextCorrect);
      window.localStorage.setItem(`kana-best-${script}`, String(nextCorrect));
    }
  }

  function nextQuestion() {
    if (!current) return;
    const remaining = queue.slice(1);
    setQueue(remaining.length
      ? remaining
      : shuffle(allCharacters.filter((item) => selectedGroups.includes(item.group))));
    setAnswer("");
    setResult(null);
  }

  function skipQuestion() {
    if (!current) return;
    setQueue([...queue.slice(1), current]);
    setAnswer("");
    setResult(null);
  }

  function speakCurrentKana() {
    if (!current || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(current.kana);
    utterance.lang = "ja-JP";
    utterance.rate = 0.72;
    utterance.pitch = 1;

    const japaneseVoice = window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith("ja"));
    if (japaneseVoice) utterance.voice = japaneseVoice;

    window.speechSynthesis.speak(utterance);
  }

  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10">
      <Link className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-slate-950" href="/flashcards/discover?type=basic">
        <FiArrowLeft /> Quay lại các khóa học
      </Link>

      <section className="mt-5 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/[0.07]">
        <header className={`bg-gradient-to-br ${isHiragana ? "from-rose-500 to-orange-400" : "from-teal-500 to-cyan-400"} px-6 py-7 text-white sm:px-8`}>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-white/80">Khóa nhập môn tiếng Nhật</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black sm:text-4xl">Luyện {title}</h1>
              <p className="mt-2 max-w-2xl font-semibold text-white/85">
                Nhìn chữ Kana, nhập cách đọc romaji rồi nhấn Enter. Bắt đầu từ một hàng chữ và mở rộng dần khi bạn đã quen.
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-black backdrop-blur">Tốt nhất: {best} câu đúng</div>
          </div>
        </header>

        <div className="grid lg:grid-cols-[280px_1fr]">
          <aside className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-slate-950">Nhóm chữ luyện tập</h2>
              <button
                className="text-xs font-black text-teal-700 hover:text-teal-900"
                onClick={() => {
                  const groups = [...KANA_GROUP_LABELS];
                  setSelectedGroups(groups);
                  resetQueue(groups);
                }}
                type="button"
              >
                Chọn tất cả
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
              {KANA_GROUP_LABELS.map((group) => {
                const active = selectedGroups.includes(group);
                const samples = allCharacters.filter((item) => item.group === group).map((item) => item.kana).join(" ");
                return (
                  <button
                    aria-pressed={active}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${active ? "border-teal-300 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-600 hover:border-teal-200"}`}
                    key={group}
                    onClick={() => toggleGroup(group)}
                    type="button"
                  >
                    <span className="block text-xs font-black">{group}</span>
                    <span className="mt-1 block truncate text-sm">{samples}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="p-5 sm:p-8">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Đúng" value={String(correct)} />
              <Stat label="Độ chính xác" value={`${accuracy}%`} />
              <Stat label="Còn lại" value={String(queue.length)} />
            </div>

            <div className="mx-auto mt-8 max-w-xl text-center">
              <div className="flex items-center justify-center gap-2">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Chữ này đọc là gì?</p>
                <button
                  aria-label={`Xem gợi ý cách viết chữ ${current?.kana || ""}`}
                  className="grid h-9 w-9 place-items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 transition hover:-translate-y-0.5 hover:bg-amber-100"
                  onClick={() => current && setHintCharacter(current)}
                  title="Xem thứ tự nét và bảng chữ"
                  type="button"
                >
                  <FiHelpCircle />
                </button>
                <button
                  aria-label={`Nghe phát âm chữ ${current?.kana || ""}`}
                  className="grid h-9 w-9 place-items-center rounded-full border border-teal-200 bg-teal-50 text-teal-700 transition hover:-translate-y-0.5 hover:bg-teal-100"
                  onClick={speakCurrentKana}
                  title="Nghe phát âm"
                  type="button"
                >
                  <FiVolume2 />
                </button>
              </div>
              <button
                aria-label={`Xem hướng dẫn viết chữ ${current?.kana || ""}`}
                className="mt-3 text-[8rem] font-black leading-none text-slate-950 transition hover:text-teal-700 sm:text-[10rem]"
                lang="ja"
                onClick={() => current && setHintCharacter(current)}
                type="button"
              >
                {current?.kana}
              </button>

              <form className="mt-6" onSubmit={submitAnswer}>
                <label className="sr-only" htmlFor="romaji-answer">Nhập romaji</label>
                <RomajiKanaInput
                  className={`h-14 w-full rounded-2xl border-2 bg-white px-5 text-center text-xl font-black outline-none transition ${result === "correct" ? "border-emerald-400 text-emerald-700" : result === "incorrect" ? "border-rose-400 text-rose-700" : "border-slate-200 text-slate-950 focus:border-teal-400"}`}
                  disabled={Boolean(result)}
                  id="romaji-answer"
                  name="romajiAnswer"
                  onValueChange={setAnswer}
                  placeholder="Nhập romaji, ví dụ: ka"
                  value={answer}
                />

                {result && (
                  <div aria-live="polite" className={`mt-3 rounded-2xl px-4 py-3 font-black ${result === "correct" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {result === "correct"
                      ? <><FiCheck className="mr-2 inline" /> Chính xác!</>
                      : <>Chưa đúng — đáp án là <span className="text-lg">{current?.romaji}</span></>}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white font-black text-slate-600 transition hover:bg-slate-50" onClick={skipQuestion} type="button">
                    <FiSkipForward /> Bỏ qua
                  </button>
                  {result ? (
                    <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 font-black text-white transition hover:bg-teal-700" onClick={nextQuestion} type="button">
                      Câu tiếp <FiChevronRight />
                    </button>
                  ) : (
                    <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 font-black text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40" disabled={!answer.trim()} type="submit">
                      <FiTarget /> Kiểm tra
                    </button>
                  )}
                </div>
              </form>

              <button
                className="mt-5 inline-flex items-center gap-2 text-sm font-black text-slate-400 transition hover:text-slate-700"
                onClick={() => { resetQueue(); setCorrect(0); setAttempted(0); }}
                type="button"
              >
                <FiRefreshCw /> Xáo lại và bắt đầu mới
              </button>
            </div>
          </div>
        </div>
      </section>

      {hintCharacter && (
        <KanaHintModal
          allCharacters={allCharacters}
          current={hintCharacter}
          onClose={() => setHintCharacter(null)}
          onSelect={setHintCharacter}
          script={script}
        />
      )}
    </main>
  );
}

function Stat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
      <p className="text-lg font-black text-slate-950">{value}</p>
      <p className="text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function KanaHintModal({
  allCharacters,
  current,
  onClose,
  onSelect,
  script,
}: Readonly<{
  allCharacters: KanaCharacter[];
  current: KanaCharacter;
  onClose: () => void;
  onSelect: (character: KanaCharacter) => void;
  script: KanaScript;
}>) {
  const title = script === "hiragana" ? "Hiragana" : "Katakana";
  const nhkScript = script === "hiragana" ? "hira" : "kana";
  const strokeImage = `https://www3.nhk.or.jp/nhkworld/lesson/assets/images/letters/detail/${nhkScript}/${current.romaji}.png`;

  return (
    <div
      aria-label={`Gợi ý viết chữ ${current.kana}`}
      aria-modal="true"
      className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <div className="my-4 w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-teal-50 p-5 sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">Gợi ý cách viết</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Chữ <span className="text-4xl text-teal-700" lang="ja">{current.kana}</span>
              <span className="ml-3 text-base text-slate-500">({current.romaji})</span>
            </h2>
          </div>
          <button
            aria-label="Đóng gợi ý"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
            onClick={onClose}
            type="button"
          >
            <FiX />
          </button>
        </header>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[320px_1fr]">
          <section>
            <h3 className="font-black text-slate-950">Thứ tự và hướng đi nét</h3>
            <div className="mt-3 grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {/* NHK hosts one teaching image for each kana character. */}
              <img
                alt={`Hướng dẫn thứ tự nét chữ ${current.kana} từ NHK WORLD-JAPAN`}
                className="max-h-72 max-w-full object-contain"
                src={strokeImage}
              />
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
              Hình hướng dẫn được hiển thị từ NHK WORLD-JAPAN.
            </p>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-slate-950">Bảng chữ {title}</h3>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">46 chữ cơ bản</span>
            </div>
            <div className="mt-3 grid grid-cols-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
              {allCharacters.map((character) => {
                const active = character.kana === current.kana;
                return (
                  <button
                    aria-label={`Xem chữ ${character.kana}, ${character.romaji}`}
                    className={`min-h-20 border-b border-r border-white p-2 text-center transition ${
                      active
                        ? "bg-amber-100 text-amber-900 ring-2 ring-inset ring-amber-400"
                        : "bg-slate-50 text-slate-800 hover:bg-teal-50"
                    }`}
                    key={character.kana}
                    onClick={() => onSelect(character)}
                    type="button"
                  >
                    <span className="block text-3xl font-black" lang="ja">{character.kana}</span>
                    <span className="mt-1 block text-[11px] font-black text-rose-600">{character.romaji}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">
              Chữ đang luyện được đánh dấu màu vàng.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
