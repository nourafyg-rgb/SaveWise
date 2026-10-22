import type { Request } from "express";
import type { AuthRequest } from "../middlewares/auth-session.js";

export type SaveWiseScope = {
  sessionId: string;
  userId?: string;
};

export function getSaveWiseScope(
  request: Request,
  sessionId: string,
): SaveWiseScope {
  const userId = (request as AuthRequest).saveWiseUserId;
  return userId ? { sessionId, userId } : { sessionId };
}

export function getSaveWiseScopeFilter(scope: SaveWiseScope) {
  if (scope.userId) return { userId: scope.userId };
  return {
    sessionId: scope.sessionId,
    userId: { $not: /^swacct_/ },
  };
}
