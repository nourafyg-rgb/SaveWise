import { getAuth } from "@clerk/express";
import type { Request } from "express";

export type SaveWiseScope = {
  sessionId: string;
  userId?: string;
};

export function getSaveWiseScope(
  request: Request,
  sessionId: string,
): SaveWiseScope {
  const userId = getAuth(request).userId;
  return userId ? { sessionId, userId } : { sessionId };
}

export function getSaveWiseScopeFilter(scope: SaveWiseScope) {
  if (scope.userId) {
    return { userId: scope.userId };
  }

  return {
    sessionId: scope.sessionId,
    userId: { $exists: false as const },
  };
}
