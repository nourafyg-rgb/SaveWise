import mongoose, { Schema } from "mongoose";

const authAttemptSchema = new Schema(
  {
    key: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { versionKey: false, collection: "savewise_auth_attempts" },
);

authAttemptSchema.index({ key: 1, createdAt: 1 });
authAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86_400 });

export const AuthAttemptModel =
  mongoose.models.SaveWiseAuthAttempt ??
  mongoose.model("SaveWiseAuthAttempt", authAttemptSchema);
