import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true, versionKey: false, collection: "savewise_users" },
);

userSchema.index({ email: 1 }, { unique: true });

export const UserModel =
  mongoose.models.SaveWiseUser ??
  mongoose.model("SaveWiseUser", userSchema);
