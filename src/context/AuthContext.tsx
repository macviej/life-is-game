import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: string | null;
  isConfigured: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<boolean>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Неверный email или пароль.';
    case 'auth/email-already-in-use':
      return 'Аккаунт с этим email уже зарегистрирован.';
    case 'auth/weak-password':
      return 'Пароль должен содержать минимум 6 символов.';
    case 'auth/invalid-email':
      return 'Проверь корректность email.';
    case 'auth/popup-closed-by-user':
      return 'Окно входа было закрыто.';
    case 'auth/too-many-requests':
      return 'Слишком много попыток. Подожди немного и попробуй снова.';
    default:
      return 'Не удалось выполнить вход. Проверь подключение и попробуй снова.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    if (!auth || !googleProvider) {
      setAuthError('Облачная авторизация ещё не подключена к проекту Firebase.');
      return false;
    }
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAuthModalOpen(false);
      return true;
    } catch (err) {
      setAuthError(mapAuthError(err));
      return false;
    }
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (!auth) {
        setAuthError('Облачная авторизация ещё не подключена к проекту Firebase.');
        return false;
      }
      setAuthError(null);
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        setIsAuthModalOpen(false);
        return true;
      } catch (err) {
        setAuthError(mapAuthError(err));
        return false;
      }
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName?: string): Promise<boolean> => {
      if (!auth) {
        setAuthError('Облачная авторизация ещё не подключена к проекту Firebase.');
        return false;
      }
      setAuthError(null);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName?.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        setIsAuthModalOpen(false);
        return true;
      } catch (err) {
        setAuthError(mapAuthError(err));
        return false;
      }
    },
    []
  );

  const signOutUser = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        isConfigured: isFirebaseConfigured,
        isAuthModalOpen,
        setIsAuthModalOpen,
        clearAuthError,
        signInWithGoogle,
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
