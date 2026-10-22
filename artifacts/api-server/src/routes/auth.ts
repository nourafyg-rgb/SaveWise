import mongoose from "mongoose";
import { Router, type IRouter, type Response } from "express";
import { connectMongo } from "../lib/mongo.js";
import {
  AuthSessionModel,
} from "../models/auth-session.js";
import { PasswordResetModel } from "../models/password-reset.js";
import { UserModel } from "../models/user.js";
import { DecisionModel } from "../models/decision.js";
import { SavingsGoalModel } from "../models/savings-goal.js";
import {
  LoginAuthAccountBody,
  LogoutAuthAccountBody,
  RegisterAuthAccountBody,
  ConfirmPasswordResetBody,
  RequestPasswordResetBody,
} from "@workspace/api-zod";
import {
  createOpaqueToken,
  hashPassword,
  hashToken,
  normalizeEmail,
  verifyPassword,
} from "../lib/passwords.js";
import { allowAuthAttempt, clearAuthAttempts } from "../lib/auth-rate-limit.js";
import {
  isPasswordResetEmailConfigured,
  sendPasswordResetEmail,
} from "../lib/password-reset-email.js";
import {
  ACCOUNT_ID_PREFIX,
  AUTH_COOKIE_NAME,
  authCookieOptions,
  makeAccountId,
  type AuthRequest,
} from "../middlewares/auth-session.js";

const router: IRouter = Router();
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_LIFETIME_MS = 60 * 60 * 1000;
const guestDataFilter = (sessionId: string) => ({
  sessionId,
  userId: { $not: new RegExp(`^${ACCOUNT_ID_PREFIX}`) },
});

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

function sendSessionCookie(
  response: Response,
  token: string,
): void {
  response.cookie(
    AUTH_COOKIE_NAME,
    token,
    authCookieOptions(process.env.NODE_ENV === "production"),
  );
}

function getSessionResponse(user: { id: string; email: string }) {
  return { authenticated: true, userId: user.id, email: user.email };
}

function getGuestSessionResponse() {
  return { authenticated: false, userId: null, email: null };
}

router.get("/auth/session", (req, res): void => {
  const user = (req as AuthRequest).saveWiseUser;
  res.json(user ? getSessionResponse(user) : getGuestSessionResponse());
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const body = RegisterAuthAccountBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const email = normalizeEmail(body.data.email);
  try {
    await connectMongo();
    await Promise.all([UserModel.init(), AuthSessionModel.init()]);
    if (!(await allowAuthAttempt("register", email, 8, 15 * 60 * 1000))) {
      res.status(429).json({ error: "Too many attempts. Please try again later." });
      return;
    }

    const passwordHash = await hashPassword(body.data.password);
    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
    const mongoSession = await mongoose.startSession();
    let createdUser: { _id: mongoose.Types.ObjectId; email: string } | undefined;
    try {
      await mongoSession.withTransaction(async () => {
        const [user] = await UserModel.create(
          [{ email, passwordHash }],
          { session: mongoSession },
        );
        createdUser = user;
        const accountId = makeAccountId(String(user._id));
        await DecisionModel.updateMany(
          guestDataFilter(body.data.sessionId),
          { $set: { userId: accountId } },
          { session: mongoSession },
        );
        await SavingsGoalModel.updateMany(
          guestDataFilter(body.data.sessionId),
          { $set: { userId: accountId } },
          { session: mongoSession },
        );
        await AuthSessionModel.create(
          [{
            userId: String(user._id),
            tokenHash: hashToken(token),
            expiresAt,
          }],
          { session: mongoSession },
        );
      });
    } finally {
      await mongoSession.endSession();
    }

    if (!createdUser) throw new Error("Account creation did not complete.");
    const user = {
      id: makeAccountId(String(createdUser._id)),
      email: createdUser.email,
    };
    sendSessionCookie(res, token);
    res.status(201).json(getSessionResponse(user));
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({
        error: "An account with this email already exists. Try signing in.",
      });
      return;
    }
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not create SaveWise account",
    );
    res.status(503).json({ error: "Account creation is temporarily unavailable." });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const body = LoginAuthAccountBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const email = normalizeEmail(body.data.email);
  try {
    await connectMongo();
    await Promise.all([UserModel.init(), AuthSessionModel.init()]);
    if (!(await allowAuthAttempt("login", email, 12, 15 * 60 * 1000))) {
      res.status(429).json({ error: "Too many attempts. Please try again later." });
      return;
    }

    const user = await UserModel.findOne({ email }).select("+passwordHash").exec();
    if (!user || !(await verifyPassword(body.data.password, user.passwordHash))) {
      res.status(401).json({ error: "Email or password is incorrect." });
      return;
    }

    const token = createOpaqueToken();
    await AuthSessionModel.create({
      userId: String(user._id),
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    });
    try {
      await clearAuthAttempts("login", email);
    } catch (error) {
      req.log.warn(
        { errorName: error instanceof Error ? error.name : "UnknownError" },
        "Could not clear SaveWise sign-in attempt counters",
      );
    }
    sendSessionCookie(res, token);
    res.json(getSessionResponse({
      id: makeAccountId(String(user._id)),
      email: user.email,
    }));
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not sign in to SaveWise",
    );
    res.status(503).json({ error: "Sign in is temporarily unavailable." });
  }
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const body = LogoutAuthAccountBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const authReq = req as AuthRequest;
  const token = authReq.cookies?.[AUTH_COOKIE_NAME];
  if (!authReq.saveWiseUser || typeof token !== "string") {
    res.status(401).json({ error: "No account session is active." });
    return;
  }

  try {
    await connectMongo();
    await AuthSessionModel.deleteOne({ tokenHash: hashToken(token) });

    res.clearCookie(
      AUTH_COOKIE_NAME,
      authCookieOptions(process.env.NODE_ENV === "production"),
    );
    res.json({ message: "Signed out.", sessionId: body.data.sessionId });
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not sign out of SaveWise",
    );
    res.status(503).json({ error: "Sign out is temporarily unavailable." });
  }
});

router.post("/auth/password-reset/request", async (req, res): Promise<void> => {
  const body = RequestPasswordResetBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (!isPasswordResetEmailConfigured()) {
    res.status(503).json({ error: "Password-reset email is not configured yet." });
    return;
  }

  const email = normalizeEmail(body.data.email);
  try {
    await connectMongo();
    await Promise.all([UserModel.init(), PasswordResetModel.init()]);
    if (!(await allowAuthAttempt("reset", email, 3, 60 * 60 * 1000))) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }

    const user = await UserModel.findOne({ email }).select("_id email").lean();
    if (!user) {
      res.status(202).json({
        message: "If an account exists for this email, reset instructions have been sent.",
      });
      return;
    }

    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_LIFETIME_MS);
    await PasswordResetModel.deleteMany({ userId: String(user._id) });
    await PasswordResetModel.create({
      userId: String(user._id),
      tokenHash: hashToken(token),
      expiresAt,
    });

    try {
      await sendPasswordResetEmail(user.email, token);
    } catch (error) {
      await PasswordResetModel.deleteOne({ tokenHash: hashToken(token) });
      req.log.error(
        { errorName: error instanceof Error ? error.name : "UnknownError" },
        "Could not send SaveWise password-reset email",
      );
      res.status(503).json({ error: "Could not send reset email. Please try again later." });
      return;
    }

    res.status(202).json({
      message: "If an account exists for this email, reset instructions have been sent.",
    });
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not process SaveWise password-reset request",
    );
    res.status(503).json({ error: "Password reset is temporarily unavailable." });
  }
});

router.post("/auth/password-reset/confirm", async (req, res): Promise<void> => {
  const body = ConfirmPasswordResetBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  try {
    await connectMongo();
    await Promise.all([
      PasswordResetModel.init(),
      UserModel.init(),
      AuthSessionModel.init(),
    ]);
    const resetFilter = {
      tokenHash: hashToken(body.data.token),
      usedAt: null,
      expiresAt: { $gt: new Date() },
    };
    const matchingReset = await PasswordResetModel.findOne(resetFilter).lean();
    if (!matchingReset) {
      res.status(400).json({ error: "This reset link is invalid or has expired." });
      return;
    }
    const passwordHash = await hashPassword(body.data.password);
    const mongoSession = await mongoose.startSession();
    let wasReset = false;
    try {
      await mongoSession.withTransaction(async () => {
        const reset = await PasswordResetModel.findOneAndUpdate(
          resetFilter,
          { $set: { usedAt: new Date() } },
          { new: false, session: mongoSession },
        ).lean();
        if (!reset) return;

        const userUpdate = await UserModel.updateOne(
          { _id: reset.userId },
          { $set: { passwordHash } },
          { session: mongoSession },
        );
        if (userUpdate.matchedCount !== 1) return;
        await AuthSessionModel.deleteMany(
          { userId: reset.userId },
          { session: mongoSession },
        );
        wasReset = true;
      });
    } finally {
      await mongoSession.endSession();
    }

    if (!wasReset) {
      res.status(400).json({ error: "This reset link is invalid or has expired." });
      return;
    }
    res.clearCookie(
      AUTH_COOKIE_NAME,
      authCookieOptions(process.env.NODE_ENV === "production"),
    );
    res.json({ message: "Password changed. Sign in with your new password." });
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not reset SaveWise password",
    );
    res.status(503).json({ error: "Password reset is temporarily unavailable." });
  }
});

export default router;
