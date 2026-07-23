import { loadEnvFile } from "node:process";
import mongoose from "mongoose";

loadEnvFile(".env");
await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB || "nihongo_learning_system",
  serverSelectionTimeoutMS: 20_000,
});

const database = mongoose.connection.db;
const deck = await database.collection("decks").findOne({ slug: "tu-vung-danh-cho-dan-it" });
if (!deck) throw new Error("IT deck not found.");

const words = await database.collection("vocabularies").find({ deckId: deck._id, "synonyms.0": { $exists: true } })
  .project({ term: 1, synonyms: 1, antonyms: 1 })
  .toArray();
const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
await database.collection("vocabulary_relation_backups").insertMany(words.map((word) => ({
  runId,
  vocabularyId: word._id,
  deckId: deck._id,
  synonyms: word.synonyms || [],
  antonyms: word.antonyms || [],
  backedUpAt: new Date(),
})), { ordered: false });

let removed = 0;
let kept = 0;
const operations = words.map((word) => {
  const synonyms = (word.synonyms || []).filter((candidate) => isSafeItRelation(word.term, candidate));
  removed += (word.synonyms || []).length - synonyms.length;
  kept += synonyms.length;
  return { updateOne: { filter: { _id: word._id }, update: { $set: { synonyms } } } };
});
if (operations.length) await database.collection("vocabularies").bulkWrite(operations, { ordered: false });

console.log(JSON.stringify({ ok: true, reviewedWords: words.length, kept, removed, backupRunId: runId }, null, 2));
await mongoose.disconnect();

function isSafeItRelation(source, candidate) {
  const left = normalize(source), right = normalize(candidate);
  if (!left || !right) return false;
  if (left.includes(right) || right.includes(left)) return true;
  if (isKatakana(left) && isKatakana(right)) return true;
  if (/[A-ZＡ-Ｚ]{2,}/u.test(candidate)) return true;
  const leftKanji = new Set([...left].filter((character) => /\p{Script=Han}/u.test(character)));
  const sharedKanji = [...new Set([...right].filter((character) => leftKanji.has(character)))];
  return sharedKanji.length >= 2;
}

function isKatakana(value) {
  return /^[\p{Script=Katakana}ー]+$/u.test(value);
}

function normalize(value) {
  return String(value || "").normalize("NFKC").replace(/[\s～~・,，、/]/g, "");
}
