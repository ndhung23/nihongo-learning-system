import { Schema, model, models } from "mongoose";

const AuditLogSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  action: { type: String, required: true, index: true },
  resource: { type: String, required: true, index: true },
  resourceId: { type: String, default: "" },
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
}, { timestamps: true });

AuditLogSchema.index({ createdAt: -1 });
export const AuditLogModel = models.AuditLog || model("AuditLog", AuditLogSchema);
