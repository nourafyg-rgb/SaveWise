import { createHash } from "node:crypto";
import { AuthAttemptModel } from "../models/auth-attempt.js";

function attemptKey(action: string, email: string): string {
  const emailHash = createHash("sha256").update(email).digest("hex");
  return `${action}:${emailHash}`;
}

export async function allowAuthAttempt(
  action: string,
  email: string,
  maxAttempts: number,
  windowMs: number,
): Promise<boolean> {
  const key = attemptKey(action, email);
  const cutoff = new Date(Date.now() - windowMs);
  const count = await AuthAttemptModel.countDocuments({
    key,
    createdAt: { $gte: cutoff },
  });
  if (count >= maxAttempts) return false;
  await AuthAttemptModel.create({ key });
  return true;
}

export async function clearAuthAttempts(action: string, email: string): Promise<void> {
  await AuthAttemptModel.deleteMany({ key: attemptKey(action, email) });
}
