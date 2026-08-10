import { Schema, model, models } from "mongoose";

const RoleSchema = new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
  description: { type: String, default: "", trim: true },
  permissions: { type: [String], default: [] },
  isSystem: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

export const RoleModel = models.Role || model("Role", RoleSchema);
