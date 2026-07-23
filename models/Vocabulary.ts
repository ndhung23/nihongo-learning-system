import { Schema, model, models } from "mongoose";

const VocabularySchema = new Schema(
  {
    deckId: { type: Schema.Types.ObjectId, ref: "Deck", index: true },
    term: { type: String, required: true, trim: true },
    kana: { type: String, trim: true },
    romaji: { type: String, trim: true },
    meaningVi: { type: String, required: true, trim: true },
    partOfSpeech: { type: String, trim: true },
    level: { type: String, enum: ["kana", "n5", "n4", "n3", "n2", "n1", "custom"], default: "custom" },
    examples: [
      {
        ja: { type: String, required: true },
        vi: { type: String },
      },
    ],
    distractors: { type: [String], default: [] },
    synonyms: { type: [String], default: [] },
    antonyms: { type: [String], default: [] },
    collocations: { type: [String], default: [] },
    wordFamily: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    lesson: { type: Number, min: 1, max: 99, index: true },
    sourceUrl: { type: String },
    audioUrl: { type: String },
    imageUrl: { type: String },
    source: { type: String, enum: ["system", "user", "ai"], default: "user" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true },
);

VocabularySchema.index({ term: "text", kana: "text", romaji: "text", meaningVi: "text" });
VocabularySchema.index({ deckId: 1, term: 1 }, { unique: true, sparse: true });
VocabularySchema.index({ deckId: 1, lesson: 1 });
VocabularySchema.index({ deckId: 1, createdAt: -1 });
VocabularySchema.index({ deckId: 1, lesson: 1, createdAt: -1 });
VocabularySchema.index({ term: 1 });
VocabularySchema.index({ kana: 1 });
VocabularySchema.index({ romaji: 1 });

export const VocabularyModel = models.Vocabulary || model("Vocabulary", VocabularySchema);
