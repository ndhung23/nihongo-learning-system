import { Schema, model, models } from "mongoose";

const DailyUserActivitySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  dateKey: { type: String, required: true, index: true },
  lastSeenAt: { type: Date, required: true },
}, { timestamps: true });

DailyUserActivitySchema.index({ userId: 1, dateKey: 1 }, { unique: true });

export const DailyUserActivityModel = models.DailyUserActivity || model("DailyUserActivity", DailyUserActivitySchema);
