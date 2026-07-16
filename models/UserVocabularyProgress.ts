import { Schema, model, models } from "mongoose";

const UserVocabularyProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    vocabularyId: { type: Schema.Types.ObjectId, ref: "Vocabulary", required: true },
    deckId: { type: Schema.Types.ObjectId, ref: "Deck" },
    status: {
      type: String,
      enum: ["new", "learning", "review", "mastered", "suspended"],
      default: "new",
    },
    srs: {
      easeFactor: { type: Number, default: 2.5 },
      intervalDays: { type: Number, default: 0 },
      repetition: { type: Number, default: 0 },
      dueAt: { type: Date, default: Date.now },
      lastReviewedAt: { type: Date },
    },
    stats: {
      correctCount: { type: Number, default: 0 },
      wrongCount: { type: Number, default: 0 },
    },
    notes: { type: String, default: "" },
    isBookmarked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

UserVocabularyProgressSchema.index({ userId: 1, vocabularyId: 1 }, { unique: true });
UserVocabularyProgressSchema.index({ userId: 1, "srs.dueAt": 1, status: 1 });

export const UserVocabularyProgressModel =
  models.UserVocabularyProgress || model("UserVocabularyProgress", UserVocabularyProgressSchema);
