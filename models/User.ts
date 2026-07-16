import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, trim: true },
    avatarUrl: { type: String },
    roles: {
      type: [String],
      enum: ["user", "vip", "creator", "admin"],
      default: ["user"],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "banned", "pending_verify"],
      default: "pending_verify",
    },
    profile: {
      gender: { type: String, enum: ["male", "female", "other", "unknown"], default: "unknown" },
      birthday: { type: Date },
      phone: { type: String },
    },
    streak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastStudiedAt: { type: Date },
    },
    vipUntil: { type: Date },
    passwordReset: {
      tokenHash: { type: String },
      expiresAt: { type: Date },
      usedAt: { type: Date },
    },
  },
  { timestamps: true },
);

UserSchema.index({ username: "text", email: "text", displayName: "text" });

export const UserModel = models.User || model("User", UserSchema);
