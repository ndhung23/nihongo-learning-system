import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const args = Object.fromEntries(process.argv.slice(2).filter((arg) => arg.startsWith("--")).map((arg) => {
  const [key, ...value] = arg.slice(2).split("=");
  return [key, value.join("=") || true];
}));
const username = String(args.user || "user1").toLowerCase();
const apply = Boolean(args.apply);
const from = Number(args.from || 29);
const to = Number(args.to || 50);
const root = process.cwd();
const rawPath = path.join(root, "scripts", "data", "vnjpclub-minna-1998-lessons-29-50.raw.json");
const enrichedPath = path.join(root, "scripts", "data", "vnjpclub-minna-1998-lessons-29-50.enriched.json");
loadEnv(path.join(root, ".env"));

if (!process.env.MONGODB_URI) throw new Error("Thiếu MONGODB_URI trong .env");
if (!fs.existsSync(rawPath)) throw new Error(`Thiếu dữ liệu nguồn: ${rawPath}`);
if (from < 29 || to > 50 || from > to) throw new Error("Khoảng bài hợp lệ là 29-50.");

const rawLessons = JSON.parse(fs.readFileSync(rawPath, "utf8")).filter((item) => item.lesson >= from && item.lesson <= to);
const cache = fs.existsSync(enrichedPath) ? JSON.parse(fs.readFileSync(enrichedPath, "utf8")) : {};
const lessons = [];
const concurrency = Math.max(1, Math.min(5, Number(args.concurrency || 3)));
for (let offset = 0; offset < rawLessons.length; offset += concurrency) {
  const batch = await Promise.all(rawLessons.slice(offset, offset + concurrency).map(async (lesson) => {
    const source = normalizeRows(lesson);
    let words = Array.isArray(cache[lesson.lesson]) && cache[lesson.lesson].length === source.length ? cache[lesson.lesson] : null;
    if (!words) words = await enrichLesson(lesson.lesson, source);
    return { ...lesson, words };
  }));
  for (const lesson of batch) {
    cache[lesson.lesson] = lesson.words;
    lessons.push(lesson);
    console.log(`Bài ${lesson.lesson}: ${lesson.words.length} từ đã chuẩn hóa.`);
  }
  fs.writeFileSync(enrichedPath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

if (!apply) {
  console.log(JSON.stringify({ apply: false, username, lessons: lessons.length, words: lessons.reduce((sum, item) => sum + item.words.length, 0), enrichedPath }, null, 2));
  process.exit(0);
}

await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "nihongo_learning_system", serverSelectionTimeoutMS: 20_000 });
const db = mongoose.connection.db;
const user = await db.collection("users").findOne({ username });
if (!user) throw new Error(`Không tìm thấy tài khoản ${username}.`);

const result = [];
for (const lesson of lessons) {
  const title = `Bài ${lesson.lesson} - Minna No Nihongo - Từ vựng`;
  const slug = `personal-${user._id}-minna-1998-bai-${lesson.lesson}-tu-vung`;
  const deck = await db.collection("decks").findOneAndUpdate(
    { slug },
    {
      $set: {
        title,
        description: `Từ vựng Minna no Nihongo 1998 bài ${lesson.lesson}.`,
        level: "n4",
        languagePair: { source: "ja", target: "vi" },
        sourceType: "user",
        ownerId: user._id,
        visibility: "public",
        accessMode: "public",
        status: "published",
        price: { amount: 0, currency: "VND" },
        coinPrice: 0,
        tags: ["personal", "N4", "Minna 1998", `Bài ${lesson.lesson}`],
        contentType: "flashcard",
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date(), stats: { vocabularyCount: 0, learnerCount: 0, ratingAverage: 0, ratingCount: 0 }, allowedUserIds: [] },
    },
    { upsert: true, returnDocument: "after" },
  );
  const deckId = deck._id;
  const operations = lesson.words.map((word) => ({
    updateOne: {
      filter: { deckId, term: word.term },
      update: {
        $set: {
          kana: word.kana,
          romaji: word.romaji,
          partOfSpeech: word.partOfSpeech,
          meaningVi: word.meaningVi,
          examples: word.exampleJa ? [{ ja: word.exampleJa, vi: word.exampleVi }] : [],
          level: "n4",
          lesson: lesson.lesson,
          sourceUrl: lesson.url,
          audioUrl: word.audioUrl || "",
          source: "user",
          createdBy: user._id,
          isPublished: true,
          tags: ["N4", "Minna 1998", `Bài ${lesson.lesson}`],
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date(), deckId, distractors: [], synonyms: [], antonyms: [], collocations: [], wordFamily: [] },
      },
      upsert: true,
    },
  }));
  if (operations.length) await db.collection("vocabularies").bulkWrite(operations, { ordered: false });
  const count = await db.collection("vocabularies").countDocuments({ deckId });
  await db.collection("decks").updateOne({ _id: deckId }, { $set: { "stats.vocabularyCount": count } });
  result.push({ lesson: lesson.lesson, deckId: String(deckId), words: count });
}

console.log(JSON.stringify({ apply: true, username, decks: result.length, words: result.reduce((sum, item) => sum + item.words, 0), result }, null, 2));
await mongoose.disconnect();

function normalizeRows(lesson) {
  const seen = new Set();
  return lesson.rows.map((row) => {
    const kana = stripContext(row.kanaRaw);
    const term = stripContext(row.kanjiRaw) || kana;
    return { sourceIndex: row.row, term, kana, meaningVi: clean(row.meaningVi), hanViet: clean(row.hanViet), audioUrl: clean(row.audioUrl) };
  }).filter((word) => word.term && word.meaningVi && !seen.has(word.term) && seen.add(word.term));
}

async function enrichLesson(lesson, words) {
  const prompt = `Bạn là biên tập viên giáo trình tiếng Nhật N4 cho người Việt. Hãy chuẩn hóa đúng ${words.length} mục từ của Minna no Nihongo 1998 bài ${lesson}. Giữ nguyên sourceIndex, term, kana, meaningVi và audioUrl; chỉ sửa khoảng trắng/lỗi ký tự rõ ràng. Bổ sung romaji Hepburn, partOfSpeech ngắn gọn bằng tiếng Việt (động từ, danh từ, tính từ い, tính từ な, trạng từ, cụm từ...) và một câu ví dụ Nhật tự nhiên trình độ N5-N4 cùng bản dịch Việt. Không bỏ, gộp hoặc thêm mục. Trả duy nhất JSON object {"words":[...]}.\nDữ liệu:\n${JSON.stringify(words)}`;
  let payload;
  if (process.env.OPENAI_API_KEY) payload = await callOpenAI(prompt);
  else payload = await callGemini(prompt);
  if (!payload?.words || payload.words.length !== words.length) throw new Error(`AI trả sai số lượng ở bài ${lesson}: ${payload?.words?.length || 0}/${words.length}`);
  return payload.words.map((word, index) => ({
    ...words[index],
    term: clean(word.term) || words[index].term,
    kana: clean(word.kana) || words[index].kana,
    romaji: clean(word.romaji),
    partOfSpeech: clean(word.partOfSpeech) || inferPartOfSpeech(words[index]),
    meaningVi: clean(word.meaningVi) || words[index].meaningVi,
    exampleJa: clean(word.exampleJa),
    exampleVi: clean(word.exampleVi),
  }));
}

async function callOpenAI(prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_IMPORT_MODEL || "gpt-4.1-mini", temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) {
    if (geminiKeys().length) return callGemini(prompt);
    throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  return JSON.parse((await response.json()).choices[0].message.content);
}

async function callGemini(prompt) {
  let lastError;
  for (const key of geminiKeys()) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 32768 } }),
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) throw new Error(`Gemini ${response.status}`);
      const data = await response.json();
      return JSON.parse(data.candidates[0].content.parts.map((part) => part.text || "").join(""));
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error("Không có khóa AI để chuẩn hóa dữ liệu.");
}

function geminiKeys() {
  return [...new Set(Object.entries(process.env).filter(([name, value]) => value && (name === "APIKEYGEMINI" || name === "GEMINI_API_KEY" || /^GEMINI_API_KEY_\d+$/.test(name))).map(([, value]) => value))];
}

function stripContext(value) {
  return clean(value).normalize("NFKC").replace(/\[[^\]]*[~～][^\]]*\]/g, "").replace(/\[(?:な|い)\]$/g, "").replace(/[~～]/g, "").trim();
}

function inferPartOfSpeech(word) {
  if (/ます$/.test(word.kana)) return "động từ";
  if (/\[な\]/.test(word.kana)) return "tính từ な";
  if (/い$/.test(word.kana)) return "tính từ い";
  return "danh từ / cụm từ";
}

function clean(value) { return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}
