import { Schema, model, models } from "mongoose";

const FeedbackSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    page: { type: String, trim: true },
    status: {
      type: String,
      enum: ["new", "reviewed", "archived"],
      default: "new",
    },
  },
  { timestamps: true },
);

FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ status: 1, createdAt: -1 });

export const FeedbackModel = models.Feedback || model("Feedback", FeedbackSchema);
