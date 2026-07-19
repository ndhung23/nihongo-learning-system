"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { FiAlertCircle, FiArrowLeft, FiBookmark, FiCheckCircle, FiUploadCloud, FiX, FiZap } from "react-icons/fi";
import { FormField } from "../components/FormField";

type WordForm = {
  term: string;
  kana: string;
  romaji: string;
  partOfSpeech: string;
  meaningVi: string;
  exampleJa: string;
  exampleVi: string;
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
  };
}

export function AddWordScreen({
  onBack,
  onSaved,
}: Readonly<{
  onBack: () => void;
  onSaved?: () => void;
}>) {
  const [form, setForm] = useState<WordForm>(emptyForm);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const parsedRows = useMemo(
    () => importText.split(/\r?\n/).map(parseImportLine).filter(Boolean) as ParsedImportRow[],
    [importText],
  );
  const validRows = parsedRows.filter((row) => row.word);
  const invalidRows = parsedRows.filter((row) => row.error);
  const previewWord = (showImport ? validRows[0]?.word : form) ?? emptyForm;

  const handleFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const saveWord = async (word: WordForm) => {
    const response = await fetch("/api/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(word)),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(data?.message || "Không thể lưu từ vựng.");
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
      for (const word of words) {
        await saveWord(word);
      }

      setStatus({
        tone: "success",
        message: showImport ? `Đã import ${words.length} từ vào bộ từ riêng.` : "Đã lưu từ mới vào bộ từ riêng.",
      });
      setForm(emptyForm);
      setImportText("");
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
          <h1 className="mt-2 text-4xl font-black">Thêm từ mới</h1>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 font-black text-indigo-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-100"
          onClick={() => {
            setShowImport((current) => !current);
            setStatus(null);
          }}
          type="button"
        >
          {showImport ? <FiX /> : <FiUploadCloud />} {showImport ? "Đóng import" : "Import text"}
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
          <textarea
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
            <input
              className="h-13 flex-1 rounded-2xl border border-slate-200 px-4 outline-none transition-all duration-300 focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10"
              name="term"
              onChange={handleFieldChange}
              placeholder="Nhập một từ tiếng Nhật..."
              value={form.term}
            />
            <button className="rounded-2xl bg-teal-600 px-6 py-3 font-black text-white shadow-lg shadow-teal-600/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-700" type="button">
              <FiZap className="mr-2 inline" /> Gợi ý AI
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
                  validRows.slice(0, 20).map((row) => (
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
                <FormField label="Kana" name="kana" onChange={handleFieldChange} placeholder="かな..." value={form.kana} />
                <FormField label="Romaji" name="romaji" onChange={handleFieldChange} placeholder="romaji..." value={form.romaji} />
              </div>
              <FormField label="Ví dụ" name="exampleJa" onChange={handleFieldChange} placeholder="Ví dụ chứa từ vựng..." textarea value={form.exampleJa} />
              <FormField label="Dịch nghĩa ví dụ" name="exampleVi" onChange={handleFieldChange} placeholder="VD: Tôi học tiếng Nhật mỗi ngày" value={form.exampleVi} />
            </>
          )}
        </div>

        <div className="grid min-h-96 place-items-center rounded-[2rem] border border-dashed border-teal-300 bg-teal-50/60 p-6 text-center">
          <div>
            {previewWord.term ? (
              <>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-600">Preview thẻ học</p>
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
        {isSaving ? "Đang lưu..." : showImport ? "Import vào bộ từ" : "Lưu vào bộ từ"}
      </button>
    </form>
  );
}
