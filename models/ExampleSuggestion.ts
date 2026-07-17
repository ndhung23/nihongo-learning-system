import { Schema, model, models } from "mongoose";

const ExampleSuggestionSchema = new Schema(
  {
    vocabularyId: { type: Schema.Types.ObjectId, ref: "Vocabulary", required: true, index: true },
    deckId: { type: Schema.Types.ObjectId, ref: "Deck", index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    username: { type: String, trim: true },
    term: { type: String, required: true, trim: true },
    meaningVi: { type: String, required: true, trim: true },
    suggestedJa: { type: String, required: true, trim: true, maxlength: 500 },
    suggestedVi: { type: String, trim: true, maxlength: 500 },
    note: { type: String, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

ExampleSuggestionSchema.index({ status: 1, createdAt: -1 });

export const ExampleSuggestionModel = models.ExampleSuggestion || model("ExampleSuggestion", ExampleSuggestionSchema);
