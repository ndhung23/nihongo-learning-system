"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { FiAlertCircle, FiArrowLeft, FiBookmark, FiCheckCircle, FiFileText, FiHelpCircle, FiUploadCloud, FiX, FiZap } from "react-icons/fi";
import { FormField } from "../components/FormField";
import { RomajiKanaInput } from "../components/RomajiKanaInput";
import { getKnownDailyProgressStorageKey } from "../components/dailyProgressStorage";

type WordForm = {
  term: string;
  kana: string;
  romaji: string;
  partOfSpeech: string;
  meaningVi: string;
  exampleJa: string;
  exampleVi: string;
  imageUrl: string;
};

type ParsedImportRow = {
  lineNumber: number;
  raw: string;
  word?: WordForm;
  error?: string;
};

const emptyForm: WordForm = {
  term: "",
  kana: "",
  romaji: "",
  partOfSpeech: "",
  meaningVi: "",
  exampleJa: "",
  exampleVi: "",
  imageUrl: "",
};

const japanesePattern = /[\u3040-\u30ff\u3400-\u9fff]/;

function fromFields(fields: string[], lineNumber: number, raw: string): ParsedImportRow {
  if (fields.length < 4) {
    return { lineNumber, raw, error: "Thiếu dữ liệu. Cần tối thiểu: từ, kana, nghĩa, ví dụ." };
  }

  const hasRomaji = fields.length >= 6;
  const term = fields[0];
  const kana = fields[1] ?? "";
  const romaji = hasRomaji ? fields[2] : "";
  const meaningVi = hasRomaji ? fields[3] : fields[2];
  const exampleJa = hasRomaji ? fields[4] : fields[3];
  const exampleVi = hasRomaji ? fields.slice(5).join(", ") : fields.slice(4).join(", ");

  if (!term || !meaningVi) {
    return { lineNumber, raw, error: "Từ vựng và nghĩa tiếng Việt không được để trống." };
  }

  return {
    lineNumber,
    raw,
    word: {
      ...emptyForm,
      term,
      kana,
      romaji,
      meaningVi,
      exampleJa,
      exampleVi,
    },
  };
}

function parseImportLine(raw: string, index: number): ParsedImportRow | null {
  const line = raw.trim();
  const lineNumber = index + 1;

  if (!line) {
    return null;
  }

  if (line.includes(",") || line.includes("|")) {
    return fromFields(
      line
        .split(/[|,]/)
        .map((field) => field.trim())
        .filter(Boolean),
      lineNumber,
      raw,
    );
  }

  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length < 4) {
    return { lineNumber, raw, error: "Dòng dùng khoảng trắng cần có: từ kana nghĩa ví dụ." };
  }

  const exampleIndex = tokens.findIndex((token, tokenIndex) => tokenIndex > 1 && japanesePattern.test(token));
  if (exampleIndex < 3) {
    return { lineNumber, raw, error: "Không tìm thấy câu ví dụ tiếng Nhật trong dòng này." };
  }

  return {
    lineNumber,
    raw,
    word: {
      ...emptyForm,
      term: tokens[0],
      kana: tokens[1],
      meaningVi: tokens.slice(2, exampleIndex).join(" "),
      exampleJa: tokens[exampleIndex],
      exampleVi: tokens.slice(exampleIndex + 1).join(" "),
    },
  };
}

function wordFromRecord(record: Record<string, unknown>): WordForm {
  const value = (key: string, fallback = "") => String(record[key] ?? fallback).trim();
  return {
    ...emptyForm,
    term: value("term", value("word", value("từ"))),
    kana: value("kana"),
    romaji: value("romaji"),
    partOfSpeech: value("partOfSpeech", value("type", value("từ loại"))),
    meaningVi: value("meaningVi", value("meaning", value("nghĩa"))),
    exampleJa: value("exampleJa", value("example", value("ví dụ"))),
    exampleVi: value("exampleVi", value("exampleMeaning", value("dịch ví dụ"))),
    imageUrl: value("imageUrl"),
  };
}

function parseStructuredFile(content: string, fileName: string) {
  if (fileName.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(content) as unknown;
    const rows = Array.isArray(parsed)
      ? parsed
      : (parsed as { words?: unknown[] })?.words;
    if (!Array.isArray(rows)) throw new Error("JSON cần là một mảng hoặc có trường words.");
    return rows.map((row) => wordFromRecord(row as Record<string, unknown>));
  }
  if (fileName.toLowerCase().endsWith(".csv")) {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    const headers = lines[0]?.split(",").map((item) => item.trim()) ?? [];
    if (headers.some((item) => ["term", "word", "meaningVi", "meaning"].includes(item))) {
      return lines.slice(1).map((line) => wordFromRecord(Object.fromEntries(
        line.split(",").map((value, index) => [headers[index], value.trim()]),
      )));
    }
  }
  return content.split(/\r?\n/).map(parseImportLine).filter((row): row is ParsedImportRow => Boolean(row))
    .map((row) => {
      if (!row.word) throw new Error(`Dòng ${row.lineNumber}: ${row.error}`);
      return row.word;
    });
}

function parsePastedContent(content: string): ParsedImportRow[] {
  if (!content.trim()) return [];
  try {
    const trimmed = content.trim();
    const fileName = trimmed.startsWith("[") || trimmed.startsWith("{")
      ? "pasted.json"
      : /^term,|^word,|^từ,/i.test(trimmed)
        ? "pasted.csv"
        : "";
    if (fileName) {
      return parseStructuredFile(content, fileName).map((word, index) => ({
        lineNumber: index + 1,
        raw: word.term,
        word,
      }));
    }
  } catch (error) {
    return [{ lineNumber: 1, raw: content.slice(0, 100), error: error instanceof Error ? error.message : "Dữ liệu chưa đúng định dạng." }];
  }
  return content.split(/\r?\n/).map(parseImportLine).filter((row): row is ParsedImportRow => Boolean(row));
}

function toPayload(word: WordForm) {
  return {
    term: word.term.trim(),
    kana: word.kana.trim(),
    romaji: word.romaji.trim(),
    partOfSpeech: word.partOfSpeech.trim(),
    meaningVi: word.meaningVi.trim(),
    examples: word.exampleJa.trim()
      ? [
          {
            ja: word.exampleJa.trim(),
            vi: word.exampleVi.trim(),
          },
        ]
      : [],
    source: "user",
    level: "custom",
    imageUrl: word.imageUrl,
  };
}

export function AddWordScreen({
  deckId,
  vocabularyId = "",
  onBack,
  onSaved,
}: Readonly<{
  deckId: string;
  vocabularyId?: string;
  onBack: () => void;
  onSaved?: () => void;
}>) {
  const [form, setForm] = useState<WordForm>(emptyForm);
  const [showImport, setShowImport] = useState(false);
  const [showImportHint, setShowImportHint] = useState(false);
  const [importText, setImportText] = useState("");
  const [fileWords, setFileWords] = useState<WordForm[]>([]);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isImportingFiles, setIsImportingFiles] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!vocabularyId) return;
    void fetch(`/api/vocabulary/${encodeURIComponent(vocabularyId)}`, { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as { data?: { term?: string; kana?: string; romaji?: string; partOfSpeech?: string; meaningVi?: string; examples?: Array<{ ja?: string; vi?: string }>; imageUrl?: string }; message?: string };
      if (!response.ok || !payload.data) throw new Error(payload.message || "Không thể tải từ vựng.");
      setForm({ term: payload.data.term || "", kana: payload.data.kana || "", romaji: payload.data.romaji || "", partOfSpeech: payload.data.partOfSpeech || "", meaningVi: payload.data.meaningVi || "", exampleJa: payload.data.examples?.[0]?.ja || "", exampleVi: payload.data.examples?.[0]?.vi || "", imageUrl: payload.data.imageUrl || "" });
    }).catch((error: unknown) => setStatus({ tone: "error", message: error instanceof Error ? error.message : "Không thể tải từ vựng." }));
  }, [vocabularyId]);

  const parsedRows = useMemo(
    () => parsePastedContent(importText),
    [importText],
  );
  const validRows = [
    ...parsedRows.filter((row) => row.word),
    ...fileWords.map((word, index) => ({ lineNumber: parsedRows.length + index + 1, raw: word.term, word })),
  ];
  const invalidRows = parsedRows.filter((row) => row.error);
  const previewWord = (showImport ? validRows[0]?.word : form) ?? emptyForm;

  const handleFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingImage(true);
    setStatus(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/uploads/image", { method: "POST", body });
      const payload = (await response.json()) as { data?: { url?: string }; message?: string };
      if (!response.ok || !payload.data?.url) {
        throw new Error(payload.message || "Không thể tải ảnh lên.");
      }
      setForm((current) => ({ ...current, imageUrl: payload.data?.url || "" }));
      setStatus({ tone: "success", message: "Đã tải ảnh minh họa lên." });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Không thể tải ảnh lên." });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const importFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setIsImportingFiles(true);
    setStatus(null);
    try {
      const structured = files.filter((file) => /\.(txt|csv|json)$/i.test(file.name));
      const media = files.filter((file) => !structured.includes(file));
      const words: WordForm[] = [];
      for (const file of structured) words.push(...parseStructuredFile(await file.text(), file.name));
      if (media.length) {
        const body = new FormData();
        media.forEach((file) => body.append("files", file));
        const response = await fetch("/api/vocabulary/import", { method: "POST", body });
        const payload = await response.json() as { data?: { words?: WordForm[] }; message?: string };
        if (!response.ok || !payload.data?.words) throw new Error(payload.message || "Không thể đọc ảnh/PDF.");
        words.push(...payload.data.words);
      }
      const usable = words.filter((word) => word.term && word.meaningVi);
      if (!usable.length) throw new Error("Không tìm thấy từ vựng hợp lệ trong các file.");
      setFileWords((current) => [...current, ...usable]);
      setShowImport(true);
      setStatus({ tone: "success", message: `Đã đọc ${usable.length} từ từ ${files.length} file. Hãy xem trước rồi lưu.` });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Không thể đọc file." });
    } finally {
      setIsImportingFiles(false);
    }
  };

  const saveWord = async (word: WordForm) => {
    const response = await fetch(vocabularyId ? `/api/vocabulary/${encodeURIComponent(vocabularyId)}` : "/api/vocabulary", {
      method: vocabularyId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...toPayload(word), ...(!vocabularyId ? { deckId } : {}) }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string; code?: string } | null;
      if (response.status === 409 || data?.code === "DUPLICATE_WORD") return false;
      throw new Error(data?.message || "Không thể lưu từ vựng.");
    }
    return true;
  };

  const suggestWithAi = async () => {
    const term = form.term.trim();

    if (!term) {
      setStatus({ tone: "error", message: "Hãy nhập từ tiếng Nhật trước khi dùng Gợi ý AI." });
      return;
    }

    setIsSuggesting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/flashcards/grade-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vocabulary-suggest", term }),
      });
      const payload = (await response.json()) as {
        data?: Omit<WordForm, "term">;
        message?: string;
        remainingAiCredits?: number;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Không thể tạo gợi ý từ vựng.");
      }

      setForm((current) => ({
        ...current,
        ...payload.data,
        term: current.term,
      }));

      if (typeof payload.remainingAiCredits === "number") {
        const storageKey = getKnownDailyProgressStorageKey();
        const current = JSON.parse(window.localStorage.getItem(storageKey) || "{}") as Record<string, unknown>;
        window.localStorage.setItem(storageKey, JSON.stringify({ ...current, aiCredits: payload.remainingAiCredits }));
        window.dispatchEvent(new CustomEvent("nihongo-daily-progress-updated"));
      }

      setStatus({ tone: "success", message: `AI đã điền thông tin. Còn ${payload.remainingAiCredits ?? 0} lượt AI.` });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Không thể tạo gợi ý từ vựng." });
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const words = showImport ? validRows.map((row) => row.word as WordForm) : [form];
    if (!words.length || words.some((word) => !word.term.trim() || !word.meaningVi.trim())) {
      setStatus({ tone: "error", message: "Bạn cần nhập tối thiểu từ vựng và nghĩa tiếng Việt." });
      return;
    }

    if (showImport && invalidRows.length) {
      setStatus({ tone: "error", message: `Có ${invalidRows.length} dòng chưa đúng định dạng, sửa lại rồi import nhé.` });
      return;
    }

    setIsSaving(true);
    try {
      let savedCount = 0;
      let duplicateCount = 0;
      for (const word of words) {
        const saved = await saveWord(word);
        if (saved) savedCount += 1;
        else duplicateCount += 1;
      }

      setStatus({
        tone: showImport || savedCount ? "success" : "error",
        message: showImport
          ? `Đã thêm ${savedCount} từ${duplicateCount ? `, bỏ qua ${duplicateCount} từ đã tồn tại` : ""}.`
          : savedCount ? "Đã lưu từ mới vào bộ từ riêng." : "Từ này đã tồn tại trong bộ từ.",
      });
      setForm(emptyForm);
      setImportText("");
      setFileWords([]);
      onSaved?.();
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Không thể lưu từ vựng." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10" onSubmit={handleSubmit}>
      <button className="mb-5 flex items-center gap-2 rounded-full px-2 py-1 text-sm font-bold text-slate-500 transition hover:text-rose-600" onClick={onBack} type="button">
        <FiArrowLeft /> Quay lại
      </button>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-600">Tạo dữ liệu học</p>
          <h1 className="mt-2 text-4xl font-black">{vocabularyId ? "Sửa từ vựng" : "Thêm từ mới"}</h1>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 font-black text-indigo-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-100"
          onClick={() => {
            setShowImport((current) => !current);
            setStatus(null);
          }}
          type="button"
        >
          {showImport ? <FiX /> : <FiUploadCloud />} {showImport ? "Đóng import" : "Thêm nhiều từ"}
        </button>
      </div>

      {showImport ? (
        <section className="mb-5 rounded-[2rem] border border-teal-200 bg-white p-5 shadow-2xl shadow-slate-900/[0.05]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-teal-700">Import nhiều từ</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                Mỗi dòng là 1 từ. Dùng dấu phẩy, dấu |, hoặc khoảng trắng theo mẫu bên dưới.
              </p>
            </div>
            <div className="flex gap-2 text-sm font-black">
              <span className="rounded-full bg-teal-50 px-3 py-2 text-teal-700">{validRows.length} dòng hợp lệ</span>
              {invalidRows.length ? <span className="rounded-full bg-rose-50 px-3 py-2 text-rose-700">{invalidRows.length} dòng lỗi</span> : null}
            </div>
          </div>
          <input
            accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv,.json,image/*,application/pdf,text/plain,text/csv,application/json"
            className="hidden"
            multiple
            onChange={importFiles}
            ref={importInputRef}
            type="file"
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="inline-flex h-12 items-center gap-2 rounded-2xl border border-teal-300 bg-white px-4 font-black text-teal-800 hover:bg-teal-50" onClick={() => setShowImportHint((current) => !current)} type="button">
              <FiHelpCircle /> Hướng dẫn 4 định dạng
            </button>
            <button className="inline-flex h-12 items-center gap-2 rounded-2xl border border-teal-300 bg-white px-4 font-black text-teal-800 hover:bg-teal-50" onClick={() => document.getElementById("vocabulary-import-text")?.focus()} type="button">
              <FiFileText /> Dán TXT/CSV/JSON
            </button>
            <button className="inline-flex h-12 items-center gap-2 rounded-2xl bg-teal-700 px-5 font-black text-white shadow-lg shadow-teal-700/15 disabled:opacity-60" disabled={isImportingFiles} onClick={() => importInputRef.current?.click()} type="button">
              <FiUploadCloud /> {isImportingFiles ? "Đang đọc..." : "Import nhiều file/ảnh"}
            </button>
          </div>
          {showImportHint ? (
            <div className="mt-5 rounded-3xl border border-teal-200 bg-teal-50/40 p-4 sm:p-5">
              <div>
                <h3 className="font-black text-slate-950">Hướng dẫn tạo file import từ vựng</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                  Chỉ <b>từ tiếng Nhật</b> và <b>nghĩa tiếng Việt</b> là bắt buộc. Kana, romaji, từ loại và ví dụ có thể để trống.
                  Luôn xem lại danh sách preview trước khi bấm “Import vào bộ từ”.
                </p>
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <ImportHint title="1. Ảnh / PDF">
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Hỗ trợ JPG, PNG, WebP, GIF và PDF; tối đa 10 file/lần, 12 MB/file.</li>
                    <li>Ảnh phải thẳng, rõ chữ và không cắt mất từ, cách đọc hoặc nghĩa.</li>
                    <li>PDF nên là bảng/danh sách từ vựng; các trang được đọc theo đúng thứ tự.</li>
                    <li>AI sẽ bổ sung thông tin còn thiếu. Hãy kiểm tra lại kana, nghĩa và ví dụ trong preview.</li>
                  </ul>
                </ImportHint>
                <ImportHint title="2. TXT — một từ mỗi dòng">
                  <p>Dùng dấu <b>|</b> (khuyên dùng) hoặc dấu phẩy để ngăn cột.</p>
                  <p className="mt-2 font-bold">Mẫu đầy đủ 6 cột:</p>
                  <CodeSample>{`term | kana | romaji | meaningVi | exampleJa | exampleVi\n食べる | たべる | taberu | ăn | 毎朝パンを食べます。 | Mỗi sáng tôi ăn bánh mì.`}</CodeSample>
                  <p className="mt-2">Có thể dùng mẫu ngắn 4 cột: <b>term | kana | meaningVi | exampleJa</b>.</p>
                </ImportHint>
                <ImportHint title="3. CSV — UTF-8, dòng đầu là header">
                  <p>Giữ đúng tên cột dưới đây. Mỗi dòng sau header là một từ:</p>
                  <CodeSample>{`term,kana,romaji,partOfSpeech,meaningVi,exampleJa,exampleVi\n勉強,べんきょう,benkyou,danh từ,học tập,日本語を勉強します。,Tôi học tiếng Nhật.`}</CodeSample>
                  <p className="mt-2">Không bắt buộc đủ mọi cột, nhưng phải có <b>term</b> và <b>meaningVi</b>. Lưu file bằng UTF-8 để không lỗi tiếng Nhật/Việt.</p>
                </ImportHint>
                <ImportHint title="4. JSON — mảng hoặc object có words">
                  <p>Tên field được hỗ trợ: term, kana, romaji, partOfSpeech, meaningVi, exampleJa, exampleVi, imageUrl.</p>
                  <CodeSample>{`{\n  "words": [\n    {\n      "term": "図書館",\n      "kana": "としょかん",\n      "romaji": "toshokan",\n      "partOfSpeech": "danh từ",\n      "meaningVi": "thư viện",\n      "exampleJa": "図書館で本を読みます。",\n      "exampleVi": "Tôi đọc sách ở thư viện."\n    }\n  ]\n}`}</CodeSample>
                </ImportHint>
              </div>
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
                <b>Lưu ý:</b> Không đặt dòng tiêu đề trong TXT. Với CSV, dấu phẩy trong nội dung có thể bị hiểu là cột mới;
                nên tránh dấu phẩy trong câu ví dụ hoặc dùng JSON khi nội dung phức tạp.
              </div>
            </div>
          ) : null}
          <textarea
            id="vocabulary-import-text"
            className="mt-4 min-h-56 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 font-semibold leading-7 outline-none transition-all duration-300 focus:border-teal-400 focus:bg-white focus:shadow-lg focus:shadow-teal-500/10"
            onChange={(event) => setImportText(event.target.value)}
            placeholder={"何でも なんでも Gì cũng được 何でもいいです Gì cũng được\n何でも,なんでも,Gì cũng được,何でもいいです,Gì cũng được"}
            value={importText}
          />
          {invalidRows.length ? (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
              {invalidRows.slice(0, 4).map((row) => (
                <p key={`${row.lineNumber}-${row.raw}`}>Dòng {row.lineNumber}: {row.error}</p>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/[0.05]">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Từ vựng & trợ lý AI</label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <RomajiKanaInput
              className="h-13 flex-1 rounded-2xl border border-slate-200 px-4 outline-none transition-all duration-300 focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10"
              name="term"
              onValueChange={(value) => setForm((current) => ({ ...current, term: value }))}
              placeholder="Nhập một từ tiếng Nhật..."
              value={form.term}
            />
            <button
              className="rounded-2xl bg-teal-600 px-6 py-3 font-black text-white shadow-lg shadow-teal-600/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60 sm:ml-auto"
              disabled={isSuggesting}
              onClick={suggestWithAi}
              type="button"
            >
              <FiZap className="mr-2 inline" /> {isSuggesting ? "AI đang điền..." : "Gợi ý AI · 1 lượt"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_440px]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/[0.05]">
          {showImport ? (
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Preview import</p>
              <div className="mt-4 max-h-96 space-y-3 overflow-auto pr-2">
                {validRows.length ? (
                  validRows.map((row) => (
                    <div key={`${row.lineNumber}-${row.raw}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black text-slate-950">{row.word?.term}</p>
                        <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-700">Dòng {row.lineNumber}</span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-500">{row.word?.kana}</p>
                      <p className="mt-2 font-bold text-slate-700">{row.word?.meaningVi}</p>
                      {row.word?.exampleJa ? <p className="mt-2 text-sm font-semibold text-slate-500">{row.word.exampleJa} - {row.word.exampleVi}</p> : null}
                    </div>
                  ))
                ) : (
                  <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm font-bold text-slate-500">
                    Dán danh sách từ vào ô import để xem trước.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <FormField label="Từ loại" name="partOfSpeech" onChange={handleFieldChange} placeholder="n, v, adj, adv..." value={form.partOfSpeech} />
              <FormField label="Nghĩa tiếng Việt" name="meaningVi" onChange={handleFieldChange} placeholder="Nghĩa ngắn gọn..." value={form.meaningVi} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  kanaSuggestions
                  label="Kana"
                  name="kana"
                  onValueChange={(value) => setForm((current) => ({ ...current, kana: value }))}
                  placeholder="Gõ romaji để chọn ひらがな / カタカナ..."
                  value={form.kana}
                />
                <FormField label="Romaji" name="romaji" onChange={handleFieldChange} placeholder="romaji..." value={form.romaji} />
              </div>
              <FormField
                kanaSuggestions
                label="Ví dụ"
                name="exampleJa"
                onValueChange={(value) => setForm((current) => ({ ...current, exampleJa: value }))}
                placeholder="Gõ romaji, nhấn Enter để chuyển Kana..."
                textarea
                value={form.exampleJa}
              />
              <FormField label="Dịch nghĩa ví dụ" name="exampleVi" onChange={handleFieldChange} placeholder="VD: Tôi học tiếng Nhật mỗi ngày" value={form.exampleVi} />
              <div className="mt-4">
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Ảnh minh họa</p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-5 py-3 font-black text-teal-700 transition hover:bg-teal-100">
                    <FiUploadCloud />
                    {isUploadingImage ? "Đang tải ảnh..." : form.imageUrl ? "Đổi ảnh" : "Chọn ảnh từ máy"}
                    <input accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={isUploadingImage} onChange={uploadImage} type="file" />
                  </label>
                  {form.imageUrl ? (
                    <button className="rounded-xl px-4 py-2 text-sm font-black text-rose-600 hover:bg-rose-50" onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))} type="button">
                      Xóa ảnh
                    </button>
                  ) : null}
                  <span className="text-xs font-bold text-slate-400">JPG, PNG, WebP hoặc GIF · tối đa 5 MB</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid min-h-96 place-items-center rounded-[2rem] border border-dashed border-teal-300 bg-teal-50/60 p-6 text-center">
          <div>
            {previewWord.term ? (
              <>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-600">Preview thẻ học</p>
                {previewWord.imageUrl ? <img alt={`Minh họa ${previewWord.term}`} className="mx-auto mt-4 h-40 w-full max-w-72 rounded-2xl object-cover shadow-lg" src={previewWord.imageUrl} /> : null}
                <h2 className="mt-4 text-4xl font-black text-slate-950">{previewWord.term}</h2>
                <p className="mt-2 font-bold text-slate-500">{previewWord.kana || "Chưa có kana"}</p>
                <p className="mt-5 text-2xl font-black text-teal-700">{previewWord.meaningVi || "Chưa có nghĩa"}</p>
                {previewWord.exampleJa ? <p className="mt-5 font-bold text-slate-600">{previewWord.exampleJa}</p> : null}
                {previewWord.exampleVi ? <p className="mt-2 text-sm font-semibold text-slate-500">{previewWord.exampleVi}</p> : null}
              </>
            ) : (
              <>
                <FiBookmark className="mx-auto h-12 w-12 text-teal-500" />
                <p className="mt-4 font-black text-slate-600">Preview thẻ học</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Ảnh, ví dụ và từ liên quan sẽ hiện ở đây sau khi nhập dữ liệu.</p>
              </>
            )}
          </div>
        </div>
      </div>

      {status ? (
        <div className={`mt-5 flex items-center gap-2 rounded-2xl px-4 py-3 font-bold ${status.tone === "success" ? "bg-teal-50 text-teal-700" : "bg-rose-50 text-rose-700"}`}>
          {status.tone === "success" ? <FiCheckCircle /> : <FiAlertCircle />} {status.message}
        </div>
      ) : null}

      <button
        className="mt-5 h-14 w-full rounded-2xl bg-slate-950 font-black text-white shadow-xl shadow-slate-900/12 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Đang lưu..." : showImport ? "Import vào bộ từ" : vocabularyId ? "Lưu thay đổi" : "Lưu vào bộ từ"}
      </button>
    </form>
  );
}

function ImportHint({ children, title }: Readonly<{ children: React.ReactNode; title: string }>) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="font-black text-slate-900">{title}</p>
      <div className="mt-2 text-sm font-semibold leading-6 text-slate-600">{children}</div>
    </div>
  );
}

function CodeSample({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <pre className="mt-2 overflow-x-auto whitespace-pre rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-100">
      <code>{children}</code>
    </pre>
  );
}
