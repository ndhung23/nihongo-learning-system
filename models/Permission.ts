import { Schema, model, models } from "mongoose";

const PermissionSchema = new Schema({
  key: { type: String, required: true, unique: true, trim: true, index: true },
  module: { type: String, required: true, trim: true, index: true },
  action: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  group: { type: String, required: true, trim: true },
}, { timestamps: true });

export const PermissionModel = models.Permission || model("Permission", PermissionSchema);
