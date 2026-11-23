"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AUTH_CHECK_MS, type PublicUser } from "@/lib/auth-config";
import { clearStoredTypingHistory } from "@/lib/typing-progress";

type AuthState = {
  user: PublicUser | null;
  ready: boolean;
  setUser: (user: PublicUser | null) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing");
  return value;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  const validate = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/refresh", { method: "POST" });
      if (response.status === 401) {
        clearStoredTypingHistory();
        setUser(null);
      } else if (response.ok) {
        const body = (await response.json()) as { user?: PublicUser };
        setUser(body.user ?? null);
      }
      setReady(true);
    } catch {
      // Keep the server-rendered sign-in. The next 5-minute check tries again.
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void validate(), 0);
    const interval = window.setInterval(() => void validate(), AUTH_CHECK_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [validate]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      clearStoredTypingHistory();
      setUser(null);
      setReady(true);
    }
  }, []);

  const value = useMemo(() => ({ user, ready, setUser, signOut }), [user, ready, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
