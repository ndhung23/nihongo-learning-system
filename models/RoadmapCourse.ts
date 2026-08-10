import { Schema, model, models } from "mongoose";

const RoadmapCourseSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: "", trim: true, maxlength: 1000 },
  visibility: { type: String, enum: ["private", "unlisted", "public"], default: "private", index: true },
  slug: { type: String, required: true, unique: true, index: true },
  lessonCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

RoadmapCourseSchema.index({ visibility: 1, updatedAt: -1 });
export const RoadmapCourseModel = models.RoadmapCourse || model("RoadmapCourse", RoadmapCourseSchema);
