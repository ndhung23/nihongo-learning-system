import "server-only";

import { Schema, model, models } from "mongoose";

const CourseLearnerSchema = new Schema(
  {
    deckId: {
      type: Schema.Types.ObjectId,
      ref: "Deck",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    firstLearnedAt: { type: Date, default: Date.now },
    lastLearnedAt: { type: Date, default: Date.now },
  },
  {
    collection: "course_learners",
    timestamps: true,
  },
);

CourseLearnerSchema.index({ deckId: 1, userId: 1 }, { unique: true });
CourseLearnerSchema.index({ userId: 1, lastLearnedAt: -1 });

export const CourseLearnerModel =
  models.CourseLearner || model("CourseLearner", CourseLearnerSchema);
