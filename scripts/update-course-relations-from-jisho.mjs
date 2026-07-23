import { loadEnvFile } from "node:process";
import mongoose from "mongoose";

loadEnvFile(".env");

const APPLY = process.argv.includes("--apply");
const limitArg = process.argv.find((argument) => argument.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0;
const deckArg = process.argv.find((argument) => argument.startsWith("--deck="));
const ONLY_DECK = deckArg ? deckArg.split("=")[1] : "";
const DECK_SLUGS = [
  "tu-vung-n5-minna-no-nihongo-1-25",
  "tu-vung-n4-minna-no-nihongo-26-50",
  "tu-vung-danh-cho-dan-it",
];

if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI.");

await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB || "nihongo_learning_system",
  serverSelectionTimeoutMS: 20_000,
});

const database = mongoose.connection.db;
const selectedSlugs = ONLY_DECK ? DECK_SLUGS.filter((slug) => slug.includes(ONLY_DECK)) : DECK_SLUGS;
const decks = await database.collection("decks").find({ slug: { $in: selectedSlugs } }).toArray();
const words = await database.collection("vocabularies").find({ deckId: { $in: decks.map((deck) => deck._id) } })
  .project({ term: 1, kana: 1, meaningVi: 1, deckId: 1, synonyms: 1, antonyms: 1 })
  .sort({ deckId: 1, lesson: 1, _id: 1 })
  .limit(LIMIT)
  .toArray();

const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
if (APPLY && words.length) {
  await database.collection("vocabulary_relation_backups").insertMany(words.map((word) => ({
    runId,
    vocabularyId: word._id,
    deckId: word.deckId,
    synonyms: word.synonyms || [],
    antonyms: word.antonyms || [],
    backedUpAt: new Date(),
  })), { ordered: false });
}

const stats = { candidates: words.length, matched: 0, withRelated: 0, withAntonyms: 0, updated: 0, failed: 0, previews: [] };

for (let offset = 0; offset < words.length; offset += 16) {
  const batch = words.slice(offset, offset + 16);
  const results = await Promise.all(batch.map((word) => lookupRelations(word)));
  const operations = [];

  for (let index = 0; index < batch.length; index += 1) {
    const word = batch[index];
    const result = results[index];
    if (!result) { stats.failed += 1; continue; }
    stats.matched += 1;
    if (result.synonyms.length) stats.withRelated += 1;
    if (result.antonyms.length) stats.withAntonyms += 1;
    if (stats.previews.length < 30 && (result.synonyms.length || result.antonyms.length)) {
      stats.previews.push({ term: word.term, synonyms: result.synonyms, antonyms: result.antonyms });
    }
    operations.push({
      updateOne: {
        filter: { _id: word._id },
        update: { $set: { synonyms: result.synonyms, antonyms: result.antonyms } },
      },
    });
  }

  if (APPLY && operations.length) {
    const updateResult = await database.collection("vocabularies").bulkWrite(operations, { ordered: false });
    stats.updated += updateResult.modifiedCount;
  }
  console.log(JSON.stringify({ progress: Math.min(offset + batch.length, words.length), ...stats }));
}

console.log(JSON.stringify({ ok: true, apply: APPLY, runId, ...stats }, null, 2));
await mongoose.disconnect();

async function lookupRelations(word) {
  const keyword = normalizeKeyword(word.term, word.kana);
  try {
    const response = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const entries = Array.isArray(payload.data) ? payload.data : [];
    const entry = findExactEntry(entries, keyword, word.kana);
    if (!entry) return { synonyms: [], antonyms: [] };

    const primarySense = entry.senses?.[0];
    if (!primarySense) return { synonyms: [], antonyms: [] };
    const definition = primarySense.english_definitions?.[0] || "";
    const synonyms = await lookupSameDefinition(definition, primarySense.parts_of_speech || [], word);
    const antonyms = uniqueRelations(primarySense.antonyms || [], word);
    return { synonyms: synonyms.slice(0, 8), antonyms: antonyms.slice(0, 8) };
  } catch {
    return null;
  }
}

function findExactEntry(entries, term, kana) {
  const normalizedTerm = normalize(term);
  const normalizedKana = normalize(kana || "");
  return entries.find((entry) => (entry.japanese || []).some((form) =>
    normalize(form.word || "") === normalizedTerm ||
    normalize(form.reading || "") === normalizedTerm ||
    (normalizedKana && normalize(form.reading || "") === normalizedKana) ||
    sharesJapaneseStem(normalizedTerm, normalize(form.word || "")) ||
    sharesJapaneseStem(normalizedKana, normalize(form.reading || "")),
  ));
}

async function lookupSameDefinition(definition, partsOfSpeech, word) {
  const normalizedDefinition = String(definition || "").trim().toLowerCase();
  const genericDefinitions = new Set(["yes", "no", "person", "thing", "one", "day", "time", "place", "way", "to do", "to be"]);
  if (normalizedDefinition.length < 4 || genericDefinitions.has(normalizedDefinition)) return [];
  try {
    const response = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(normalizedDefinition)}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    const relations = [];
    for (const entry of payload.data || []) {
      const matchingSense = (entry.senses || []).find((sense) => {
        const sameDefinition = (sense.english_definitions || []).some((value) => value.trim().toLowerCase() === normalizedDefinition);
        const samePartOfSpeech = !partsOfSpeech.length || !(sense.parts_of_speech || []).length || (sense.parts_of_speech || []).some((value) => partsOfSpeech.includes(value));
        return sameDefinition && samePartOfSpeech;
      });
      if (!matchingSense) continue;
      const form = entry.japanese?.find((item) => item.word) || entry.japanese?.[0];
      const value = form?.word || form?.reading;
      if (value) relations.push(value);
    }
    return uniqueRelations(relations, word).slice(0, 5);
  } catch {
    return [];
  }
}

function sharesJapaneseStem(source, candidate) {
  if (!source || !candidate || !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(source)) return false;
  const stem = source.replace(/(いたします|されます|します|います|ります|ます)$/u, "");
  return stem.length >= 2 && candidate.startsWith(stem);
}

function uniqueRelations(values, word) {
  const ownForms = new Set([normalize(word.term), normalize(word.kana || "")]);
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)))
    .filter((value) => !ownForms.has(normalize(value)));
}

function normalizeKeyword(term, kana) {
  const value = String(term || "").split(/[,，、/]/)[0].replace(/\[[^\]]*\]/g, "").replace(/[～~]/g, "").trim();
  return value || String(kana || "").trim();
}

function normalize(value) {
  return String(value || "").normalize("NFKC").replace(/[\s～~・]/g, "");
}
