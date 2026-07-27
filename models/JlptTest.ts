import "server-only";

import { Schema, model, models } from "mongoose";
import { TEST_LEVELS } from "@/lib/jlptTestLevels";

const JlptQuestionSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    group: { type: String, required: true, trim: true },
    instruction: { type: String, default: "" },
    prompt: { type: String, required: true },
    highlightText: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    audioUrl: { type: String, default: "" },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (options: string[]) => options.length >= 2,
        message: "A JLPT question must have at least two options.",
      },
    },
    correctIndex: {
      type: Number,
      required: true,
      min: 0,
      select: false,
    },
    explanation: {
      type: String,
      default: "",
      select: false,
    },
  },
  { _id: false },
);

const SectionDefinitionSchema = new Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    sourceGroups: { type: [String], default: [] },
  },
  { _id: false },
);

const JlptTestSchema = new Schema(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: TEST_LEVELS,
      required: true,
      index: true,
    },
    number: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    sourceFile: { type: String, default: "" },
    sectionDefinitions: {
      vocabularyKanji: { type: SectionDefinitionSchema, required: true },
      grammarReading: { type: SectionDefinitionSchema, required: true },
      listening: { type: SectionDefinitionSchema, required: false },
    },
    sections: {
      vocabularyKanji: { type: [JlptQuestionSchema], default: [] },
      grammarReading: { type: [JlptQuestionSchema], default: [] },
      listening: { type: [JlptQuestionSchema], default: [] },
    },
    questionCount: { type: Number, required: true, min: 1 },
    source: {
      type: String,
      enum: ["private-import"],
      default: "private-import",
    },
    importedAt: { type: Date, required: true },
  },
  {
    collection: "jlpt_tests",
    timestamps: true,
  },
);

JlptTestSchema.index({ level: 1, number: 1 }, { unique: true });
JlptTestSchema.index({ createdBy: 1, updatedAt: -1 });

export const JlptTestModel =
  models.JlptTest || model("JlptTest", JlptTestSchema);
