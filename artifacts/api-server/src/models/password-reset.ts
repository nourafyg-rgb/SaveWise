import mongoose, { Schema } from "mongoose";

const passwordResetSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { versionKey: false, collection: "savewise_password_resets" },
);

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
passwordResetSchema.index({ tokenHash: 1 }, { unique: true });

export const PasswordResetModel =
  mongoose.models.SaveWisePasswordReset ??
  mongoose.model("SaveWisePasswordReset", passwordResetSchema);
