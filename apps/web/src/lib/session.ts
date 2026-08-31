"use client";

/**
 * 认证会话存储：accessToken 放内存，refreshToken/sessionId 持久化到 localStorage。
 * 契约：AuthSession { accessToken, refreshToken, tokenType, expiresIn, sessionId, user }
 */

const STORAGE_KEY = "nodusfall.session.v1";

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  /** accessToken 过期时间戳（ms），由 expiresIn 换算 */
  expiresAt: number;
}

let memoryToken: string | null = null;

export function getAccessToken(): string | null {
  return memoryToken ?? loadStoredSession()?.accessToken ?? null;
}

export function getStoredSession(): StoredSession | null {
  return loadStoredSession();
}

export function saveSession(session: {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresIn: number;
}): void {
  memoryToken = session.accessToken;
  if (typeof window === "undefined") return;
  const stored: StoredSession = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    sessionId: session.sessionId,
    // 提前 30s 视为过期，留出刷新余量
    expiresAt: Date.now() + (session.expiresIn - 30) * 1000,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function clearSession(): void {
  memoryToken = null;
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

function loadStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}
