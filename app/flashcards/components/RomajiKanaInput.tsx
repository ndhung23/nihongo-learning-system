"use client";

import { ChangeEvent, CompositionEvent, KeyboardEvent, type Ref, useId, useRef, useState } from "react";

type Candidate = {
  label: string;
  value: string;
};

type Props = {
  className?: string;
  disabled?: boolean;
  id?: string;
  name: string;
  onEnter?: () => void;
  onValueChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
  value: string;
};

export function RomajiKanaInput({
  className,
  disabled,
  id,
  name,
  onEnter,
  onValueChange,
  placeholder,
  textarea = false,
  value,
}: Readonly<Props>) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const isComposing = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [replacement, setReplacement] = useState<{ end: number; start: number } | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  function updateSuggestions(nextValue: string, caret: number | null) {
    if (caret === null || isComposing.current) {
      closeSuggestions();
      return;
    }

    const beforeCaret = nextValue.slice(0, caret);
    const match = beforeCaret.match(/[a-zA-Z]+(?:'[a-zA-Z]*)?$/);
    if (!match || match[0].length < 1) {
      closeSuggestions();
      return;
    }

    const romaji = match[0];
    const hiragana = romajiToHiragana(romaji);
    if (!hiragana || hiragana === romaji.toLowerCase()) {
      closeSuggestions();
      return;
    }

    setReplacement({ start: caret - romaji.length, end: caret });
    setCandidates([
      { label: "Hiragana", value: hiragana },
      { label: "Katakana", value: hiraganaToKatakana(hiragana) },
    ]);
    setActiveIndex(0);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const nextValue = event.target.value;
    onValueChange(nextValue);
    updateSuggestions(nextValue, event.target.selectionStart);
  }

  function chooseCandidate(index: number) {
    const candidate = candidates[index];
    if (!candidate || !replacement) return;

    const nextValue =
      value.slice(0, replacement.start) +
      candidate.value +
      value.slice(replacement.end);
    const nextCaret = replacement.start + candidate.value.length;
    onValueChange(nextValue);
    closeSuggestions();
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCaret, nextCaret);
    }, 0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (!candidates.length) {
      if (event.key === "Enter" && onEnter && !textarea) {
        event.preventDefault();
        onEnter();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % candidates.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + candidates.length) % candidates.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      chooseCandidate(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeSuggestions();
    }
  }

  function handleCompositionStart() {
    isComposing.current = true;
    closeSuggestions();
  }

  function handleCompositionEnd(event: CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) {
    isComposing.current = false;
    updateSuggestions(event.currentTarget.value, event.currentTarget.selectionStart);
  }

  function closeSuggestions() {
    setCandidates([]);
    setReplacement(null);
    setActiveIndex(0);
  }

  const sharedProps = {
    "aria-autocomplete": "list" as const,
    "aria-controls": candidates.length ? listboxId : undefined,
    "aria-expanded": Boolean(candidates.length),
    "aria-haspopup": "listbox" as const,
    autoCapitalize: "off" as const,
    autoComplete: "off",
    autoCorrect: "off" as const,
    className,
    disabled,
    id,
    name,
    onChange: handleChange,
    onCompositionEnd: handleCompositionEnd,
    onCompositionStart: handleCompositionStart,
    onKeyDown: handleKeyDown,
    placeholder,
    spellCheck: false,
    value,
  };

  return (
    <div className="relative">
      {textarea ? (
        <textarea {...sharedProps} ref={inputRef as Ref<HTMLTextAreaElement>} />
      ) : (
        <input {...sharedProps} ref={inputRef as Ref<HTMLInputElement>} />
      )}

      {candidates.length > 0 && (
        <div
          aria-label="Gợi ý chuyển đổi Kana"
          className="absolute left-0 top-full z-40 mt-2 w-full min-w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-950/15"
          id={listboxId}
          role="listbox"
        >
          {candidates.map((candidate, index) => (
            <button
              aria-selected={activeIndex === index}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                activeIndex === index
                  ? "bg-teal-50 text-teal-900"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
              key={candidate.label}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseCandidate(index)}
              role="option"
              type="button"
            >
              <span>
                <span className="block text-xs font-black uppercase tracking-wider text-slate-400">
                  {candidate.label}
                </span>
                <span className="mt-0.5 block text-xl font-black" lang="ja">
                  {candidate.value}
                </span>
              </span>
              <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-slate-400 shadow-sm">
                {index === activeIndex ? "Enter" : "↑↓"}
              </span>
            </button>
          ))}
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold text-slate-400">
            ↑↓ chọn · Enter chuyển · Esc đóng
          </p>
        </div>
      )}
    </div>
  );
}

const ROMAJI_MAP: Record<string, string> = {
  kya: "きゃ", kyu: "きゅ", kyo: "きょ", gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  sha: "しゃ", shu: "しゅ", sho: "しょ", sya: "しゃ", syu: "しゅ", syo: "しょ",
  ja: "じゃ", ju: "じゅ", jo: "じょ", jya: "じゃ", jyu: "じゅ", jyo: "じょ",
  cha: "ちゃ", chu: "ちゅ", cho: "ちょ", cya: "ちゃ", cyu: "ちゅ", cyo: "ちょ",
  nya: "にゃ", nyu: "にゅ", nyo: "にょ", hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ", pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  mya: "みゃ", myu: "みゅ", myo: "みょ", rya: "りゃ", ryu: "りゅ", ryo: "りょ",
  shi: "し", chi: "ち", tsu: "つ", dzu: "づ",
  fa: "ふぁ", fi: "ふぃ", fe: "ふぇ", fo: "ふぉ", dhi: "でぃ",
  a: "あ", i: "い", u: "う", e: "え", o: "お",
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  sa: "さ", si: "し", su: "す", se: "せ", so: "そ",
  za: "ざ", ji: "じ", zi: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
  ta: "た", ti: "ち", tu: "つ", te: "て", to: "と",
  da: "だ", de: "で", do: "ど",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", hu: "ふ", fu: "ふ", he: "へ", ho: "ほ",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  wa: "わ", wo: "を", va: "ゔぁ", vi: "ゔぃ", vu: "ゔ", ve: "ゔぇ", vo: "ゔぉ",
};

export function romajiToHiragana(input: string) {
  const source = input.toLowerCase();
  let result = "";
  let index = 0;

  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];

    if (current === next && current !== "n" && /[bcdfghjklmpqrstvwxyz]/.test(current)) {
      result += "っ";
      index += 1;
      continue;
    }

    if (current === "n") {
      if (next === "'") {
        result += "ん";
        index += 2;
        continue;
      }
      if (!next || (next !== "y" && !/[aeiou]/.test(next))) {
        result += "ん";
        index += 1;
        continue;
      }
    }

    let matched = false;
    for (const length of [3, 2, 1]) {
      const syllable = source.slice(index, index + length);
      const kana = ROMAJI_MAP[syllable];
      if (kana) {
        result += kana;
        index += length;
        matched = true;
        break;
      }
    }

    if (!matched) return "";
  }

  return result;
}

export function hiraganaToKatakana(value: string) {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code >= 0x3041 && code <= 0x3096
      ? String.fromCharCode(code + 0x60)
      : character;
  }).join("");
}
