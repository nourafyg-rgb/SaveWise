import type { NextFunction, Request, Response } from "express";
import { connectMongo } from "../lib/mongo.js";
import { hashToken } from "../lib/passwords.js";
import { AuthSessionModel } from "../models/auth-session.js";
import { UserModel } from "../models/user.js";

export const AUTH_COOKIE_NAME = "savewise_session";
export const ACCOUNT_ID_PREFIX = "swacct_";
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthRequest extends Request {
  saveWiseUser?: { id: string; email: string };
  saveWiseUserId?: string;
}

export function authCookieOptions(production: boolean) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_LIFETIME_MS,
  };
}

export function makeAccountId(userObjectId: string): string {
  return `${ACCOUNT_ID_PREFIX}${userObjectId}`;
}

export async function optionalAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const req = request as AuthRequest;
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== "string" || token.length < 32) {
    next();
    return;
  }

  try {
    await connectMongo();
    const session = await AuthSessionModel.findOne({
      tokenHash: hashToken(token),
      expiresAt: { $gt: new Date() },
    }).lean();
    if (!session) {
      response.clearCookie(
        AUTH_COOKIE_NAME,
        authCookieOptions(process.env.NODE_ENV === "production"),
      );
      next();
      return;
    }

    const user = await UserModel.findById(session.userId)
      .select({ email: 1 })
      .lean();
    if (!user) {
      await AuthSessionModel.deleteOne({ _id: session._id });
      response.clearCookie(
        AUTH_COOKIE_NAME,
        authCookieOptions(process.env.NODE_ENV === "production"),
      );
      next();
      return;
    }

    req.saveWiseUser = {
      id: makeAccountId(String(user._id)),
      email: user.email,
    };
    req.saveWiseUserId = req.saveWiseUser.id;
    next();
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not validate SaveWise account session",
    );
    response.status(503).json({ error: "Account session is temporarily unavailable." });
  }
}
