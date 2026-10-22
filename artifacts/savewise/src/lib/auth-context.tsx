import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSaveWiseSessionId, setSaveWiseSessionId } from "./session";

export interface AuthSession {
  authenticated: boolean;
  userId: string | null;
  email: string | null;
}

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  acceptSession: (session: AuthSession) => Promise<void>;
  refreshSession: () => Promise<AuthSession>;
  logout: () => Promise<void>;
}

const AUTH_QUERY_KEY = ["savewise-account-session"] as const;
const guestSession: AuthSession = {
  authenticated: false,
  userId: null,
  email: null,
};

async function fetchAuthSession(): Promise<AuthSession> {
  const response = await fetch("/api/auth/session", {
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error("Account status is temporarily unavailable.");
  }
  return response.json() as Promise<AuthSession>;
}

export async function requestAuth<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({})) as {
    error?: string;
  } & T;
  if (!response.ok) {
    throw new Error(result.error || "That request could not be completed.");
  }
  return result;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchAuthSession,
    retry: false,
    staleTime: 60_000,
  });

  const applySession = useCallback(async (session: AuthSession) => {
    await queryClient.cancelQueries();
    queryClient.clear();
    queryClient.setQueryData(AUTH_QUERY_KEY, session);
  }, [queryClient]);

  const refreshSession = useCallback(async () => {
    const session = await fetchAuthSession();
    queryClient.setQueryData(AUTH_QUERY_KEY, session);
    return session;
  }, [queryClient]);

  const logout = useCallback(async () => {
    const result = await requestAuth<{ message: string; sessionId: string }>(
      "logout",
      { sessionId: getSaveWiseSessionId() },
    );
    setSaveWiseSessionId(result.sessionId);
    await applySession(guestSession);
  }, [applySession]);

  const value = useMemo<AuthContextValue>(() => ({
    session: query.data ?? null,
    isLoading: query.isLoading,
    acceptSession: applySession,
    refreshSession,
    logout,
  }), [applySession, logout, query.data, query.isLoading, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
