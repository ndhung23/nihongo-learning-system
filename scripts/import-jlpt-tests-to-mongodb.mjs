import { readFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";
import path from "node:path";
import mongoose from "mongoose";

if (!process.env.MONGODB_URI) {
  loadEnvFile(path.resolve(".env"));
}

const mongoUri = process.env.MONGODB_URI;
const databaseName =
  process.env.MONGODB_DB || "nihongo_learning_system";

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI in .env or environment variables.");
}

const levels = ["n5", "n4", "n3", "n2", "n1"];

const QuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    group: { type: String, required: true },
    instruction: { type: String, default: "" },
    prompt: { type: String, required: true },
    highlightText: { type: String, default: "" },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true, min: 0, select: false },
    explanation: { type: String, default: "", select: false },
  },
  { _id: false },
);

const SectionDefinitionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    sourceGroups: { type: [String], default: [] },
  },
  { _id: false },
);

const TestSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ["N5", "N4", "N3", "N2", "N1"],
      required: true,
    },
    number: { type: Number, required: true, min: 1 },
    title: { type: String, required: true },
    sourceFile: { type: String, default: "" },
    sectionDefinitions: {
      vocabularyKanji: { type: SectionDefinitionSchema, required: true },
      grammarReading: { type: SectionDefinitionSchema, required: true },
    },
    sections: {
      vocabularyKanji: { type: [QuestionSchema], default: [] },
      grammarReading: { type: [QuestionSchema], default: [] },
    },
    questionCount: { type: Number, required: true, min: 1 },
    source: { type: String, default: "private-import" },
    importedAt: { type: Date, required: true },
  },
  { collection: "jlpt_tests", timestamps: true },
);

TestSchema.index({ level: 1, number: 1 }, { unique: true });

const JlptTest =
  mongoose.models.JlptTestImport ||
  mongoose.model("JlptTestImport", TestSchema);

function validateQuestion(question, context) {
  if (!Array.isArray(question.options) || question.options.length < 2) {
    throw new Error(`${context}: options are missing or invalid.`);
  }

  if (
    !Number.isInteger(question.correctIndex) ||
    question.correctIndex < 0 ||
    question.correctIndex >= question.options.length
  ) {
    throw new Error(`${context}: correctIndex is missing or out of range.`);
  }
}

async function loadDocuments() {
  const importedAt = new Date();
  const documents = [];

  for (const levelDirectory of levels) {
    const filePath = path.resolve(
      "scripts",
      "dethi",
      levelDirectory,
      "master-data.json",
    );
    const masterData = JSON.parse(await readFile(filePath, "utf8"));

    for (const test of masterData.tests) {
      const vocabularyKanji = test.sections.vocabularyKanji ?? [];
      const grammarReading = test.sections.grammarReading ?? [];
      const questions = [...vocabularyKanji, ...grammarReading];

      for (const question of questions) {
        validateQuestion(
          question,
          `${masterData.level} test ${test.number}, question ${question.id}`,
        );
      }

      documents.push({
        level: masterData.level,
        number: test.number,
        title: test.title,
        sourceFile: test.sourceFile ?? "",
        sectionDefinitions: masterData.sectionDefinitions,
        sections: { vocabularyKanji, grammarReading },
        questionCount: questions.length,
        source: "private-import",
        importedAt,
      });
    }
  }

  return documents;
}

let connectionOpened = false;

try {
  const documents = await loadDocuments();
  await mongoose.connect(mongoUri, {
    bufferCommands: false,
    dbName: databaseName,
  });
  connectionOpened = true;

  await JlptTest.syncIndexes();

  const result = await JlptTest.bulkWrite(
    documents.map((document) => ({
      replaceOne: {
        filter: { level: document.level, number: document.number },
        replacement: document,
        upsert: true,
      },
    })),
    { ordered: true },
  );

  const databaseSummary = await JlptTest.aggregate([
    {
      $group: {
        _id: "$level",
        tests: { $sum: 1 },
        questions: { $sum: "$questionCount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        database: mongoose.connection.name,
        collection: JlptTest.collection.collectionName,
        importedDocuments: documents.length,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
        levels: databaseSummary.map((item) => ({
          level: item._id,
          tests: item.tests,
          questions: item.questions,
        })),
      },
      null,
      2,
    ),
  );
} finally {
  if (connectionOpened) {
    await mongoose.disconnect();
  }
}
