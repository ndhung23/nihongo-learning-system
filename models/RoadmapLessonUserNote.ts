import { Schema, model, models } from "mongoose";

const RoadmapLessonUserNoteSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: "RoadmapCourse", required: true, index: true },
  lessonId: { type: Schema.Types.ObjectId, ref: "RoadmapLesson", required: true, index: true },
  content: { type: Schema.Types.Mixed, default: { type: "doc", content: [] } },
}, { timestamps: true });

RoadmapLessonUserNoteSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
export const RoadmapLessonUserNoteModel = models.RoadmapLessonUserNote || model("RoadmapLessonUserNote", RoadmapLessonUserNoteSchema);
