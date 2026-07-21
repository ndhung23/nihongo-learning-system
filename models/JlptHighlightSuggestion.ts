import "server-only";

import { Schema, model, models } from "mongoose";

const JlptHighlightSuggestionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, trim: true, default: "" },
    level: { type: String, enum: ["N5", "N4", "N3", "N2", "N1"], required: true },
    testNumber: { type: Number, required: true, min: 1 },
    section: { type: String, enum: ["vocabularyKanji", "grammarReading"], required: true },
    questionId: { type: String, required: true, trim: true },
    prompt: { type: String, required: true },
    currentHighlightText: { type: String, default: "" },
    suggestedHighlightText: { type: String, required: true, trim: true },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

JlptHighlightSuggestionSchema.index({ status: 1, createdAt: -1 });

export const JlptHighlightSuggestionModel =
  models.JlptHighlightSuggestion ||
  model("JlptHighlightSuggestion", JlptHighlightSuggestionSchema);
