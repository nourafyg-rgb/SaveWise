import type { Request } from "express";

export type SaveWiseScope = {
  sessionId: string;
};

export function getSaveWiseScope(
  _request: Request,
  sessionId: string,
): SaveWiseScope {
  return { sessionId };
}

export function getSaveWiseScopeFilter(scope: SaveWiseScope) {
  return { sessionId: scope.sessionId };
}
