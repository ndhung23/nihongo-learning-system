"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FiBookOpen, FiCheck, FiChevronRight, FiClipboard, FiPlus, FiTrash2, FiX } from "react-icons/fi";

type Level = "N5" | "N4" | "N3" | "N2" | "N1";
type SectionKey = "vocabularyKanji" | "grammarReading";
type TestSummary = { id: string; level: Level; number: number; title: string; questionCount: number };
type Question = {
  group: string;
  instruction: string;
  prompt: string;
  highlightText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const emptyQuestion = (): Question => ({
  group: "Dạng câu hỏi",
  instruction: "",
  prompt: "",
  highlightText: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
});

export function AdminJlptTestsClient({ initialTests }: { initialTests: TestSummary[] }) {
  const router = useRouter();
  const [tests, setTests] = useState(initialTests);
  const [editing, setEditing] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("vocabularyKanji");
  const [level, setLevel] = useState<Level>("N5");
  const [number, setNumber] = useState(nextNumber(initialTests, "N5"));
  const [title, setTitle] = useState(`Đề thi N5 minh họa số ${nextNumber(initialTests, "N5")}`);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [status, setStatus] = useState("published");
  const [sections, setSections] = useState<Record<SectionKey, Question[]>>({
    vocabularyKanji: [emptyQuestion()],
    grammarReading: [emptyQuestion()],
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  function changeLevel(next: Level) {
    const nextTestNumber = nextNumber(tests, next);
    setLevel(next);
    setNumber(nextTestNumber);
    setTitle(`Đề thi ${next} minh họa số ${nextTestNumber}`);
  }

  function updateQuestion(index: number, patch: Partial<Question>) {
    setSections((current) => ({
      ...current,
      [activeSection]: current[activeSection].map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question),
    }));
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    const question = sections[activeSection][questionIndex];
    updateQuestion(questionIndex, {
      options: question.options.map((option, index) => index === optionIndex ? value : option),
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const normalizedSections = Object.fromEntries(
      Object.entries(sections).map(([key, questions]) => [key, questions.map((question) => ({
        ...question,
        options: question.options.map((option) => option.trim()).filter(Boolean),
      }))]),
    );
    try {
      const response = await fetch("/api/admin/jlpt-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, number, title, description, visibility, status, sections: normalizedSections }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể tạo đề thi.");
      setTests((current) => [...current, result.data]);
      setMessage("Đã tạo đề thi và đưa vào danh sách khóa học.");
      setEditing(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạo đề thi.");
    } finally {
      setSubmitting(false);
    }
  }

  const currentQuestions = sections[activeSection];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-col gap-5 rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-900/5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-600">Quản trị nội dung</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Đề thi JLPT</h1>
          <p className="mt-2 text-sm text-slate-500">Tạo đề N5–N1, nhập đáp án và xuất bản thẳng lên khu luyện đề.</p>
        </div>
        <button className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 font-black text-white shadow-lg shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700" onClick={() => { setMessage(""); setEditing(true); }} type="button">
          <FiPlus /> Tạo đề JLPT
        </button>
      </div>

      {message && !editing ? <p className="mb-5 rounded-2xl border border-teal-200 bg-teal-50 px-5 py-3 font-bold text-teal-800">{message}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tests.map((test) => (
          <article className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5" key={test.id}>
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-xl text-teal-700"><FiBookOpen /></span>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">{test.level}</span>
            </div>
            <h2 className="mt-5 text-lg font-black">{test.title}</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">{test.questionCount} câu · 2 phần thi · Có luyện full</p>
            <Link className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 font-black text-white hover:bg-teal-700" href={`/flashcards/tests/${test.level.toLowerCase()}/${test.number}`}>
              Xem đề <FiChevronRight />
            </Link>
          </article>
        ))}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
          <form className="mx-auto max-w-5xl rounded-[2rem] bg-[#f7f8fb] shadow-2xl" onSubmit={submit}>
            <header className="sticky top-0 z-10 flex items-center justify-between rounded-t-[2rem] border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">Trình soạn đề</p>
                <h2 className="text-xl font-black">Tạo đề thi JLPT mới</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-xl hover:bg-rose-100 hover:text-rose-600" onClick={() => setEditing(false)} type="button"><FiX /></button>
            </header>

            <div className="space-y-6 p-5 sm:p-7">
              <section className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Cấp độ">
                  <select className={inputClass} onChange={(event) => changeLevel(event.target.value as Level)} value={level}>
                    {["N5", "N4", "N3", "N2", "N1"].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Số đề"><input className={inputClass} min={1} onChange={(event) => setNumber(Number(event.target.value))} required type="number" value={number} /></Field>
                <Field className="sm:col-span-2" label="Tên hiển thị"><input className={inputClass} onChange={(event) => setTitle(event.target.value)} required value={title} /></Field>
                <Field className="sm:col-span-2" label="Mô tả"><input className={inputClass} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả ngắn trên thẻ khóa học" value={description} /></Field>
                <Field label="Phạm vi"><select className={inputClass} onChange={(event) => setVisibility(event.target.value)} value={visibility}><option value="public">Công khai</option><option value="unlisted">Chỉ ai có link</option><option value="private">Riêng tư</option></select></Field>
                <Field label="Trạng thái"><select className={inputClass} onChange={(event) => setStatus(event.target.value)} value={status}><option value="published">Xuất bản</option><option value="draft">Bản nháp</option><option value="hidden">Ẩn</option></select></Field>
              </section>

              <div className="grid grid-cols-2 rounded-2xl bg-slate-200 p-1">
                <SectionTab active={activeSection === "vocabularyKanji"} count={sections.vocabularyKanji.length} label="Từ vựng + Kanji" onClick={() => setActiveSection("vocabularyKanji")} />
                <SectionTab active={activeSection === "grammarReading"} count={sections.grammarReading.length} label="Ngữ pháp + Reading" onClick={() => setActiveSection("grammarReading")} />
              </div>

              <div className="space-y-5">
                {currentQuestions.map((question, questionIndex) => (
                  <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm" key={questionIndex}>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-black">Câu {questionIndex + 1}</h3>
                      <button className="flex items-center gap-1 text-sm font-black text-rose-600 disabled:opacity-30" disabled={currentQuestions.length === 1} onClick={() => setSections((current) => ({ ...current, [activeSection]: currentQuestions.filter((_, index) => index !== questionIndex) }))} type="button"><FiTrash2 /> Xóa</button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Nhóm câu hỏi"><input className={inputClass} onChange={(event) => updateQuestion(questionIndex, { group: event.target.value })} placeholder="Ví dụ: Cách đọc Kanji" required value={question.group} /></Field>
                      <Field label="Hướng dẫn"><input className={inputClass} onChange={(event) => updateQuestion(questionIndex, { instruction: event.target.value })} placeholder="Chọn đáp án đúng nhất" value={question.instruction} /></Field>
                      <Field className="sm:col-span-2" label="Nội dung câu hỏi"><textarea className={`${inputClass} min-h-24 py-3`} onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} required value={question.prompt} /></Field>
                      <Field className="sm:col-span-2" label="Chữ cần highlight (không bắt buộc)"><input className={inputClass} onChange={(event) => updateQuestion(questionIndex, { highlightText: event.target.value })} value={question.highlightText} /></Field>
                    </div>
                    <p className="mb-2 mt-4 text-sm font-black text-slate-700">Các lựa chọn — chọn vòng tròn ở đáp án đúng</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {question.options.map((option, optionIndex) => (
                        <label className={`flex items-center gap-3 rounded-xl border p-3 ${question.correctIndex === optionIndex ? "border-teal-400 bg-teal-50" : "border-slate-200"}`} key={optionIndex}>
                          <input checked={question.correctIndex === optionIndex} name={`${activeSection}-${questionIndex}-correct`} onChange={() => updateQuestion(questionIndex, { correctIndex: optionIndex })} type="radio" />
                          <input className="min-w-0 flex-1 bg-transparent outline-none" onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} placeholder={`Đáp án ${optionIndex + 1}`} required={optionIndex < 2} value={option} />
                        </label>
                      ))}
                    </div>
                    <Field className="mt-4" label="Giải thích đáp án (không bắt buộc)"><textarea className={`${inputClass} min-h-20 py-3`} onChange={(event) => updateQuestion(questionIndex, { explanation: event.target.value })} value={question.explanation} /></Field>
                  </section>
                ))}
              </div>

              <button className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50 font-black text-teal-800 hover:bg-teal-100" onClick={() => setSections((current) => ({ ...current, [activeSection]: [...currentQuestions, emptyQuestion()] }))} type="button"><FiPlus /> Thêm câu vào phần này</button>
              {message ? <p className={`rounded-2xl px-5 py-3 font-bold ${message.startsWith("Đã") ? "bg-teal-50 text-teal-800" : "bg-rose-50 text-rose-700"}`}>{message}</p> : null}
            </div>

            <footer className="sticky bottom-0 flex justify-end gap-3 rounded-b-[2rem] border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
              <button className="h-12 rounded-2xl border border-slate-200 px-6 font-black" onClick={() => setEditing(false)} type="button">Hủy</button>
              <button className="flex h-12 items-center gap-2 rounded-2xl bg-rose-600 px-7 font-black text-white disabled:opacity-60" disabled={submitting} type="submit"><FiCheck /> {submitting ? "Đang tạo..." : "Tạo và xuất bản"}</button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function nextNumber(tests: TestSummary[], level: Level) {
  return Math.max(0, ...tests.filter((test) => test.level === level).map((test) => test.number)) + 1;
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-sm font-black text-slate-700">{label}</span>{children}</label>;
}

function SectionTab({ active, count, label, onClick }: { active: boolean; count: number; label: string; onClick: () => void }) {
  return <button className={`rounded-xl px-3 py-3 text-sm font-black transition ${active ? "bg-slate-950 text-white shadow" : "text-slate-600"}`} onClick={onClick} type="button">{label} <span className="ml-1 opacity-70">({count})</span></button>;
}

const inputClass = "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100";
