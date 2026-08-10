import { Schema, model, models } from "mongoose";

const RoadmapLessonSchema = new Schema({
  courseId: { type: Schema.Types.ObjectId, ref: "RoadmapCourse", required: true, index: true },
  order: { type: Number, required: true, min: 1 },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  youtubeUrl: { type: String, default: "", maxlength: 300 },
  creatorNote: { type: Schema.Types.Mixed, default: { type: "doc", content: [] } },
}, { timestamps: true });

RoadmapLessonSchema.index({ courseId: 1, order: 1 }, { unique: true });
export const RoadmapLessonModel = models.RoadmapLesson || model("RoadmapLesson", RoadmapLessonSchema);
