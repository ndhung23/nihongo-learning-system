import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");
const env = readEnv(envPath);
const mongoUri = env.MONGODB_URI;
const dbName = env.MONGODB_DB || "nihongo_learning_system";

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI in .env");
}

const deckSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: "" },
    level: { type: String, enum: ["kana", "n5", "n4", "n3", "n2", "n1", "it", "custom"], default: "custom" },
    languagePair: {
      source: { type: String, default: "ja" },
      target: { type: String, default: "vi" },
    },
    sourceType: { type: String, enum: ["system", "user", "ai"], default: "system" },
    visibility: { type: String, enum: ["private", "public", "unlisted"], default: "private" },
    status: {
      type: String,
      enum: ["draft", "pending_review", "published", "rejected", "hidden", "archived"],
      default: "draft",
    },
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
    level: { type: String, enum: ["kana", "n5", "n4", "n3", "n2", "n1", "custom"], default: "custom" },
    examples: [
      {
        ja: { type: String, required: true },
        vi: { type: String },
      },
    ],
    distractors: { type: [String], default: [] },
    synonyms: { type: [String], default: [] },
    collocations: { type: [String], default: [] },
    wordFamily: { type: [String], default: [] },
    audioUrl: { type: String },
    imageUrl: { type: String },
    source: { type: String, enum: ["system", "user", "ai"], default: "user" },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true },
);

vocabularySchema.index({ deckId: 1, term: 1 }, { unique: true, sparse: true });

const Deck = mongoose.models.Deck || mongoose.model("Deck", deckSchema);
const Vocabulary = mongoose.models.Vocabulary || mongoose.model("Vocabulary", vocabularySchema);

const API_BASE = "https://tiengnhatit.com/api/v1";
const deckSlug = "tu-vung-danh-cho-dan-it";

await mongoose.connect(mongoUri, { dbName });

const categories = (await fetchJson(`${API_BASE}/categories`)).filter((category) => category.division === "it");
const deck = await Deck.findOneAndUpdate(
  { slug: deckSlug },
  {
    $set: {
      title: "Từ vựng dành cho dân IT",
      description:
        "Bộ từ vựng tiếng Nhật chuyên ngành IT, tổng hợp theo các chủ đề như lập trình, Git, bảo mật, network, dữ liệu, UI/UX và IT business.",
      level: "it",
      languagePair: { source: "ja", target: "vi" },
      sourceType: "system",
      visibility: "public",
      status: "published",
      price: { amount: 0, currency: "VND" },
      tags: ["IT", "Japanese", "Vocabulary", "TiengNhatIT"],
    },
  },
  { upsert: true, new: true, setDefaultsOnInsert: true },
);

let fetched = 0;
let matched = 0;
let upserted = 0;
const operations = [];

for (const category of categories) {
  const words = await fetchCategoryWords(category.slug);
  fetched += words.length;

  for (const word of words) {
    const term = clean(word.ja || word.en);
    const meaningVi = clean(word.vi || word.en || word.preview || term);

    if (!term || !meaningVi) {
      continue;
    }

    const categoryLabel = clean(category.name_vi || category.name_en || category.slug);
    const english = clean(word.en);
    const collocations = [categoryLabel, english].filter(Boolean);

    operations.push({
      updateOne: {
        filter: { deckId: deck._id, term },
        update: {
          $set: {
            kana: clean(word.ja_kana),
            romaji: clean(word.ja_romaji),
            meaningVi,
            partOfSpeech: english,
            level: "custom",
            source: "system",
            isPublished: true,
            imageUrl: word.image_attached ? clean(word.image) : undefined,
          },
          $addToSet: {
            collocations: { $each: collocations },
          },
          $setOnInsert: {
            deckId: deck._id,
            examples: [],
            distractors: [],
            synonyms: [],
            wordFamily: [],
          },
        },
        upsert: true,
      },
    });
  }
}

for (let index = 0; index < operations.length; index += 500) {
  const result = await Vocabulary.bulkWrite(operations.slice(index, index + 500), { ordered: false });
  matched += result.matchedCount || 0;
  upserted += result.upsertedCount || 0;
}

const vocabularyCount = await Vocabulary.countDocuments({ deckId: deck._id });
await Deck.updateOne({ _id: deck._id }, { $set: { "stats.vocabularyCount": vocabularyCount } });

console.log(
  JSON.stringify(
    {
      deckId: deck._id.toString(),
      deckSlug,
      categories: categories.length,
      fetched,
      upserted,
      matched,
      vocabularyCount,
    },
    null,
    2,
  ),
);

await mongoose.disconnect();

async function fetchCategoryWords(slug) {
  const wordsById = new Map();
  let page = 1;
  let totalPages = 1;

  do {
    const response = await fetch(`${API_BASE}/categories/${slug}?page=${page}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch category ${slug}: ${response.status}`);
    }

    const totalPagesHeader = Number(response.headers.get("total-pages"));
    if (Number.isFinite(totalPagesHeader) && totalPagesHeader > 0) {
      totalPages = totalPagesHeader;
    }

    const category = await response.json();
    for (const word of category.words || []) {
      wordsById.set(word.id || `${word.ja}-${word.en}`, word);
    }

    page += 1;
  } while (page <= totalPages);

  return Array.from(wordsById.values());
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.json();
}

function clean(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );
}
