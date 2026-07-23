"use client";

import { FormEvent, useEffect, useState } from "react";
import { FiBookmark, FiBookOpen, FiDelete, FiExternalLink, FiLoader, FiMaximize2, FiMinimize2, FiSearch, FiVolume2, FiX } from "react-icons/fi";
import { LuPin, LuPinOff } from "react-icons/lu";
import { vocabularyBookmarkKey, type VocabularyBookmark } from "../bookmarkStorage";
import { FuriganaText } from "./FuriganaText";
import { RomajiKanaInput } from "./RomajiKanaInput";

type DictionaryEntry = {
  id?: string; deckId?: string; term: string; reading: string; romaji?: string;
  meaningVi?: string; meaningsEn?: string[]; partOfSpeech?: string; jlpt?: string;
  examples: Array<{ ja: string; vi?: string }>; synonyms: string[]; antonyms: string[];
  audioUrl?: string; isCommon?: boolean; source: string;
};
type DictionaryResponse = {
  entries: DictionaryEntry[]; links: Array<{ name: string; url: string }>;
  googleTranslateUrl: string; googleConfigured: boolean; message?: string;
};

const hiraganaKeys = [
  "あ", "い", "う", "え", "お",
  "か", "き", "く", "け", "こ",
  "さ", "し", "す", "せ", "そ",
  "た", "ち", "つ", "て", "と",
  "な", "に", "ぬ", "ね", "の",
  "は", "ひ", "ふ", "へ", "ほ",
  "ま", "み", "む", "め", "も",
  "や", "ゆ", "よ", "ら", "り",
  "る", "れ", "ろ", "わ", "を",
  "ん", "が", "ぎ", "ぐ", "げ",
  "ご", "ざ", "じ", "ず", "ぜ",
  "ぞ", "だ", "ぢ", "づ", "で",
  "ど", "ば", "び", "ぶ", "べ",
  "ぼ", "ぱ", "ぴ", "ぷ", "ぺ",
  "ぽ", "ゃ", "ゅ", "ょ", "っ",
  "ぁ", "ぃ", "ぅ", "ぇ", "ぉ", "ー",
];

const katakanaKeys = hiraganaKeys.map((character) => {
  if (character === "ー") return character;
  return String.fromCharCode(character.charCodeAt(0) + 0x60);
});

export function DictionaryPanel({
  onPinnedChange,
  pinned,
}: Readonly<{
  onPinnedChange: (pinned: boolean) => void;
  pinned: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DictionaryResponse | null>(null);
  const [saved, setSaved] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardScript, setKeyboardScript] = useState<"hiragana" | "katakana">("hiragana");

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (pinned) setOpen(true);
  }, [pinned]);

  function togglePinned() {
    const nextPinned = !pinned;
    onPinnedChange(nextPinned);
    window.localStorage.setItem("nihongo-dictionary-pinned", String(nextPinned));
    setOpen(true);
    if (nextPinned) setExpanded(false);
  }

  function closePanel() {
    setOpen(false);
    if (pinned) {
      onPinnedChange(false);
      window.localStorage.setItem("nihongo-dictionary-pinned", "false");
    }
  }

  async function search(event?: FormEvent) {
    event?.preventDefault();
    if (!query.trim()) return;
    setOpen(true); setLoading(true); setError(""); setSaved(false);
    try {
      const response = await fetch(`/api/dictionary?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const payload = (await response.json()) as DictionaryResponse;
      if (!response.ok) throw new Error(payload.message || "Không thể tra từ.");
      setResult(payload);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Không thể tra từ.");
    } finally {
      setLoading(false);
    }
  }

  function speak(entry: DictionaryEntry) {
    if (entry.audioUrl) { void new Audio(entry.audioUrl).play(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(entry.term);
    utterance.lang = "ja-JP";
    window.speechSynthesis.speak(utterance);
  }

  function saveEntry(entry: DictionaryEntry) {
    const current = JSON.parse(window.localStorage.getItem(vocabularyBookmarkKey) || "[]") as VocabularyBookmark[];
    const key = entry.id || ["dictionary", entry.term, entry.meaningVi || entry.meaningsEn?.[0] || ""].join(":");
    const bookmark: VocabularyBookmark = {
      key, id: entry.id, deckId: entry.deckId, courseTitle: "Tra từ điển",
      term: entry.term, kana: entry.reading, romaji: entry.romaji || "",
      type: entry.partOfSpeech || "", meaning: entry.meaningVi || entry.meaningsEn?.join("; ") || "",
      example: entry.examples[0]?.ja || "", exampleVi: entry.examples[0]?.vi || "", savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(vocabularyBookmarkKey, JSON.stringify([bookmark, ...current.filter((item) => item.key !== key)]));
    window.dispatchEvent(new CustomEvent("nihongo-vocabulary-bookmarks-updated"));
    setSaved(true);
  }

  const entry = result?.entries[0];
  const keyboardKeys = keyboardScript === "hiragana" ? hiraganaKeys : katakanaKeys;

  return (
    <>
      <button aria-label="Mở tra từ điển" className={`fixed bottom-5 right-5 z-40 items-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-black text-white shadow-2xl shadow-teal-700/25 transition hover:-translate-y-1 hover:bg-teal-800 ${pinned ? "hidden" : "flex"}`} onClick={() => setOpen(true)} type="button">
        <FiBookOpen /> Tra từ <span className="hidden rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] sm:inline">Ctrl K</span>
      </button>
      {open && !pinned && <button aria-label="Đóng từ điển" className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[2px]" onClick={() => setOpen(false)} type="button" />}
      <aside className={`fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l border-slate-200 bg-[#fbfaf5] shadow-2xl transition-all duration-300 dark:border-slate-700 dark:bg-slate-950 sm:w-[390px] ${expanded && !pinned ? "sm:w-[min(760px,calc(100vw-72px))]" : ""} ${open ? "translate-x-0" : "translate-x-full"}`}>
        <header className="border-b border-slate-200 bg-white/90 p-4 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90">
          <div className="flex items-center gap-2">
            <FiBookOpen className="text-teal-600" /><h2 className="font-black">Tra từ Nhật → Việt</h2>
            <button
              aria-label={pinned ? "Bỏ ghim từ điển" : "Ghim từ điển bên phải"}
              aria-pressed={pinned}
              className={`ml-auto hidden h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-black transition xl:flex ${pinned ? "bg-teal-700 text-white" : "bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-300"}`}
              onClick={togglePinned}
              title={pinned ? "Bỏ ghim" : "Ghim bên phải"}
              type="button"
            >
              {pinned ? <LuPinOff /> : <LuPin />} {pinned ? "Bỏ ghim" : "Ghim"}
            </button>
            {!pinned && <button aria-label="Đổi kích thước" className="hidden h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 sm:grid dark:hover:bg-slate-800" onClick={() => setExpanded((value) => !value)} type="button">{expanded ? <FiMinimize2 /> : <FiMaximize2 />}</button>}
            <button aria-label="Đóng" className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500 text-white hover:bg-rose-600" onClick={closePanel} type="button"><FiX /></button>
          </div>
          <form className="mt-3 flex gap-2" onSubmit={search}>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 [&>div]:min-w-0 [&>div]:flex-1 dark:border-slate-700 dark:bg-slate-950">
              <FiSearch className="shrink-0 text-slate-400" />
              <RomajiKanaInput
                className="h-11 w-full min-w-0 bg-transparent text-sm font-semibold outline-none"
                name="dictionaryQuery"
                onEnter={() => void search()}
                onValueChange={setQuery}
                placeholder="Kanji, kana hoặc romaji..."
                value={query}
              />
            </div>
            <button className="rounded-2xl bg-teal-700 px-4 text-sm font-black text-white hover:bg-teal-800 disabled:opacity-60" disabled={loading} type="submit">{loading ? <FiLoader className="animate-spin" /> : "Tra"}</button>
          </form>
          <div className="mt-2 flex items-center gap-2">
            <button
              aria-expanded={keyboardOpen}
              className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${keyboardOpen ? "bg-teal-700 text-white" : "bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-300"}`}
              onClick={() => setKeyboardOpen((value) => !value)}
              type="button"
            >
              あ ア Bàn phím Nhật
            </button>
            {keyboardOpen && (
              <>
                <button className={`rounded-xl px-3 py-1.5 text-xs font-black ${keyboardScript === "hiragana" ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`} onClick={() => setKeyboardScript("hiragana")} type="button">Hiragana</button>
                <button className={`rounded-xl px-3 py-1.5 text-xs font-black ${keyboardScript === "katakana" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`} onClick={() => setKeyboardScript("katakana")} type="button">Katakana</button>
              </>
            )}
          </div>
          {keyboardOpen && (
            <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950">
              <div className="grid grid-cols-10 gap-1">
                {keyboardKeys.map((character, index) => (
                  <button
                    className="grid aspect-square min-w-0 place-items-center rounded-lg bg-white text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-100 hover:text-teal-800 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-teal-900"
                    key={`${character}-${index}`}
                    onClick={() => setQuery((value) => value + character)}
                    type="button"
                  >
                    {character}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2">
                <button className="rounded-xl bg-white py-2 text-xs font-black text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200" onClick={() => setQuery((value) => `${value} `)} type="button">Khoảng trắng</button>
                <button aria-label="Xóa một ký tự" className="grid w-12 place-items-center rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200" onClick={() => setQuery((value) => Array.from(value).slice(0, -1).join(""))} type="button"><FiDelete /></button>
                <button className="rounded-xl bg-rose-100 px-3 text-xs font-black text-rose-700 hover:bg-rose-200" onClick={() => setQuery("")} type="button">Xóa hết</button>
              </div>
            </div>
          )}
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          {!entry && !loading && !error && (
            <div className="rounded-3xl border border-dashed border-teal-200 bg-teal-50/70 p-6 text-center dark:border-teal-900 dark:bg-teal-950/30">
              <FiSearch className="mx-auto h-8 w-8 text-teal-600" /><p className="mt-3 font-black">Nhập từ bạn muốn tra</p>
            </div>
          )}
          {loading && <div className="grid min-h-56 place-items-center"><FiLoader className="h-8 w-8 animate-spin text-teal-600" /></div>}
          {error && <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}
          {entry && !loading && (
            <div>
              <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-3xl font-black"><FuriganaText text={entry.term} reading={entry.reading} /></h3>
                      {entry.jlpt && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">{entry.jlpt}</span>}
                      {entry.isCommon && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">Phổ biến</span>}
                    </div>
                    {entry.reading && <p className="mt-2 text-sm font-bold text-slate-500">{entry.reading}{entry.romaji ? ` / ${entry.romaji}` : ""}</p>}
                  </div>
                  <button aria-label="Nghe phát âm" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700" onClick={() => speak(entry)} type="button"><FiVolume2 /></button>
                </div>
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Nghĩa tiếng Việt</p>
                  <p className="mt-1 text-xl font-black text-emerald-800 dark:text-emerald-200">{entry.meaningVi || "Chưa có bản dịch Việt tự động"}</p>
                </div>
                {entry.partOfSpeech && <p className="mt-4 text-sm"><strong>Loại từ:</strong> {entry.partOfSpeech}</p>}
                {entry.meaningsEn && <ol className="mt-4 space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">{entry.meaningsEn.map((meaning) => <li className="list-decimal" key={meaning}>{meaning}</li>)}</ol>}
              </section>
              {(entry.synonyms.length > 0 || entry.antonyms.length > 0) && (
                <section className="mt-4 rounded-3xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900 dark:bg-teal-950/30">
                  {entry.synonyms.length > 0 && <p className="text-sm"><strong className="text-teal-800">≈ Đồng nghĩa:</strong> {entry.synonyms.join("、")}</p>}
                  {entry.antonyms.length > 0 && <p className="mt-2 text-sm"><strong className="text-rose-700">↔ Trái nghĩa:</strong> {entry.antonyms.join("、")}</p>}
                </section>
              )}
              {entry.examples.length > 0 && (
                <section className="mt-4 rounded-3xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900 dark:bg-violet-950/30">
                  <h4 className="font-black text-violet-700">Ví dụ</h4>
                  <div className="mt-3 space-y-3">{entry.examples.slice(0, 4).map((example, index) => <div className="border-b border-violet-200 pb-3 last:border-0" key={`${example.ja}-${index}`}><p className="font-bold">{example.ja}</p>{example.vi && <p className="mt-1 text-sm italic text-slate-500">{example.vi}</p>}</div>)}</div>
                </section>
              )}
              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 py-3 font-black text-white hover:bg-orange-700" onClick={() => saveEntry(entry)} type="button"><FiBookmark /> {saved ? "Đã lưu vào Bookmark" : "Lưu từ"}</button>
            </div>
          )}
          {result && !loading && (
            <section className="mt-4">
              {result.entries.length === 0 && <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Chưa tìm thấy trong dữ liệu từ điển. Hãy dùng Google Dịch hoặc các nguồn bên dưới.</div>}
              <div className="mt-4 flex flex-wrap gap-2">
                {result.links.map((link) => <a className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700" href={link.url} key={link.name} rel="noreferrer" target="_blank">{link.name} <FiExternalLink /></a>)}
                <a className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700" href={result.googleTranslateUrl} rel="noreferrer" target="_blank">Google Dịch <FiExternalLink /></a>
              </div>
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
