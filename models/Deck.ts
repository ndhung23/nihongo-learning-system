import { Schema, model, models } from "mongoose";

const DeckSchema = new Schema(
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
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
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
    contentType: {
      type: String,
      enum: ["flashcard", "jlpt-test"],
      default: "flashcard",
      index: true,
    },
    jlptTest: {
      level: {
        type: String,
        enum: ["N5", "N4", "N3", "N2", "N1"],
      },
      number: { type: Number, min: 1 },
      testId: { type: Schema.Types.ObjectId, ref: "JlptTest" },
    },
  },
  { timestamps: true },
);

DeckSchema.index({ title: "text", description: "text", tags: "text" });
DeckSchema.index({ level: 1, status: 1, visibility: 1, sourceType: 1 });
DeckSchema.index(
  { "jlptTest.level": 1, "jlptTest.number": 1 },
  {
    unique: true,
    partialFilterExpression: { contentType: "jlpt-test" },
  },
);

export const DeckModel = models.Deck || model("Deck", DeckSchema);
