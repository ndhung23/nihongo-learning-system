import { Schema, model, models } from "mongoose";

const AffiliateProductSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: "", trim: true, maxlength: 1200 },
  level: { type: String, default: "", trim: true, maxlength: 40 },
  imageUrl: { type: String, default: "", trim: true, maxlength: 2000 },
  affiliateUrl: { type: String, default: "", trim: true, maxlength: 2000 },
  price: { type: Number, min: 0 },
  originalPrice: { type: Number, min: 0 },
  accent: { type: String, enum: ["rose", "teal", "violet", "amber", "blue"], default: "rose" },
  isActive: { type: Boolean, default: false, index: true },
  sortOrder: { type: Number, default: 0, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

AffiliateProductSchema.index({ isActive: 1, sortOrder: 1, createdAt: -1 });
export const AffiliateProductModel = models.AffiliateProduct || model("AffiliateProduct", AffiliateProductSchema);
