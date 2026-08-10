import { Schema, model, models } from "mongoose";

const RoadmapProgressSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: "RoadmapCourse", required: true, index: true },
  completedLessonIds: { type: [Schema.Types.ObjectId], ref: "RoadmapLesson", default: [] },
  lastLessonId: { type: Schema.Types.ObjectId, ref: "RoadmapLesson" },
  lastAccessedAt: { type: Date, default: Date.now },
}, { timestamps: true });

RoadmapProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
export const RoadmapProgressModel = models.RoadmapProgress || model("RoadmapProgress", RoadmapProgressSchema);
