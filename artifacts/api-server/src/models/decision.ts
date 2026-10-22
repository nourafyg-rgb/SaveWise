import mongoose, { Schema } from "mongoose";

export type DecisionAction = "buy" | "wait_24h" | "wait_7_days" | "skip";
export type DecisionStatus = "completed" | "waiting";
export type WaitingPeriod = "24h" | "7d" | null;

export type DecisionRecord = {
  sessionId: string;
  userId?: string;
  itemId: string;
  itemName: string;
  price: number;
  decision: DecisionAction;
  status: DecisionStatus;
  waitingPeriod: WaitingPeriod;
  waitUntil: Date | null;
  savedAmount: number;
  preparedContribution: number;
  simulatedContributionAt: Date | null;
  clientRequestId?: string;
  wasWaiting?: boolean;
  createdAt: Date;
  completedAt: Date | null;
};

const decisionSchema = new Schema<DecisionRecord>(
  {
    sessionId: { type: String, required: true, index: true },
    userId: { type: String, default: undefined },
    itemId: { type: String, required: true },
    itemName: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    decision: {
      type: String,
      required: true,
      enum: ["buy", "wait_24h", "wait_7_days", "skip"],
    },
    status: { type: String, required: true, enum: ["completed", "waiting"] },
    waitingPeriod: { type: String, enum: ["24h", "7d", null], default: null },
    waitUntil: { type: Date, default: null },
    savedAmount: { type: Number, required: true, default: 0 },
    preparedContribution: { type: Number, required: true, default: 0 },
    simulatedContributionAt: { type: Date, default: null },
    clientRequestId: { type: String, default: undefined },
    wasWaiting: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  {
    collection: "savewise_phase4_decisions",
    versionKey: false,
  },
);

decisionSchema.index(
  { sessionId: 1, clientRequestId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientRequestId: { $type: "string" } },
  },
);
decisionSchema.index(
  { userId: 1, clientRequestId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $type: "string" },
      clientRequestId: { $type: "string" },
    },
  },
);

export const DecisionModel =
  (mongoose.models.SaveWiseDecision as
    | mongoose.Model<DecisionRecord>
    | undefined) ??
  mongoose.model<DecisionRecord>("SaveWiseDecision", decisionSchema);
