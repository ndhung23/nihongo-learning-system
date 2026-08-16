"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { FiBookOpen, FiCheck, FiChevronLeft, FiChevronRight, FiEdit3, FiFileText, FiHelpCircle, FiImage, FiLoader, FiMusic, FiPlus, FiSearch, FiTrash2, FiUploadCloud, FiX } from "react-icons/fi";
import { TEST_LEVELS, TEST_LEVEL_LABELS, type TestLevel } from "@/lib/jlptTestLevels";
import { EmailInvitePicker } from "@/app/flashcards/components/EmailInvitePicker";

type Level = TestLevel;
type AccessMode = "public" | "private" | "password" | "invite";
type SectionKey = "vocabularyKanji" | "grammarReading" | "listening";
type TestSummary = { id: string; level: Level; number: number; title: string; questionCount: number; sectionCount?: number };
type Question = {
  group: string;
  instruction: string;
  prompt: string;
  highlightText: string;
  imageUrl: string;
  audioUrl: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const emptyQuestion = (): Question => ({
  group: "Dạng câu hỏi",
  instruction: "",
  prompt: "",
  highlightText: "",
  imageUrl: "",
  audioUrl: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
});

export function AdminJlptTestsClient({
  currentPage = 1,
  initialCreate = false,
  initialEditId = "",
  initialTests,
  personal = false,
  query = "",
  totalPages = 1,
  totalTests,
}: {
  currentPage?: number;
  initialCreate?: boolean;
  initialEditId?: string;
  initialTests: TestSummary[];
  personal?: boolean;
  query?: string;
  totalPages?: number;
  totalTests?: number;
}) {
  const router = useRouter();
  const [tests, setTests] = useState(initialTests);
  const [editing, setEditing] = useState(initialCreate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("vocabularyKanji");
  const [level, setLevel] = useState<Level>("N5");
  const [title, setTitle] = useState("Đề thi N5 mới");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [status, setStatus] = useState("published");
  const [accessMode, setAccessMode] = useState<AccessMode>("public");
  const [password, setPassword] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [sections, setSections] = useState<Record<SectionKey, Question[]>>({
    vocabularyKanji: [emptyQuestion()],
    grammarReading: [emptyQuestion()],
    listening: [emptyQuestion()],
  });
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportHint, setShowImportHint] = useState(false);
  const [showPasteImport, setShowPasteImport] = useState(false);
  const [pastedImport, setPastedImport] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialEditOpened = useRef(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!initialEditId || initialEditOpened.current) return;
    const test = initialTests.find((item) => item.id === initialEditId);
    if (!test) {
      queueMicrotask(() => setMessage("Không tìm thấy đề thi tương ứng."));
      return;
    }

    initialEditOpened.current = true;
    void openEdit(test);
  }, [initialEditId, initialTests]);

  async function deleteTest(test: TestSummary) {
    if (!window.confirm(`Xóa "${test.title}"? Thao tác này không thể hoàn tác.`)) return;
    setMessage("");
    try {
      const response = await fetch(`/api/admin/jlpt-tests/${test.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể xóa đề thi.");
      setTests((current) => current.filter((item) => item.id !== test.id));
      setMessage("Đã xóa đề thi.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xóa đề thi.");
    }
  }

  function openCreate() {
    setEditingId(null);
    setActiveSection("vocabularyKanji");
    setLevel("N5");
    setTitle("Đề thi N5 mới");
    setDescription("");
    setVisibility("public");
    setStatus("published");
    setAccessMode("public");
    setPassword("");
    setInvitedEmails([]);
    setSections({ vocabularyKanji: [emptyQuestion()], grammarReading: [emptyQuestion()], listening: [emptyQuestion()] });
    setMessage("");
    setEditing(true);
  }

  async function openEdit(test: TestSummary) {
    setLoadingEditId(test.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/jlpt-tests/${test.id}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể tải đề thi.");
      setEditingId(test.id);
      setActiveSection("vocabularyKanji");
      setLevel(result.data.level);
      setTitle(result.data.title);
      setDescription(result.data.description);
      setVisibility(result.data.visibility);
      setStatus(result.data.status);
      setAccessMode(result.data.accessMode || (result.data.visibility === "public" ? "public" : "private"));
      setPassword("");
      setInvitedEmails(result.data.invitedEmails || []);
      setSections({
        vocabularyKanji: result.data.sections.vocabularyKanji.length ? result.data.sections.vocabularyKanji : [emptyQuestion()],
        grammarReading: result.data.sections.grammarReading.length ? result.data.sections.grammarReading : [emptyQuestion()],
        listening: result.data.sections.listening?.length ? result.data.sections.listening : [emptyQuestion()],
      });
      setEditing(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải đề thi.");
    } finally {
      setLoadingEditId(null);
    }
  }

  function changeLevel(next: Level) {
    if (editingId) {
      setLevel(next);
      return;
    }
    setLevel(next);
    setTitle(`Đề thi ${TEST_LEVEL_LABELS[next]} mới`);
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

  async function importQuestions(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    await importFiles(files);
  }

  async function importPastedContent() {
    const content = pastedImport.trim();
    if (!content) {
      setMessage("Hãy dán JSON, CSV hoặc nội dung câu hỏi trước.");
      return;
    }
    try {
      const structuredQuestions = parseStructuredPaste(content);
      if (structuredQuestions) {
        addImportedQuestions(structuredQuestions);
        setPastedImport("");
        setShowPasteImport(false);
        setMessage(`Đã tạo ${structuredQuestions.length} câu trực tiếp từ dữ liệu dán, không sử dụng AI.`);
        return;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "JSON/CSV chưa đúng định dạng.");
      return;
    }
    const looksLikeJson = content.startsWith("{") || content.startsWith("[");
    const file = new File(
      [content],
      looksLikeJson ? "noi-dung-da-dan.json" : "noi-dung-da-dan.txt",
      { type: looksLikeJson ? "application/json" : "text/plain" },
    );
    await importFiles([file], true);
  }

  async function importFiles(files: File[], pasted = false) {
    setImporting(true);
    setMessage("");
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.set("level", level);
    formData.set("section", activeSection);
    try {
      const response = await fetch("/api/admin/jlpt-tests/import", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể đọc file/ảnh.");
      const imported = result.data?.questions as Question[] | undefined;
      if (!imported?.length) throw new Error("Không tìm thấy câu hỏi trắc nghiệm trong file/ảnh.");
      addImportedQuestions(imported);
      setMessage(`Đã đọc ${imported.length} câu từ ${files.length} tệp. Hãy kiểm tra đáp án trước khi xuất bản.`);
      if (pasted) {
        setPastedImport("");
        setShowPasteImport(false);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đọc file/ảnh.");
    } finally {
      setImporting(false);
    }
  }

  function addImportedQuestions(imported: Question[]) {
    setSections((current) => {
      const existing = current[activeSection];
      const onlyEmptyQuestion = existing.length === 1 &&
        !existing[0].prompt.trim() &&
        existing[0].options.every((option) => !option.trim());
      return { ...current, [activeSection]: onlyEmptyQuestion ? imported : [...existing, ...imported] };
    });
  }

  async function uploadQuestionMedia(event: ChangeEvent<HTMLInputElement>, questionIndex: number, kind: "image" | "audio") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const uploadKey = `${activeSection}-${questionIndex}-${kind}`;
    setUploadingMedia(uploadKey);
    setMessage("");
    const body = new FormData();
    body.set("file", file);
    try {
      const response = await fetch("/api/uploads/media", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể tải tệp lên.");
      updateQuestion(questionIndex, kind === "image" ? { imageUrl: result.data.url } : { audioUrl: result.data.url });
      setMessage(`Đã tải ${kind === "image" ? "tranh" : "âm thanh"} cho câu ${questionIndex + 1}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải tệp lên.");
    } finally {
      setUploadingMedia("");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const normalizedSections = Object.fromEntries(
      Object.entries(sections).map(([key, questions]) => [
        key,
        questions
          .filter((question) =>
            Boolean(question.prompt.trim()) ||
            question.options.some((option) => Boolean(option.trim())),
          )
          .map((question) => ({
            ...question,
            options: question.options.map((option) => option.trim()).filter(Boolean),
          })),
      ]),
    );
    try {
      const response = await fetch(editingId ? `/api/admin/jlpt-tests/${editingId}` : "/api/admin/jlpt-tests", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, title, description, visibility, status, accessMode, password: password || undefined, invitedEmails, sections: normalizedSections }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không thể tạo đề thi.");
      setTests((current) => [result.data, ...current.filter((test) => test.id !== result.data.id)]);
      setMessage(editingId ? "Đã cập nhật đề thi." : "Đã tạo đề thi và đưa vào danh sách khóa học.");
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
      <div className="mb-7 flex flex-col gap-5 rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-900/5 sm:flex-row sm:items-center sm:justify-between" data-scroll-reveal>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-600">{personal ? "Cá nhân" : "Quản trị nội dung"}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{personal ? "Đề thi của tôi" : "Đề thi JLPT"}</h1>
          <p className="mt-2 text-sm text-slate-500">{personal ? "Tạo, tìm kiếm và quản lý các đề thi của riêng bạn." : "Tạo đề JLPT, trường học hoặc đề khác và xuất bản thẳng lên khu luyện đề."}</p>
        </div>
        <button className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 font-black text-white shadow-lg shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700" onClick={openCreate} type="button">
          <FiPlus /> Tạo đề
        </button>
      </div>

      {message && !editing ? <p className="mb-5 rounded-2xl border border-teal-200 bg-teal-50 px-5 py-3 font-bold text-teal-800">{message}</p> : null}

      {personal ? (
        <form action="/flashcards/tests" className="mb-5 flex gap-3" data-scroll-reveal>
          <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
            <FiSearch className="shrink-0 text-slate-400" />
            <input className="min-w-0 flex-1 bg-transparent font-semibold outline-none" defaultValue={query} name="q" placeholder="Tìm theo tên hoặc cấp độ..." />
          </label>
          <button className="h-12 rounded-2xl bg-slate-950 px-5 font-black text-white hover:bg-teal-700" type="submit">Tìm kiếm</button>
        </form>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-scroll-reveal-stagger>
        {tests.map((test) => (
          <article className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5" data-scroll-reveal-item key={test.id}>
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-xl text-teal-700"><FiBookOpen /></span>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">{TEST_LEVEL_LABELS[test.level]}</span>
            </div>
            <h2 className="mt-5 text-lg font-black">{test.title}</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">{test.questionCount} câu · {test.sectionCount || 2} phần thi · Có luyện full</p>
            <div className="mt-5 grid grid-cols-[1fr_auto_auto] gap-2">
              <Link className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 font-black text-white hover:bg-teal-700" href={`/flashcards/tests/${test.level.toLowerCase()}/${test.number}`}>
                Xem đề <FiChevronRight />
              </Link>
              <button
                aria-label={`Chỉnh sửa ${test.title}`}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 font-black text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-60"
                disabled={loadingEditId === test.id}
                onClick={() => openEdit(test)}
                type="button"
              >
                {loadingEditId === test.id ? <FiLoader className="animate-spin" /> : <FiEdit3 />} <span className="hidden sm:inline">Sửa</span>
              </button>
              <button
                aria-label={`Xóa ${test.title}`}
                className="flex h-11 items-center justify-center rounded-xl border border-rose-200 px-4 text-rose-600 hover:bg-rose-50"
                onClick={() => void deleteTest(test)}
                type="button"
              >
                <FiTrash2 />
              </button>
            </div>
          </article>
        ))}
      </div>

      {personal && tests.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center" data-scroll-reveal>
          <FiBookOpen className="mx-auto text-3xl text-teal-700" />
          <h2 className="mt-3 text-xl font-black">{query ? "Không tìm thấy đề thi" : "Bạn chưa tạo đề thi nào"}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">{query ? "Hãy thử một từ khóa khác." : "Nhấn “Tạo đề” để bắt đầu."}</p>
        </section>
      ) : null}

      {personal && totalPages > 1 ? (
        <nav aria-label="Phân trang đề thi" className="mt-8 flex items-center justify-center gap-2" data-scroll-reveal>
          <PaginationLink disabled={currentPage <= 1} href={pageHref(currentPage - 1, query)} label="Trang trước"><FiChevronLeft /></PaginationLink>
          <span className="px-3 text-sm font-black text-slate-600">Trang {currentPage}/{totalPages}{typeof totalTests === "number" ? ` · ${totalTests} đề` : ""}</span>
          <PaginationLink disabled={currentPage >= totalPages} href={pageHref(currentPage + 1, query)} label="Trang sau"><FiChevronRight /></PaginationLink>
        </nav>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
          <form className="mx-auto max-w-5xl rounded-[2rem] bg-[#f7f8fb] shadow-2xl" onSubmit={submit}>
            <header className="sticky top-0 z-10 flex items-center justify-between rounded-t-[2rem] border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">Trình soạn đề</p>
                <h2 className="text-xl font-black">{editingId ? "Chỉnh sửa đề thi" : "Tạo đề thi mới"}</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-xl hover:bg-rose-100 hover:text-rose-600" onClick={() => setEditing(false)} type="button"><FiX /></button>
            </header>

            <div className="space-y-6 p-5 sm:p-7">
              <section className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Cấp độ">
                  <select className={inputClass} onChange={(event) => changeLevel(event.target.value as Level)} value={level}>
                    {TEST_LEVELS.map((item) => <option key={item} value={item}>{TEST_LEVEL_LABELS[item]}</option>)}
                  </select>
                </Field>
                <Field className="lg:col-span-3" label="Tên hiển thị"><input className={inputClass} onChange={(event) => setTitle(event.target.value)} required value={title} /></Field>
                <Field className="sm:col-span-2" label="Mô tả"><input className={inputClass} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả ngắn trên thẻ khóa học" value={description} /></Field>
                <Field label="Quyền truy cập"><select className={inputClass} onChange={(event) => { const mode = event.target.value as AccessMode; setAccessMode(mode); setVisibility(mode === "public" ? "public" : "private"); }} value={accessMode}><option value="public">Công khai</option><option value="private">Riêng tư</option><option value="password">Bằng mật khẩu</option><option value="invite">Chia sẻ qua email</option></select></Field>
                <Field label="Trạng thái"><select className={inputClass} onChange={(event) => setStatus(event.target.value)} value={status}><option value="published">Xuất bản</option><option value="draft">Bản nháp</option><option value="hidden">Ẩn</option></select></Field>
                {accessMode === "password" ? <Field className="sm:col-span-2" label={`Mật khẩu${editingId ? " (để trống nếu giữ mật khẩu cũ)" : ""}`}><input className={inputClass} minLength={editingId ? undefined : 4} onChange={(event) => setPassword(event.target.value)} required={!editingId} type="password" value={password} /></Field> : null}
                {accessMode === "invite" ? <Field className="sm:col-span-2 lg:col-span-4" label="Người được truy cập"><EmailInvitePicker emails={invitedEmails} onChange={setInvitedEmails} /></Field> : null}
              </section>

              <section className="flex flex-col gap-4 rounded-[1.5rem] border border-teal-200 bg-teal-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-xl text-teal-700 shadow-sm"><FiFileText /></span>
                  <div>
                    <h3 className="font-black text-slate-900">Tạo câu hỏi từ file hoặc ảnh</h3>
                    <p className="mt-1 text-sm text-slate-600">Chọn cùng lúc tối đa 10 ảnh hoặc file JPG, PNG, WebP, GIF, PDF, TXT, CSV, JSON. Câu hỏi sẽ được gộp vào phần đang chọn.</p>
                  </div>
                </div>
                <input
                  accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv,.json,image/*,application/pdf,text/plain,text/csv,application/json"
                  className="hidden"
                  multiple
                  onChange={importQuestions}
                  ref={fileInputRef}
                  type="file"
                />
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <button
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-teal-300 bg-white px-4 font-black text-teal-800 transition hover:bg-teal-100"
                    onClick={() => setShowImportHint((current) => !current)}
                    type="button"
                  >
                    <FiHelpCircle /> Hướng dẫn format
                  </button>
                  <button
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-teal-300 bg-white px-4 font-black text-teal-800 transition hover:bg-teal-100"
                    onClick={() => setShowPasteImport((current) => !current)}
                    type="button"
                  >
                    <FiFileText /> Dán JSON/CSV
                  </button>
                  <button
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 font-black text-white shadow-lg shadow-teal-700/15 transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60"
                    disabled={importing}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    {importing ? <FiLoader className="animate-spin" /> : <FiUploadCloud />}
                    {importing ? "Đang đọc..." : "Import nhiều file/ảnh"}
                  </button>
                </div>
              </section>
              {showPasteImport ? (
                <section className="rounded-[1.5rem] border border-teal-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-black text-slate-900">Dán nội dung trực tiếp</h3>
                      <p className="mt-1 text-sm text-slate-600">Copy toàn bộ khối JSON, CSV hoặc danh sách câu hỏi rồi dán vào ô dưới đây. Không cần tải thành file.</p>
                    </div>
                    <button aria-label="Đóng phần dán nội dung" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-600" onClick={() => setShowPasteImport(false)} type="button"><FiX /></button>
                  </div>
                  <textarea
                    className="mt-4 min-h-64 w-full rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-sm leading-6 text-emerald-300 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                    onChange={(event) => setPastedImport(event.target.value)}
                    placeholder={'Dán vào đây, ví dụ:\\n{\\n  "questions": [...]\\n}'}
                    spellCheck={false}
                    value={pastedImport}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-bold text-slate-500">{pastedImport.length.toLocaleString("vi-VN")} ký tự · Nội dung được thêm vào phần đang chọn</p>
                    <button
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 font-black text-white disabled:cursor-wait disabled:opacity-60"
                      disabled={importing || !pastedImport.trim()}
                      onClick={importPastedContent}
                      type="button"
                    >
                      {importing ? <FiLoader className="animate-spin" /> : <FiCheck />}
                      {importing ? "Đang xử lý..." : "Tạo câu hỏi từ nội dung dán"}
                    </button>
                  </div>
                  <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">JSON/CSV được xử lý trực tiếp, không gọi AI. Chỉ văn bản tự do mới cần AI để tách câu hỏi.</p>
                </section>
              ) : null}
              {showImportHint ? <ImportFormatHint onClose={() => setShowImportHint(false)} /> : null}

              <div className="grid grid-cols-3 rounded-2xl bg-slate-200 p-1">
                <SectionTab active={activeSection === "vocabularyKanji"} count={sections.vocabularyKanji.length} label="Từ vựng + Kanji" onClick={() => setActiveSection("vocabularyKanji")} />
                <SectionTab active={activeSection === "grammarReading"} count={sections.grammarReading.length} label="Ngữ pháp + Reading" onClick={() => setActiveSection("grammarReading")} />
                <SectionTab active={activeSection === "listening"} count={sections.listening.length} label="Nghe hiểu" onClick={() => setActiveSection("listening")} />
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
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MediaField
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        icon={<FiImage />}
                        label="Thêm tranh"
                        loading={uploadingMedia === `${activeSection}-${questionIndex}-image`}
                        onChange={(event) => uploadQuestionMedia(event, questionIndex, "image")}
                        onRemove={() => updateQuestion(questionIndex, { imageUrl: "" })}
                        type="image"
                        url={question.imageUrl}
                      />
                      <MediaField
                        accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/webm"
                        icon={<FiMusic />}
                        label="Thêm âm thanh"
                        loading={uploadingMedia === `${activeSection}-${questionIndex}-audio`}
                        onChange={(event) => uploadQuestionMedia(event, questionIndex, "audio")}
                        onRemove={() => updateQuestion(questionIndex, { audioUrl: "" })}
                        type="audio"
                        url={question.audioUrl}
                      />
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
              <button className="flex h-12 items-center gap-2 rounded-2xl bg-rose-600 px-7 font-black text-white disabled:opacity-60" disabled={submitting || importing || Boolean(uploadingMedia)} type="submit"><FiCheck /> {submitting ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Tạo và xuất bản"}</button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function pageHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("page", String(page));
  return `/flashcards/tests?${params.toString()}`;
}

function PaginationLink({ children, disabled, href, label }: { children: React.ReactNode; disabled: boolean; href: string; label: string }) {
  const className = `grid h-10 w-10 place-items-center rounded-xl border text-slate-700 transition ${disabled ? "pointer-events-none border-slate-100 opacity-40" : "border-slate-200 bg-white hover:border-teal-300 hover:text-teal-700"}`;
  return disabled
    ? <span aria-disabled="true" aria-label={label} className={className}>{children}</span>
    : <Link aria-label={label} className={className} href={href}>{children}</Link>;
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-sm font-black text-slate-700">{label}</span>{children}</label>;
}

function SectionTab({ active, count, label, onClick }: { active: boolean; count: number; label: string; onClick: () => void }) {
  return <button className={`rounded-xl px-3 py-3 text-sm font-black transition ${active ? "bg-slate-950 text-white shadow" : "text-slate-600"}`} onClick={onClick} type="button">{label} <span className="ml-1 opacity-70">({count})</span></button>;
}

function MediaField({ accept, icon, label, loading, onChange, onRemove, type, url }: {
  accept: string; icon: React.ReactNode; label: string; loading: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: () => void;
  type: "image" | "audio"; url: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      {url && type === "image" ? <img alt="Tranh minh họa câu hỏi" className="mb-3 max-h-56 w-full rounded-lg object-contain" src={url} /> : null}
      {url && type === "audio" ? <audio className="mb-3 w-full" controls preload="metadata" src={url} /> : null}
      <div className="flex gap-2">
        <label className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-black text-teal-700 shadow-sm">
          {loading ? <FiLoader className="animate-spin" /> : icon} {loading ? "Đang tải..." : url ? `Đổi ${label.toLowerCase()}` : label}
          <input accept={accept} className="hidden" disabled={loading} onChange={onChange} type="file" />
        </label>
        {url ? <button className="h-10 rounded-lg px-3 text-sm font-black text-rose-600 hover:bg-rose-50" onClick={onRemove} type="button">Xóa</button> : null}
      </div>
    </div>
  );
}

function ImportFormatHint({ onClose }: { onClose: () => void }) {
  return (
    <section className="rounded-[1.5rem] border border-teal-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 font-black text-slate-900"><FiHelpCircle className="text-teal-700" /> Format Import đề thi</h3>
          <p className="mt-1 text-sm text-slate-600">Không bắt buộc theo mẫu tuyệt đối, nhưng tài liệu rõ ràng sẽ cho kết quả chính xác hơn.</p>
        </div>
        <button aria-label="Đóng hướng dẫn" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-600" onClick={onClose} type="button"><FiX /></button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <HintCard title="Ảnh / PDF">
          <ul className="list-disc space-y-1 pl-5">
            <li>Ảnh thẳng, rõ nét, không bị cắt mất câu hoặc đáp án.</li>
            <li>Mỗi câu nên thấy đủ số câu, nội dung và toàn bộ lựa chọn.</li>
            <li>Nếu có đáp án, ghi rõ như <code>Đáp án: 2</code> hoặc khoanh đáp án.</li>
            <li>Chọn nhiều ảnh theo đúng thứ tự trang; tối đa 10 tệp/lần.</li>
          </ul>
        </HintCard>
        <HintCard title="TXT">
          <pre className="whitespace-pre-wrap">{`Câu 1: 先週 デパートに（　）。
1. いきます
2. いきました
3. いきません
4. いく
Đáp án: 2
Giải thích: 先週 dùng với quá khứ.`}</pre>
        </HintCard>
        <HintCard title="CSV — UTF-8, một câu mỗi dòng">
          <pre className="overflow-x-auto whitespace-pre">{`group,instruction,prompt,option1,option2,option3,option4,correctIndex,highlightText,explanation
Từ vựng,Chọn đáp án đúng,先週 デパートに（　）。,いきます,いきました,いきません,いく,1,先週,Dùng động từ quá khứ`}</pre>
          <p className="mt-2">Trong CSV/JSON, <code>correctIndex</code> bắt đầu từ <strong>0</strong>: đáp án 1 = 0, đáp án 2 = 1.</p>
        </HintCard>
        <HintCard title="JSON">
          <pre className="overflow-x-auto whitespace-pre">{`{
  "questions": [{
    "group": "Ngữ pháp",
    "instruction": "Chọn đáp án đúng nhất",
    "prompt": "先週 デパートに（　）。",
    "options": ["いきます", "いきました", "いきません", "いく"],
    "correctIndex": 1,
    "highlightText": "先週",
    "explanation": "Dùng động từ quá khứ."
  }]
}`}</pre>
        </HintCard>
      </div>
      <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Sau khi Import, hãy kiểm tra lại nội dung tiếng Nhật và vòng tròn đáp án đúng trước khi xuất bản.</p>
    </section>
  );
}

function HintCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
      <h4 className="mb-2 font-black text-slate-900">{title}</h4>
      {children}
    </div>
  );
}

const inputClass = "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100";

function parseStructuredPaste(raw: string): Question[] | null {
  const content = raw.replace(/^```(?:json|csv)?\s*/i, "").replace(/\s*```$/, "").trim();
  if (content.startsWith("{") || content.startsWith("[")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("JSON chưa hợp lệ. Hãy copy toàn bộ nội dung từ dấu { mở đến dấu } đóng.");
    }
    const rows = Array.isArray(parsed)
      ? parsed
      : (parsed as { questions?: unknown })?.questions;
    if (!Array.isArray(rows)) throw new Error('JSON cần có dạng {"questions": [...]} hoặc là một mảng câu hỏi.');
    return normalizeStructuredRows(rows);
  }

  const firstLine = content.split(/\r?\n/, 1)[0]?.toLowerCase() || "";
  if (firstLine.includes("prompt") && (firstLine.includes("option") || firstLine.includes("options"))) {
    const table = parseCsv(content);
    if (table.length < 2) throw new Error("CSV chưa có dòng câu hỏi.");
    const headers = table[0].map((header) => header.trim());
    const rows = table.slice(1).filter((row) => row.some((value) => value.trim())).map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
    );
    return normalizeStructuredRows(rows);
  }
  return null;
}

function normalizeStructuredRows(rows: unknown[]): Question[] {
  if (!rows.length) throw new Error("Không tìm thấy câu hỏi trong dữ liệu.");
  return rows.map((value, index) => {
    if (!value || typeof value !== "object") throw new Error(`Câu ${index + 1} không đúng định dạng.`);
    const row = value as Record<string, unknown>;
    let options: unknown[] = [];
    if (Array.isArray(row.options)) {
      options = row.options;
    } else if (typeof row.options === "string" && row.options.trim()) {
      try {
        const parsedOptions = JSON.parse(row.options);
        options = Array.isArray(parsedOptions) ? parsedOptions : [];
      } catch {
        options = row.options.split("|");
      }
    } else {
      options = [row.option1, row.option2, row.option3, row.option4, row.option5, row.option6]
        .filter((option) => option !== undefined && String(option).trim());
    }
    const prompt = String(row.prompt ?? "").trim();
    const normalizedOptions = options.map((option) => String(option).trim()).filter(Boolean);
    const correctIndex = Number(row.correctIndex ?? 0);
    if (!prompt) throw new Error(`Câu ${index + 1} thiếu trường prompt.`);
    if (normalizedOptions.length < 2) throw new Error(`Câu ${index + 1} cần ít nhất 2 đáp án.`);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= normalizedOptions.length) {
      throw new Error(`Câu ${index + 1} có correctIndex không hợp lệ. Chỉ số bắt đầu từ 0.`);
    }
    return {
      group: String(row.group ?? "Dạng câu hỏi").trim() || "Dạng câu hỏi",
      instruction: String(row.instruction ?? "Chọn đáp án đúng nhất").trim(),
      prompt,
      highlightText: String(row.highlightText ?? "").trim(),
      imageUrl: String(row.imageUrl ?? "").trim(),
      audioUrl: String(row.audioUrl ?? "").trim(),
      options: normalizedOptions,
      correctIndex,
      explanation: String(row.explanation ?? "").trim(),
    };
  });
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && content[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  row.push(field);
  if (row.some((value) => value.length) || rows.length === 0) rows.push(row);
  return rows;
}
