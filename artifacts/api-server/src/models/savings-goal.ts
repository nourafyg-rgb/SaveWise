import mongoose, { Schema } from "mongoose";

export type SavingsGoalRecord = {
  sessionId: string;
  userId?: string;
  createRequestId?: string;
  name: string;
  nameKey: string;
  targetAmount: number;
  currentAmount: number;
  contributions: { requestId: string; amount: number }[];
  completedAt: Date | null;
  completionBonusAwardedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const savingsGoalSchema = new Schema<SavingsGoalRecord>(
  {
    sessionId: { type: String, required: true, index: true },
    userId: { type: String, default: undefined },
    createRequestId: { type: String, default: undefined },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    nameKey: { type: String, required: true },
    targetAmount: { type: Number, required: true, min: 0.001 },
    currentAmount: { type: Number, required: true, min: 0, default: 0 },
    contributions: {
      type: [
        {
          requestId: { type: String, required: true },
          amount: { type: Number, required: true, min: 0.001 },
        },
      ],
      default: [],
    },
    completedAt: { type: Date, default: null },
    completionBonusAwardedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
  },
  {
    collection: "savewise_phase6_goals",
    versionKey: false,
  },
);

savingsGoalSchema.index(
  { sessionId: 1, createRequestId: 1 },
  {
    unique: true,
    partialFilterExpression: { createRequestId: { $type: "string" } },
  },
);
savingsGoalSchema.index(
  { sessionId: 1, nameKey: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);
savingsGoalSchema.index(
  { userId: 1, nameKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $type: "string" },
      deletedAt: null,
    },
  },
);
savingsGoalSchema.index(
  { userId: 1, createRequestId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $type: "string" },
      createRequestId: { $type: "string" },
    },
  },
);

export const SavingsGoalModel =
  (mongoose.models.SaveWiseSavingsGoal as
    | mongoose.Model<SavingsGoalRecord>
    | undefined) ??
  mongoose.model<SavingsGoalRecord>("SaveWiseSavingsGoal", savingsGoalSchema);
