import { loadEnvFile } from "node:process";
import mongoose from "mongoose";

loadEnvFile(".env");

const APPLY = process.argv.includes("--apply");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const deckArg = process.argv.find((arg) => arg.startsWith("--deck="));
const ONLY_DECK = deckArg ? deckArg.split("=")[1] : "";
const batchArg = process.argv.find((arg) => arg.startsWith("--batch="));
const BATCH_SIZE = batchArg ? Math.max(1, Math.min(20, Number(batchArg.split("=")[1]))) : 20;
const RELAXED = process.argv.includes("--relaxed");
const DB_NAME = process.env.MONGODB_DB || "nihongo_learning_system";
const DECK_SLUGS = [
  "tu-vung-n5-minna-no-nihongo-1-25",
  "tu-vung-n4-minna-no-nihongo-26-50",
  "tu-vung-danh-cho-dan-it",
];
const MODELS = Array.from(new Set(["gemini-2.5-flash-lite", process.env.GEMINI_MODEL, "gemini-3.5-flash-lite"].filter(Boolean)));
const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.APIKEYGEMINI,
  ...Array.from({ length: 10 }, (_, index) => process.env[`GEMINI_API_KEY_${index + 1}`]),
].filter(Boolean);

if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI.");
if (!API_KEYS.length) throw new Error("Missing Gemini API key.");

await mongoose.connect(process.env.MONGODB_URI, {
  dbName: DB_NAME,
  serverSelectionTimeoutMS: 20_000,
});

const database = mongoose.connection.db;
const selectedSlugs = ONLY_DECK ? DECK_SLUGS.filter((slug) => slug.includes(ONLY_DECK)) : DECK_SLUGS;
const decks = await database.collection("decks").find({ slug: { $in: selectedSlugs } }).toArray();
const deckById = new Map(decks.map((deck) => [String(deck._id), deck]));
const words = await database.collection("vocabularies").find({
  deckId: { $in: decks.map((deck) => deck._id) },
  $or: [{ examples: { $exists: false } }, { examples: { $size: 0 } }],
}).sort({ deckId: 1, lesson: 1, _id: 1 }).limit(Number.isFinite(LIMIT) ? LIMIT : 0).toArray();

const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
const stats = { runId, candidates: words.length, jishoMatched: 0, generated: 0, skipped: 0, updated: 0, previews: [], failures: [] };

if (APPLY) {
  const backupRows = words.map((word) => ({
    runId,
    vocabularyId: word._id,
    deckId: word.deckId,
    examples: word.examples || [],
    backedUpAt: new Date(),
  }));
  if (backupRows.length) await database.collection("vocabulary_example_backups").insertMany(backupRows, { ordered: false });
}

for (let offset = 0; offset < words.length; offset += BATCH_SIZE) {
  const batch = words.slice(offset, offset + BATCH_SIZE);
  const references = await Promise.all(batch.map((word) => lookupJisho(word)));
  const matched = batch.map((word, index) => ({ word, reference: references[index] })).filter((item) => item.reference);
  stats.jishoMatched += matched.filter((item) => item.reference.verified).length;
  stats.skipped += batch.length - matched.length;
  if (!matched.length) continue;

  try {
    const generated = await generateExamples(matched);
    const operations = [];
    for (const item of matched) {
      const result = generated.find((entry) => entry.id === String(item.word._id));
      if (!isValidExample(item.word, result)) {
        stats.skipped += 1;
        continue;
      }
      const cleanJa = normalizeJapaneseSpacing(result.ja);
      stats.generated += 1;
      if (stats.previews.length < 20) stats.previews.push({ term: item.word.term, meaningVi: item.word.meaningVi, ja: cleanJa, vi: result.vi.trim(), jishoVerified: item.reference.verified, jisho: item.reference.url });
      operations.push({
        updateOne: {
          filter: { _id: item.word._id, $or: [{ examples: { $exists: false } }, { examples: { $size: 0 } }] },
          update: {
            $set: {
              examples: [{ ja: cleanJa, vi: result.vi.trim() }],
              sourceUrl: item.reference.url,
            },
          },
        },
      });
    }
    if (APPLY && operations.length) {
      const updateResult = await database.collection("vocabularies").bulkWrite(operations, { ordered: false });
      stats.updated += updateResult.modifiedCount;
    }
  } catch (error) {
    stats.failures.push({ offset, message: error instanceof Error ? error.message : String(error) });
  }

  console.log(JSON.stringify({ progress: Math.min(offset + batch.length, words.length), total: words.length, ...stats }));
}

console.log(JSON.stringify({ ok: true, apply: APPLY, ...stats }, null, 2));
await mongoose.disconnect();

async function lookupJisho(word) {
  const keyword = normalizeKeyword(word.term, word.kana);
  if (!keyword) return null;
  try {
    const response = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return null;
    const payload = await response.json();
    const candidates = Array.isArray(payload.data) ? payload.data : [];
    const normalizedKana = normalizeJapanese(word.kana || "");
    const normalizedTerm = normalizeJapanese(keyword);
    const entry = candidates.find((candidate) => candidate.japanese?.some((form) =>
      normalizeJapanese(form.word || "") === normalizedTerm ||
      normalizeJapanese(form.reading || "") === normalizedKana ||
      normalizeJapanese(form.reading || "") === normalizedTerm,
    )) || candidates[0];
    if (!entry) return fallbackJishoReference(keyword, word);
    const form = entry.japanese?.find((item) => item.word || item.reading) || {};
    return {
      headword: form.word || keyword,
      reading: form.reading || word.kana || "",
      definitions: (entry.senses || []).slice(0, 3).flatMap((sense) => sense.english_definitions || []).slice(0, 8),
      partsOfSpeech: (entry.senses || []).slice(0, 2).flatMap((sense) => sense.parts_of_speech || []).slice(0, 6),
      url: `https://jisho.org/search/${encodeURIComponent(keyword)}`,
      verified: true,
    };
  } catch {
    return fallbackJishoReference(keyword, word);
  }
}

async function generateExamples(items) {
  const input = items.map(({ word, reference }) => {
    const deck = deckById.get(String(word.deckId));
    return {
      id: String(word._id),
      course: deck?.level === "it" ? "IT" : String(deck?.level || "").toUpperCase(),
      lesson: word.lesson || null,
      term: word.term,
      kana: word.kana || "",
      meaningVi: word.meaningVi,
      jisho: reference,
    };
  });
  const prompt = `Bạn là biên tập viên giáo trình tiếng Nhật cho người Việt. Dữ liệu Jisho bên dưới chỉ dùng để xác minh mục từ, cách đọc, từ loại và sắc thái nghĩa.
Hãy viết MỘT câu ví dụ tiếng Nhật mới, tự nhiên và bản dịch Việt cho mỗi mục.
Quy tắc bắt buộc:
- Không sao chép câu từ từ điển hay nguồn khác.
- Câu N5 tối đa 28 ký tự và chỉ dùng ngữ pháp N5; N4 tối đa 36 ký tự và dùng ngữ pháp N5-N4.
- Câu IT tối đa 55 ký tự, tự nhiên trong công việc phần mềm/công nghệ.
- Câu phải thể hiện đúng meaningVi và đúng nghĩa Jisho tương ứng.
- Nếu term có nhiều cách viết phân cách bằng dấu phẩy, dùng đúng một cách viết tự nhiên.
- Nếu term có phần chú thích trong [] hoặc ký hiệu ～, dùng dạng hoàn chỉnh tự nhiên trong câu.
- Không thêm furigana, romaji hay giải thích.
- Viết câu Nhật theo chính tả tự nhiên, tuyệt đối không chèn khoảng trắng giữa các từ tiếng Nhật.
- Không gọi nghề nghiệp bằng hậu tố さん (không viết 医者さん, 先生さん...).
- Với mục IT ghi bằng tiếng Anh mà Jisho không có mục tương ứng, dùng thuật ngữ Nhật hoặc chữ viết tắt thông dụng trong câu.
- Bản dịch Việt là một câu đầy đủ, sát câu Nhật.
Trả về duy nhất JSON array: [{"id":"...","ja":"...","vi":"..."}].

Dữ liệu:
${JSON.stringify(input)}`;

  let lastError;
  for (const model of MODELS) {
    for (const key of API_KEYS) {
     try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationConfig: { responseMimeType: "application/json", temperature: 0.2 }, contents: [{ role: "user", parts: [{ text: prompt }] }] }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`);
      const payload = await response.json();
      const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Gemini response is not an array.");
      return parsed;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 800));
     }
    }
  }
  throw lastError || new Error("No AI provider response.");
}

function normalizeKeyword(term, kana) {
  const source = String(term || "").split(/[,，、/]/)[0].replace(/\[[^\]]*\]/g, "").replaceAll("～", "").trim();
  if (/\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Han}/u.test(source)) return source;
  const reading = String(kana || "").split(/[,，、/]/)[0].replace(/\[[^\]]*\]/g, "").replaceAll("～", "").trim();
  return /\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Han}/u.test(reading) ? reading : source;
}

function normalizeJapanese(value) {
  return String(value || "").normalize("NFKC").replace(/[\s～~・]/g, "");
}

function fallbackJishoReference(keyword, word) {
  return {
    headword: keyword,
    reading: word.kana || "",
    definitions: [],
    partsOfSpeech: [],
    url: `https://jisho.org/search/${encodeURIComponent(keyword)}`,
    verified: false,
  };
}

function normalizeJapaneseSpacing(value) {
  let result = String(value || "").trim();
  const japanese = "\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Han}";
  result = result.replace(new RegExp(`([${japanese}。、！？])\\s+(?=[${japanese}。、！？])`, "gu"), "$1");
  return result;
}

function isValidExample(word, result) {
  if (!result || typeof result.ja !== "string" || typeof result.vi !== "string") return false;
  const ja = normalizeJapaneseSpacing(result.ja), vi = result.vi.trim();
  if (ja.length < 3 || ja.length > 80 || vi.length < 3 || vi.length > 220) return false;
  if (!/[。！？]$/.test(ja) || !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(ja)) return false;
  if (RELAXED) return true;
  const deck = deckById.get(String(word.deckId));
  if (deck?.level === "it" && !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(word.term)) return true;
  const tokens = [normalizeKeyword(word.term, word.kana), String(word.kana || "").replace(/\[[^\]]*\]/g, "")].filter(Boolean);
  return tokens.some((token) => {
    const cleanToken = token.replaceAll("～", "").split(/[,，、/]/)[0].trim();
    if (cleanToken && ja.includes(cleanToken)) return true;
    const significant = [...cleanToken].filter((char) => /[\p{Script=Katakana}\p{Script=Han}]/u.test(char)).join("");
    return significant.length >= 2 && ja.includes(significant);
  });
}
