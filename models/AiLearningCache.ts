import { Schema, model, models } from "mongoose";

const AiLearningCacheSchema = new Schema(
  {
    cacheKey: { type: String, required: true, unique: true, index: true },
    term: { type: String, required: true, trim: true },
    kind: {
      type: String,
      required: true,
      enum: ["synonyms", "antonyms", "examples"],
    },
    result: { type: Schema.Types.Mixed, required: true },
    provider: { type: String, required: true },
    model: { type: String, required: true },
  },
  { timestamps: true },
);

export const AiLearningCacheModel =
  models.AiLearningCache || model("AiLearningCache", AiLearningCacheSchema);
