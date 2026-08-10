import { Schema, model, models } from "mongoose";

const SystemSettingSchema = new Schema({
  key: { type: String, required: true, unique: true, trim: true, index: true },
  value: { type: Schema.Types.Mixed },
  group: { type: String, default: "general", index: true },
  description: { type: String, default: "" },
  isPublic: { type: Boolean, default: false },
}, { timestamps: true });

export const SystemSettingModel = models.SystemSetting || model("SystemSetting", SystemSettingSchema);
