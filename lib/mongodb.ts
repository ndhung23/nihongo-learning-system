import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI;

const cached = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

export async function connectMongoDB() {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI in environment variables.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  cached.promise ??= mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    dbName: process.env.MONGODB_DB || "nihongo_learning_system",
    maxPoolSize: Math.max(Number(process.env.MONGODB_MAX_POOL_SIZE || 40), 5),
    minPoolSize: Math.max(Number(process.env.MONGODB_MIN_POOL_SIZE || 5), 0),
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 30_000,
    waitQueueTimeoutMS: 5_000,
  });

  cached.conn = await cached.promise;
  return cached.conn;
}
