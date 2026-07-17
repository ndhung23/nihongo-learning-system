import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const rootDir = process.cwd();
const env = readEnv(path.join(rootDir, ".env"));
const mongoUri = env.MONGODB_URI;
const dbName = env.MONGODB_DB || "nihongo_learning_system";
const dataPath = path.join(rootDir, "scripts", "data", "vnjpclub-minna-n5-lessons.json");
const deckSlug = "tu-vung-n5-minna-no-nihongo-1-25";

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI in .env");
}

if (!fs.existsSync(dataPath)) {
  throw new Error(`Missing data file: ${dataPath}`);
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
    tags: { type: [String], default: [] },
    lesson: { type: Number, min: 1, max: 99, index: true },
    sourceUrl: { type: String },
    audioUrl: { type: String },
    imageUrl: { type: String },
    source: { type: String, enum: ["system", "user", "ai"], default: "user" },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true },
);

vocabularySchema.index({ deckId: 1, term: 1 }, { unique: true, sparse: true });
vocabularySchema.index({ deckId: 1, lesson: 1 });

const Deck = mongoose.models.Deck || mongoose.model("Deck", deckSchema);
const Vocabulary = mongoose.models.Vocabulary || mongoose.model("Vocabulary", vocabularySchema);

await mongoose.connect(mongoUri, { dbName });

const lessons = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const rows = lessons.flatMap((lesson) => lesson.rows.map((row) => ({ ...row, sourceUrl: lesson.url })));

const deck = await Deck.findOneAndUpdate(
  { slug: deckSlug },
  {
    $set: {
      title: "Từ vựng N5 - Minna no Nihongo 1-25",
      description: "Bộ từ vựng N5 theo Minna no Nihongo bài 1 đến 25, có lựa chọn học từng bài hoặc học toàn bộ.",
      level: "n5",
      languagePair: { source: "ja", target: "vi" },
      sourceType: "system",
      visibility: "public",
      status: "published",
      price: { amount: 0, currency: "VND" },
      tags: ["N5", "Minna", "Vocabulary", "VNJPCLUB"],
    },
  },
  { upsert: true, new: true, setDefaultsOnInsert: true },
);

const operations = rows
  .map((row) => {
    const term = clean(row.kanji) || clean(row.kana);
    const kana = clean(row.kana);
    const romaji = kanaToRomaji(kana);
    const meaningVi = clean(row.meaningVi);
    const lesson = Number(row.lesson);
    const hanViet = clean(row.hanViet);

    if (!term || !meaningVi || !Number.isInteger(lesson)) {
      return null;
    }

    return {
      updateOne: {
        filter: { deckId: deck._id, term },
        update: {
          $set: {
            kana,
            romaji,
            meaningVi,
            partOfSpeech: hanViet || `Bài ${lesson}`,
            level: "n5",
            source: "system",
            isPublished: true,
            lesson,
            sourceUrl: clean(row.sourceUrl),
            audioUrl: clean(row.audioUrl),
            tags: ["N5", "Minna", `Bài ${lesson}`, "VNJPCLUB"],
          },
          $addToSet: {
            collocations: { $each: ["Minna no Nihongo", `Bài ${lesson}`, hanViet].filter(Boolean) },
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
    };
  })
  .filter(Boolean);

let matched = 0;
let upserted = 0;

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
      lessons: lessons.length,
      sourceRows: rows.length,
      operations: operations.length,
      matched,
      upserted,
      vocabularyCount,
    },
    null,
    2,
  ),
);

await mongoose.disconnect();

function clean(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function kanaToRomaji(value) {
  const kana = toHiragana(value)
    .normalize("NFKC")
    .replace(/[~\uff5e]/g, "")
    .replace(/\[[^\]]*\]/g, "");
  const digraphs = {
    "\u304d\u3083": "kya",
    "\u304d\u3085": "kyu",
    "\u304d\u3087": "kyo",
    "\u304e\u3083": "gya",
    "\u304e\u3085": "gyu",
    "\u304e\u3087": "gyo",
    "\u3057\u3083": "sha",
    "\u3057\u3085": "shu",
    "\u3057\u3087": "sho",
    "\u3058\u3083": "ja",
    "\u3058\u3085": "ju",
    "\u3058\u3087": "jo",
    "\u3061\u3083": "cha",
    "\u3061\u3085": "chu",
    "\u3061\u3087": "cho",
    "\u306b\u3083": "nya",
    "\u306b\u3085": "nyu",
    "\u306b\u3087": "nyo",
    "\u3072\u3083": "hya",
    "\u3072\u3085": "hyu",
    "\u3072\u3087": "hyo",
    "\u3073\u3083": "bya",
    "\u3073\u3085": "byu",
    "\u3073\u3087": "byo",
    "\u3074\u3083": "pya",
    "\u3074\u3085": "pyu",
    "\u3074\u3087": "pyo",
    "\u307f\u3083": "mya",
    "\u307f\u3085": "myu",
    "\u307f\u3087": "myo",
    "\u308a\u3083": "rya",
    "\u308a\u3085": "ryu",
    "\u308a\u3087": "ryo",
  };
  const singles = {
    "\u3042": "a",
    "\u3044": "i",
    "\u3046": "u",
    "\u3048": "e",
    "\u304a": "o",
    "\u304b": "ka",
    "\u304d": "ki",
    "\u304f": "ku",
    "\u3051": "ke",
    "\u3053": "ko",
    "\u304c": "ga",
    "\u304e": "gi",
    "\u3050": "gu",
    "\u3052": "ge",
    "\u3054": "go",
    "\u3055": "sa",
    "\u3057": "shi",
    "\u3059": "su",
    "\u305b": "se",
    "\u305d": "so",
    "\u3056": "za",
    "\u3058": "ji",
    "\u305a": "zu",
    "\u305c": "ze",
    "\u305e": "zo",
    "\u305f": "ta",
    "\u3061": "chi",
    "\u3064": "tsu",
    "\u3066": "te",
    "\u3068": "to",
    "\u3060": "da",
    "\u3062": "ji",
    "\u3065": "zu",
    "\u3067": "de",
    "\u3069": "do",
    "\u306a": "na",
    "\u306b": "ni",
    "\u306c": "nu",
    "\u306d": "ne",
    "\u306e": "no",
    "\u306f": "ha",
    "\u3072": "hi",
    "\u3075": "fu",
    "\u3078": "he",
    "\u307b": "ho",
    "\u3070": "ba",
    "\u3073": "bi",
    "\u3076": "bu",
    "\u3079": "be",
    "\u307c": "bo",
    "\u3071": "pa",
    "\u3074": "pi",
    "\u3077": "pu",
    "\u307a": "pe",
    "\u307d": "po",
    "\u307e": "ma",
    "\u307f": "mi",
    "\u3080": "mu",
    "\u3081": "me",
    "\u3082": "mo",
    "\u3084": "ya",
    "\u3086": "yu",
    "\u3088": "yo",
    "\u3089": "ra",
    "\u308a": "ri",
    "\u308b": "ru",
    "\u308c": "re",
    "\u308d": "ro",
    "\u308f": "wa",
    "\u3092": "o",
    "\u3093": "n",
    "\u30fc": "-",
  };
  let result = "";
  let doubleNext = false;

  for (let index = 0; index < kana.length; index += 1) {
    const character = kana[index];

    if (character === "\u3063") {
      doubleNext = true;
      continue;
    }

    const pair = kana.slice(index, index + 2);
    let romaji = digraphs[pair];

    if (romaji) {
      index += 1;
    } else {
      romaji = singles[character] || "";
    }

    if (!romaji) {
      continue;
    }

    if (doubleNext) {
      result += romaji[0];
      doubleNext = false;
    }

    result += romaji;
  }

  return result;
}

function toHiragana(value) {
  return value.replace(/[\u30a1-\u30f6]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60));
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
