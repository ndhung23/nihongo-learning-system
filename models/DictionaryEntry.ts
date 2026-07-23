import "server-only";

import { Schema, model, models } from "mongoose";

const CommunityMeaningSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, trim: true, default: "" },
    meaningVi: { type: String, required: true, trim: true, maxlength: 300 },
    createdAt: { type: Date, default: Date.now },
    isVisible: { type: Boolean, default: true },
  },
  { _id: true },
);

const DictionaryEntrySchema = new Schema(
  {
    lookupKey: { type: String, required: true, unique: true, index: true },
    term: { type: String, required: true, trim: true, index: true },
    reading: { type: String, trim: true, index: true },
    meaningsEn: { type: [String], default: [] },
    meaningViAi: { type: String, trim: true, maxlength: 1000, default: "" },
    translationProvider: { type: String, enum: ["google", "mymemory", "gemini", "none"], default: "none" },
    partOfSpeech: { type: String, trim: true, default: "" },
    jlpt: { type: String, trim: true, default: "" },
    sourceUrl: { type: String, trim: true, default: "" },
    examples: {
      type: [{
        ja: { type: String, required: true },
        vi: { type: String, default: "" },
        en: { type: String, default: "" },
        _id: false,
      }],
      default: [],
    },
    antonyms: { type: [String], default: [] },
    relatedWords: { type: [String], default: [] },
    audioUrl: { type: String, trim: true, default: "" },
    jotobaEnrichedAt: { type: Date },
    communityMeanings: { type: [CommunityMeaningSchema], default: [] },
    lastLookedUpAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "dictionary_entries" },
);

DictionaryEntrySchema.index({ term: 1, reading: 1 });

export const DictionaryEntryModel =
  models.DictionaryEntry || model("DictionaryEntry", DictionaryEntrySchema);
