import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const rootDir = process.cwd();
const env = readEnv(path.join(rootDir, ".env"));
const mongoUri = env.MONGODB_URI;
const dbName = env.MONGODB_DB || "nihongo_learning_system";
const deckSlug = "n5-test-ngu-phap-tu-vung-doc-hieu";

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI in .env");
}

const deckSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: "" },
    level: { type: String, default: "custom" },
    languagePair: {
      source: { type: String, default: "ja" },
      target: { type: String, default: "vi" },
    },
    sourceType: { type: String, default: "system" },
    visibility: { type: String, default: "private" },
    status: { type: String, default: "draft" },
    price: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "VND" },
    },
    stats: {
      vocabularyCount: { type: Number, default: 0 },
      learnerCount: { type: Number, default: 0 },
      ratingAverage: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
    },
    tags: { type: [String], default: [] },
  },
  { timestamps: true },
);

const vocabularySchema = new mongoose.Schema(
  {
    deckId: { type: mongoose.Schema.Types.ObjectId, ref: "Deck", index: true },
    term: { type: String, required: true, trim: true },
    kana: { type: String, trim: true },
    romaji: { type: String, trim: true },
    meaningVi: { type: String, required: true, trim: true },
    partOfSpeech: { type: String, trim: true },
    level: { type: String, default: "custom" },
    examples: { type: Array, default: [] },
    distractors: { type: [String], default: [] },
    synonyms: { type: [String], default: [] },
    collocations: { type: [String], default: [] },
    wordFamily: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    lesson: { type: Number, index: true },
    sourceUrl: { type: String },
    source: { type: String, default: "system" },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

vocabularySchema.index({ deckId: 1, term: 1 }, { unique: true, sparse: true });

const Deck = mongoose.models.Deck || mongoose.model("Deck", deckSchema);
const Vocabulary = mongoose.models.Vocabulary || mongoose.model("Vocabulary", vocabularySchema);

const tests = Array.from({ length: 10 }, (_, index) => {
  const number = index + 1;
  const extended = number === 2 || number === 8;
  const vocabularyQuestions = extended ? 35 : 33;
  const grammarReadingQuestions = extended ? 32 : 31;

  return {
    number,
    totalQuestions: vocabularyQuestions + grammarReadingQuestions,
    vocabularyQuestions,
    grammarReadingQuestions,
    sourceUrl: `https://www.jlptpracticetest.com/n5/${number}`,
  };
});

await mongoose.connect(mongoUri, { dbName });

const deck = await Deck.findOneAndUpdate(
  { slug: deckSlug },
  {
    $set: {
      title: "N5 Test – Ngữ pháp, Từ vựng và Đọc hiểu",
      description:
        "Danh sách 10 đề luyện thi JLPT N5 miễn phí. Mỗi mục mở đề gốc trên JLPT Practice Test; nội dung câu hỏi không được sao chép vào hệ thống.",
      level: "n5",
      languagePair: { source: "ja", target: "vi" },
      sourceType: "system",
      visibility: "public",
      status: "published",
      price: { amount: 0, currency: "VND" },
      tags: ["N5", "JLPT", "Test", "Grammar", "Vocabulary", "Reading"],
    },
  },
  { upsert: true, new: true, setDefaultsOnInsert: true },
);

const operations = tests.map((test) => ({
  updateOne: {
    filter: { deckId: deck._id, term: `N5 模擬試験 ${test.number}` },
    update: {
      $set: {
        kana: `Đề luyện thi N5 số ${test.number}`,
        romaji: `N5 Practice Test ${test.number}`,
        meaningVi: `${test.totalQuestions} câu · Từ vựng & Kanji ${test.vocabularyQuestions} · Ngữ pháp & Đọc hiểu ${test.grammarReadingQuestions}`,
        partOfSpeech: "Đề luyện thi N5",
        level: "n5",
        lesson: test.number,
        sourceUrl: test.sourceUrl,
        source: "system",
        isPublished: true,
        tags: ["N5", "JLPT", "Practice Test", `Đề ${test.number}`],
      },
      $setOnInsert: {
        deckId: deck._id,
        examples: [],
        distractors: [],
        synonyms: [],
        collocations: [],
        wordFamily: [],
      },
    },
    upsert: true,
  },
}));

const result = await Vocabulary.bulkWrite(operations, { ordered: false });
const vocabularyCount = await Vocabulary.countDocuments({ deckId: deck._id });

await Deck.updateOne(
  { _id: deck._id },
  { $set: { "stats.vocabularyCount": vocabularyCount } },
);

console.log(
  JSON.stringify(
    {
      deckId: deck._id.toString(),
      deckSlug,
      matched: result.matchedCount,
      upserted: result.upsertedCount,
      vocabularyCount,
    },
    null,
    2,
  ),
);

await mongoose.disconnect();

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );
}
