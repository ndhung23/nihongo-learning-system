import { Schema, model, models } from "mongoose";

const ReviewLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    vocabularyId: { type: Schema.Types.ObjectId, ref: "Vocabulary", required: true },
    deckId: { type: Schema.Types.ObjectId, ref: "Deck" },
    mode: {
      type: String,
      enum: ["meaning", "flashcard", "typing", "dictation", "example"],
      required: true,
    },
    result: { type: String, enum: ["again", "hard", "good", "easy", "correct", "wrong"], required: true },
    answer: { type: String },
    durationMs: { type: Number },
    reviewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

ReviewLogSchema.index({ userId: 1, reviewedAt: -1 });
ReviewLogSchema.index({ vocabularyId: 1, reviewedAt: -1 });

export const ReviewLogModel = models.ReviewLog || model("ReviewLog", ReviewLogSchema);
