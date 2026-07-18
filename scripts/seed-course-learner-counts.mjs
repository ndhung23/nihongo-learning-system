import { loadEnvFile } from "node:process";
import path from "node:path";
import mongoose from "mongoose";

if (!process.env.MONGODB_URI) {
  loadEnvFile(path.resolve(".env"));
}

if (!process.env.MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in .env or environment variables.");
}

try {
  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
    dbName: process.env.MONGODB_DB || "nihongo_learning_system",
  });

  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB connection has no active database.");

  const result = await database.collection("decks").updateMany(
    {
      status: "published",
      visibility: "public",
      $or: [
        { "stats.learnerCount": { $exists: false } },
        { "stats.learnerCount": { $lt: 900 } },
      ],
    },
    { $set: { "stats.learnerCount": 900, updatedAt: new Date() } },
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        baseline: 900,
      },
      null,
      2,
    ),
  );
} finally {
  await mongoose.disconnect();
}
