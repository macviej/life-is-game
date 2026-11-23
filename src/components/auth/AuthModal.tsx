import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Cloud } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authError,
    clearAuthError,
    isConfigured,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    clearAuthError();
    setIsAuthModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0E0F11]/85 backdrop-blur-xl flex items-end sm:items-center justify-center sm:p-6 animate-modal-in"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[420px] rounded-t-[28px] sm:rounded-[28px] apple-card p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#E5A3BD]">
              <Cloud className="w-3.5 h-3.5" />
              <span>Облачная синхронизация</span>
            </div>
            <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-white">
              {mode === 'login' ? 'Вход в аккаунт' : 'Создать аккаунт'}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-full apple-card-elevated flex items-center justify-center text-[#8E9098] hover:text-white transition"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-[14px] bg-[#131417] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              clearAuthError();
              setMode('login');
            }}
            className={`h-9 rounded-[10px] text-[13px] font-semibold transition ${
              mode === 'login' ? 'bg-[#25262B] text-white' : 'text-[#8E9098] hover:text-white'
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              clearAuthError();
              setMode('register');
            }}
            className={`h-9 rounded-[10px] text-[13px] font-semibold transition ${
              mode === 'register' ? 'bg-[#25262B] text-white' : 'text-[#8E9098] hover:text-white'
            }`}
          >
            Регистрация
          </button>
        </div>

        {!isConfigured && (
          <div className="rounded-[14px] bg-[#25262B] px-3.5 py-3 text-[12px] text-[#C8CAD0] leading-relaxed">
            Ключи Firebase (`VITE_FIREBASE_*`) ещё не добавлены в окружение. После подключения
            проекта Firebase вход заработает автоматически.
          </div>
        )}

        {/* Google Sign-In */}
        <button
          type="button"
          disabled={submitting || !isConfigured}
          onClick={handleGoogle}
          className="w-full h-11 rounded-[14px] bg-white hover:bg-[#F3F4F6] disabled:opacity-45 text-[#111214] text-[14px] font-semibold flex items-center justify-center gap-2.5 active:scale-[0.98] transition"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
            />
            <path
              fill="#34A853"
              d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
            />
            <path
              fill="#EA4335"
              d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>
          <span>Продолжить с Google</span>
        </button>

        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-[#6E7078]">
          <span className="flex-1 h-px bg-white/[0.08]" />
          <span>или по email</span>
          <span className="flex-1 h-px bg-white/[0.08]" />
        </div>

        {/* Email + Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[#6E7078] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Имя"
                maxLength={32}
                className="w-full h-11 pl-10 pr-3.5 rounded-[13px] bg-[#131417] border border-white/[0.08] text-[14px] text-white placeholder:text-[#6E7078] focus:outline-none focus:border-[#E5A3BD]"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="w-4 h-4 text-[#6E7078] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              className="w-full h-11 pl-10 pr-3.5 rounded-[13px] bg-[#131417] border border-white/[0.08] text-[14px] text-white placeholder:text-[#6E7078] focus:outline-none focus:border-[#E5A3BD]"
            />
          </div>

          <div className="relative">
            <Lock className="w-4 h-4 text-[#6E7078] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль (от 6 символов)"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full h-11 pl-10 pr-3.5 rounded-[13px] bg-[#131417] border border-white/[0.08] text-[14px] text-white placeholder:text-[#6E7078] focus:outline-none focus:border-[#E5A3BD]"
            />
          </div>

          {authError && (
            <div className="rounded-[12px] bg-[#FF453A]/15 border border-[#FF453A]/30 px-3 py-2 text-[12px] text-[#FF8A80]">
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !isConfigured}
            className="w-full h-12 rounded-[14px] apple-sunset-cta disabled:opacity-45 text-[#111214] text-[15px] font-semibold active:scale-[0.98] transition"
          >
            {submitting
              ? 'Подожди...'
              : mode === 'login'
              ? 'Войти'
              : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  );
};
