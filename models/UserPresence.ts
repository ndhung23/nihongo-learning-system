import { Schema, model, models } from "mongoose";

const UserPresenceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  lastSeenAt: { type: Date, required: true, index: true },
  path: { type: String, default: "" },
}, { timestamps: true });

UserPresenceSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 86400 });

export const UserPresenceModel = models.UserPresence || model("UserPresence", UserPresenceSchema);
