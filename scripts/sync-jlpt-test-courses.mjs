import { loadEnvFile } from "node:process";
import path from "node:path";
import mongoose from "mongoose";

if (!process.env.MONGODB_URI) {
  loadEnvFile(path.resolve(".env"));
}

if (!process.env.MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in .env or environment variables.");
}

const databaseName = process.env.MONGODB_DB || "nihongo_learning_system";

try {
  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
    dbName: databaseName,
  });

  const database = mongoose.connection.db;
  if (!database) {
    throw new Error("MongoDB connection has no active database.");
  }

  const tests = await database
    .collection("jlpt_tests")
    .find(
      {},
      {
        projection: {
          level: 1,
          number: 1,
          questionCount: 1,
          "sections.vocabularyKanji": 1,
          "sections.grammarReading": 1,
        },
      },
    )
    .sort({ level: -1, number: 1 })
    .toArray();

  if (tests.length === 0) {
    throw new Error("Collection jlpt_tests is empty. Import test data first.");
  }

  const now = new Date();
  const operations = tests.map((test) => {
    const level = String(test.level);
    const number = Number(test.number);
    const vocabularyCount = test.sections?.vocabularyKanji?.length ?? 0;
    const grammarReadingCount = test.sections?.grammarReading?.length ?? 0;

    return {
      updateOne: {
        filter: {
          contentType: "jlpt-test",
          "jlptTest.level": level,
          "jlptTest.number": number,
        },
        update: {
          $set: {
            title: `Đề thi ${level} minh họa số ${number}`,
            slug: `de-thi-${level.toLowerCase()}-minh-hoa-so-${number}`,
            description:
              "Luyện thi theo hai phần: Từ vựng + Kanji và Ngữ pháp + Reading.",
            level: level.toLowerCase(),
            languagePair: { source: "ja", target: "vi" },
            sourceType: "system",
            visibility: "public",
            status: "published",
            price: { amount: 0, currency: "VND" },
            "stats.vocabularyCount":
              Number(test.questionCount) ||
              vocabularyCount + grammarReadingCount,
            "stats.ratingAverage": 0,
            "stats.ratingCount": 0,
            tags: [
              "JLPT",
              level,
              "Test",
              "Từ vựng + Kanji",
              "Ngữ pháp + Reading",
            ],
            contentType: "jlpt-test",
            jlptTest: { level, number, testId: test._id },
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
            "stats.learnerCount": 900,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await database
    .collection("decks")
    .bulkWrite(operations, { ordered: true });

  await database.collection("decks").updateOne(
    { slug: "n5-test-ngu-phap-tu-vung-doc-hieu" },
    {
      $set: {
        status: "hidden",
        visibility: "private",
        updatedAt: now,
      },
    },
  );

  const summary = await database
    .collection("decks")
    .aggregate([
      { $match: { contentType: "jlpt-test" } },
      { $group: { _id: "$jlptTest.level", courses: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  console.log(
    JSON.stringify(
      {
        ok: true,
        database: database.databaseName,
        collection: "decks",
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
        totalCourses: summary.reduce((sum, item) => sum + item.courses, 0),
        levels: summary.map((item) => ({
          level: item._id,
          courses: item.courses,
        })),
      },
      null,
      2,
    ),
  );
} finally {
  await mongoose.disconnect();
}
