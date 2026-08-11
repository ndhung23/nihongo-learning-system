"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { FiBold, FiCode, FiItalic, FiList, FiMinus, FiRotateCcw, FiRotateCw, FiUnderline } from "react-icons/fi";
import { hiraganaToKatakana, romajiToHiragana } from "@/app/flashcards/components/RomajiKanaInput";
import type { RichDoc } from "./RichTextEditor";

type Candidate = { label: string; value: string };
const extensions = [StarterKit, Underline, TextStyle, Color, Highlight.configure({ multicolor: true }), TextAlign.configure({ types: ["heading", "paragraph"] })];

export function KanaRichTextEditor({ content, onChange }: { content: RichDoc; onChange: (doc: RichDoc) => void }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const replacement = useRef<{ from: number; to: number } | null>(null);
  const editor = useEditor({ extensions, content, immediatelyRender: false, onUpdate: ({ editor: current }) => onChange(current.getJSON()) });

  useEffect(() => {
    if (editor && !editor.isFocused) editor.commands.setContent(content);
  }, [content, editor]);

  function closeSuggestions() {
    replacement.current = null;
    setCandidates([]);
    setActiveIndex(0);
  }

  function updateSuggestions() {
    if (!editor || !editor.isFocused || !editor.state.selection.empty) return closeSuggestions();
    const to = editor.state.selection.from;
    const beforeCaret = editor.state.doc.textBetween(Math.max(0, to - 40), to, "\n", "\0");
    const match = beforeCaret.match(/[a-zA-Z]+(?:'[a-zA-Z]*)?$/);
    if (!match) return closeSuggestions();
    const hiragana = romajiToHiragana(match[0]);
    if (!hiragana || hiragana === match[0].toLowerCase()) return closeSuggestions();
    replacement.current = { from: to - match[0].length, to };
    setCandidates([{ label: "Hiragana", value: hiragana }, { label: "Katakana", value: hiraganaToKatakana(hiragana) }]);
    setActiveIndex(0);
  }

  function chooseCandidate(index: number) {
    const candidate = candidates[index];
    const range = replacement.current;
    if (!editor || !candidate || !range) return;
    editor.chain().focus().deleteRange(range).insertContent(candidate.value).run();
    closeSuggestions();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!candidates.length || event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => event.key === "ArrowDown" ? (index + 1) % candidates.length : (index - 1 + candidates.length) % candidates.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      chooseCandidate(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeSuggestions();
    }
  }

  if (!editor) return <div className="min-h-40 animate-pulse rounded-xl bg-slate-100" />;
  return (
    <div className="relative" onInput={updateSuggestions} onKeyDownCapture={handleKeyDown}>
      <div className="flex min-h-[360px] flex-row-reverse overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 overflow-y-auto border-l bg-slate-50 py-2">
          <Tool title="In đậm" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><FiBold /></Tool>
          <Tool title="In nghiêng" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><FiItalic /></Tool>
          <Tool title="Gạch chân" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><FiUnderline /></Tool>
          <Tool title="Gạch ngang" onClick={() => editor.chain().focus().toggleStrike().run()}>S</Tool>
          {[1, 2, 3].map((level) => <Tool title={`Tiêu đề ${level}`} key={level} onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()}>H{level}</Tool>)}
          <Tool title="Danh sách" onClick={() => editor.chain().focus().toggleBulletList().run()}><FiList /></Tool>
          <Tool title="Danh sách số" onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</Tool>
          <Tool title="Khung nhấn mạnh" onClick={() => editor.chain().focus().toggleBlockquote().run()}>□</Tool>
          <Tool title="Code" onClick={() => editor.chain().focus().toggleCode().run()}><FiCode /></Tool>
          <Tool title="Đường phân cách" onClick={() => editor.chain().focus().setHorizontalRule().run()}><FiMinus /></Tool>
          {(["left", "center", "right"] as const).map((align) => <Tool title={`Căn ${align}`} key={align} onClick={() => editor.chain().focus().setTextAlign(align).run()}>{align === "left" ? "←" : align === "center" ? "↔" : "→"}</Tool>)}
          <Tool title="Hoàn tác" onClick={() => editor.chain().focus().undo().run()}><FiRotateCcw /></Tool>
          <Tool title="Làm lại" onClick={() => editor.chain().focus().redo().run()}><FiRotateCw /></Tool>
        </div>
        <EditorContent className="roadmap-editor min-w-0 flex-1 p-4" editor={editor} />
      </div>
      {candidates.length > 0 && (
        <div className="absolute left-3 top-14 z-40 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-950/15" role="listbox">
          {candidates.map((candidate, index) => (
            <button aria-selected={activeIndex === index} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left ${activeIndex === index ? "bg-teal-50 text-teal-900" : "text-slate-700 hover:bg-slate-50"}`} key={candidate.label} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => chooseCandidate(index)} role="option" type="button">
              <span><span className="block text-xs font-black uppercase tracking-wider text-slate-400">{candidate.label}</span><span className="mt-0.5 block text-xl font-black" lang="ja">{candidate.value}</span></span>
              <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-slate-400 shadow-sm">{index === activeIndex ? "Enter" : "↑↓"}</span>
            </button>
          ))}
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold text-slate-400">↑↓ chọn · Enter chuyển · Esc đóng</p>
        </div>
      )}
    </div>
  );
}

function Tool({ active = false, children, onClick, title }: { active?: boolean; children: ReactNode; onClick: () => void; title: string }) {
  return <button aria-label={title} className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border text-[11px] font-black transition ${active ? "bg-slate-950 text-white" : "bg-white hover:border-teal-400 hover:text-teal-700"}`} onClick={onClick} title={title} type="button">{children}</button>;
}
