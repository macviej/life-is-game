import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
}

export interface AuthContextValue {
  user: AppUser | null;
  token: string | null;
  loading: boolean;
  authError: string | null;
  isConfigured: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  clearAuthError: () => void;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<boolean>;
  signOutUser: () => Promise<void>;
}

const TOKEN_STORAGE_KEY = 'life_is_game_auth_token_v1';
const USER_STORAGE_KEY = 'life_is_game_auth_user_v1';
const GAME_STORAGE_KEY = 'life_is_game_solis_v2';

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredAuth(): { token: string | null; user: AppUser | null } {
  try {
    if (typeof window === 'undefined') return { token: null, user: null };
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const rawUser = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!token || !rawUser) return { token: null, user: null };
    const user = JSON.parse(rawUser) as AppUser;
    if (!user?.uid || !user?.email) return { token: null, user: null };
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = loadStoredAuth();
  const [user, setUser] = useState<AppUser | null>(initial.user);
  const [token, setToken] = useState<string | null>(initial.token);
  const [loading, setLoading] = useState<boolean>(Boolean(initial.token));
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Проверка валидности сохранённого токена на сервере Postgres
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { user?: AppUser | null };
          if (data.user) {
            setUser(data.user);
            window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
          } else {
            setUser(null);
            setToken(null);
            window.localStorage.removeItem(TOKEN_STORAGE_KEY);
            window.localStorage.removeItem(USER_STORAGE_KEY);
          }
        } else if (res.status === 401) {
          setUser(null);
          setToken(null);
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          window.localStorage.removeItem(USER_STORAGE_KEY);
        }
      } catch {
        // Оффлайн режим — сохраняем текущую сессию локально
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setAuthError(null);
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'login',
            email: email.trim(),
            password,
          }),
        });
        const data = (await res.json()) as {
          token?: string;
          user?: AppUser;
          error?: string;
        };

        if (!res.ok || !data.token || !data.user) {
          setAuthError(data.error || 'Неверный email или пароль.');
          return false;
        }

        window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setIsAuthModalOpen(false);
        return true;
      } catch {
        setAuthError('Не удалось подключиться к серверу. Проверь интернет.');
        return false;
      }
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName?: string): Promise<boolean> => {
      setAuthError(null);
      try {
        let initialState: unknown = null;
        try {
          const raw = window.localStorage.getItem(GAME_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (displayName?.trim() && parsed && typeof parsed === 'object') {
              parsed.playerName = displayName.trim();
            }
            initialState = parsed;
          }
        } catch {
          initialState = null;
        }

        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register',
            email: email.trim(),
            password,
            displayName: displayName?.trim() || undefined,
            initialState,
          }),
        });
        const data = (await res.json()) as {
          token?: string;
          user?: AppUser;
          error?: string;
        };

        if (!res.ok || !data.token || !data.user) {
          setAuthError(data.error || 'Не удалось создать аккаунт.');
          return false;
        }

        window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setIsAuthModalOpen(false);
        return true;
      } catch {
        setAuthError('Не удалось подключиться к серверу. Проверь интернет.');
        return false;
      }
    },
    []
  );

  const signOutUser = useCallback(async () => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authError,
        isConfigured: true,
        isAuthModalOpen,
        setIsAuthModalOpen,
        clearAuthError,
        signInWithEmail,
        signUpWithEmail,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
