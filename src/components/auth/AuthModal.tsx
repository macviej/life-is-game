import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Cloud } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authError,
    clearAuthError,
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
              <span>Облачная база Postgres</span>
            </div>
            <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-white">
              {mode === 'login' ? 'Вход в аккаунт' : 'Создать аккаунт'}
            </h2>
            <p className="mt-0.5 text-[12px] text-[#8E9098]">
              Синхронизируй тренировки и прогресс между телефоном и компьютером
            </p>
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
            disabled={submitting}
            className="w-full h-12 rounded-[14px] apple-sunset-cta disabled:opacity-45 text-[#111214] text-[15px] font-semibold active:scale-[0.98] transition"
          >
            {submitting
              ? 'Подожди...'
              : mode === 'login'
              ? 'Войти'
              : 'Создать аккаунт'}
          </button>
        </form>
      </div>
    </div>
  );
};
