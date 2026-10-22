import mongoose, { Schema } from "mongoose";

const authSessionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { versionKey: false, collection: "savewise_auth_sessions" },
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authSessionSchema.index({ tokenHash: 1 }, { unique: true });

export const AuthSessionModel =
  mongoose.models.SaveWiseAuthSession ??
  mongoose.model("SaveWiseAuthSession", authSessionSchema);
