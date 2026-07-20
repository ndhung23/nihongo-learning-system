import { Schema, model, models } from "mongoose";

const PaymentRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["ai", "vip"], required: true },
    amount: { type: Number, required: true, min: 1000 },
    aiCredits: { type: Number, required: true, min: 0 },
    vipMonths: { type: Number, required: true, min: 0 },
    transferCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    adminNote: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

PaymentRequestSchema.index({ userId: 1, createdAt: -1 });
PaymentRequestSchema.index({ status: 1, createdAt: -1 });

export const PaymentRequestModel =
  models.PaymentRequest || model("PaymentRequest", PaymentRequestSchema);
