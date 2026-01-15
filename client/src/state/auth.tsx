/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

type User = { id: number; phone: string };

type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const LS_TOKEN = "pwa_demo_token";

function getStoredToken() {
  try {
    return localStorage.getItem(LS_TOKEN);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null) {
  try {
    if (!token) localStorage.removeItem(LS_TOKEN);
    else localStorage.setItem(LS_TOKEN, token);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch<{ user: User }>("/api/me", { token });
      setUser(res.user);
    } catch {
      setStoredToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const login = useCallback(async (phone: string, code: string) => {
    const res = await apiFetch<{ token: string; user: User }>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    });
    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, loading, login, logout, refresh }),
    [token, user, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

