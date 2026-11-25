import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  KeyRound,
  LogIn,
  LogOut,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';

function formatHistoryDate(ts: number): string {
  return new Date(ts).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSyncTime(ts: number | null): string {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const RewardsShop: React.FC = () => {
  const {
    state,
    syncStatus,
    lastSyncedAt,
    setIsOnboardingOpen,
    exportSaveJson,
    importSaveJson,
    resetProgress,
  } = useGame();
  const { user, setIsAuthModalOpen, signOutUser, changePassword } = useAuth();

  const [confirmReset, setConfirmReset] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const flash = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 2600);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (newPassword.length < 6) {
      setPwError('Новый пароль — минимум 6 символов.');
      return;
    }
    setPwSubmitting(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (!res.ok) {
        setPwError(res.error || 'Не удалось сменить пароль.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswordForm(false);
      flash('Пароль обновлён');
    } finally {
      setPwSubmitting(false);
    }
  };

  const handleExport = () => {
    const raw = exportSaveJson();
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'life-is-game-save.json';
    a.click();
    URL.revokeObjectURL(url);
    flash('Сейв сохранён');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importSaveJson(String(reader.result ?? ''));
      flash(ok ? 'Прогресс загружен' : 'Ошибка файла');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const syncBadge = (() => {
    if (!user) {
      return {
        label: 'Локально',
        color: 'text-[#8E9098]',
        dot: 'bg-[#6E7078]',
        icon: Cloud,
      };
    }
    if (syncStatus === 'syncing') {
      return {
        label: 'Сохранение...',
        color: 'text-[#E5C97B]',
        dot: 'bg-[#E5C97B]',
        icon: RefreshCw,
      };
    }
    if (syncStatus === 'offline') {
      return {
        label: 'Оффлайн',
        color: 'text-[#FF8A80]',
        dot: 'bg-[#FF453A]',
        icon: CloudOff,
      };
    }
    return {
      label: lastSyncedAt ? `В облаке · ${formatSyncTime(lastSyncedAt)}` : 'В облаке',
      color: 'text-[#7ED484]',
      dot: 'bg-[#7ED484]',
      icon: Cloud,
    };
  })();

  const SyncIcon = syncBadge.icon;

  return (
    <div className="px-5 md:px-0 pt-5 pb-6 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-semibold tracking-[-0.025em] text-white leading-tight">
            Профиль
          </h1>
          <p className="mt-1 text-[13px] text-[#8E9098]">
            Аккаунт, план тренировок и история
          </p>
        </div>

        {feedback && (
          <span className="mt-1 px-3 py-1.5 rounded-full apple-liquid-glass text-[12px] font-semibold text-white">
            {feedback}
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Левая колонка: аккаунт + карточка прогресса + резервная копия */}
        <div className="lg:col-span-5 space-y-5">
          {/* Карточка аккаунта и облачной синхронизации */}
          <section className="rounded-[20px] apple-card p-5 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#25262B] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#E5A3BD]">
                  <SyncIcon
                    className={`w-5 h-5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-white truncate">
                    {user ? user.displayName || user.email : 'Локальный режим'}
                  </div>
                  <div className="text-[12px] text-[#8E9098] truncate">
                    {user
                      ? user.email
                      : 'Войди, чтобы синхронизировать телефон и ПК'}
                  </div>
                </div>
              </div>

              <span
                className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#131417] border border-white/[0.06] text-[11px] font-medium ${syncBadge.color}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${syncBadge.dot}`} />
                <span>{syncBadge.label}</span>
              </span>
            </div>

            {user ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPwError(null);
                      setShowPasswordForm((prev) => !prev);
                    }}
                    className="h-10 rounded-[13px] bg-[#25262B] hover:bg-[#32343B] text-[13px] font-medium text-white inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#E5A3BD]" />
                    <span>Пароль</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void signOutUser()}
                    className="h-10 rounded-[13px] bg-[#25262B] hover:bg-[#32343B] text-[13px] font-medium text-white inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[#8E9098]" />
                    <span>Выйти</span>
                  </button>
                </div>

                {showPasswordForm && (
                  <form
                    onSubmit={handlePasswordChange}
                    className="pt-2 border-t border-white/[0.06] space-y-2.5"
                  >
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Текущий пароль"
                      autoComplete="current-password"
                      className="w-full h-10 px-3.5 rounded-[12px] bg-[#131417] border border-white/[0.08] text-[13px] text-white placeholder:text-[#6E7078] focus:outline-none focus:border-[#E5A3BD]"
                    />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Новый пароль (от 6 символов)"
                      autoComplete="new-password"
                      className="w-full h-10 px-3.5 rounded-[12px] bg-[#131417] border border-white/[0.08] text-[13px] text-white placeholder:text-[#6E7078] focus:outline-none focus:border-[#E5A3BD]"
                    />
                    {pwError && (
                      <div className="rounded-[10px] bg-[#FF453A]/15 border border-[#FF453A]/30 px-3 py-1.5 text-[12px] text-[#FF8A80]">
                        {pwError}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={pwSubmitting}
                      className="w-full h-10 rounded-[12px] apple-sunset-cta disabled:opacity-45 text-[#111214] text-[13px] font-semibold active:scale-[0.98] transition"
                    >
                      {pwSubmitting ? 'Сохранение...' : 'Обновить пароль'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full h-11 rounded-[14px] apple-sunset-cta text-[#111214] text-[14px] font-semibold inline-flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <LogIn className="w-4 h-4" />
                <span>Войти или создать аккаунт</span>
              </button>
            )}
          </section>

          <section className="rounded-[20px] apple-wallet-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[20px] font-semibold text-white">{state.playerName}</div>
                <div className="text-[13px] text-[#8E9098] tabular-nums">
                  Серия {state.streakDays} дн.
                </div>
              </div>
              <div className="text-right">
                <div className="text-[22px] font-bold text-[#7ED484] tabular-nums leading-none">
                  {state.history.length}
                </div>
                <div className="text-[11px] text-[#8E9098] mt-1">тренировок</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="w-full h-11 rounded-[14px] bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.08] text-white text-[14px] font-medium inline-flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#E5A3BD]" />
              <span>Изменить программу тренировок</span>
            </button>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-[13px] font-medium text-[#8E9098] px-1">Данные и копия</h2>
            <div className="rounded-[18px] apple-card divide-y divide-white/[0.06] overflow-hidden">
              <button
                type="button"
                onClick={handleExport}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/[0.025] transition"
              >
                <span className="text-[14px] font-medium text-white">Сохранить бэкап (.json)</span>
                <Download className="w-4 h-4 text-[#8E9098]" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/[0.025] transition"
              >
                <span className="text-[14px] font-medium text-white">Загрузить из файла</span>
                <Upload className="w-4 h-4 text-[#8E9098]" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleImport}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => {
                  if (!confirmReset) {
                    setConfirmReset(true);
                    window.setTimeout(() => setConfirmReset(false), 3500);
                  } else {
                    resetProgress();
                    setConfirmReset(false);
                  }
                }}
                className={`w-full px-4 py-3.5 flex items-center justify-between text-left transition ${
                  confirmReset
                    ? 'bg-[#FF453A] text-white'
                    : 'text-[#FF6961] hover:bg-white/[0.025]'
                }`}
              >
                <span className="text-[14px] font-medium">
                  {confirmReset ? 'Нажми ещё раз для сброса' : 'Сбросить прогресс'}
                </span>
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </section>
        </div>

        {/* Правая колонка: история выполненных тренировок */}
        <section className="lg:col-span-7 space-y-2.5">
          <h2 className="text-[14px] font-medium text-[#8E9098] px-1">История тренировок</h2>
          {state.history.length === 0 ? (
            <div className="rounded-[18px] apple-card p-6 text-center text-[14px] text-[#8E9098]">
              Пока нет завершённых тренировок. Выполни сегодняшнюю тренировку на вкладке «Фитнес».
            </div>
          ) : (
            <div className="rounded-[18px] apple-card divide-y divide-white/[0.06] overflow-hidden">
              {state.history.slice(0, 20).map((entry) => (
                <div
                  key={entry.id}
                  className="px-4 py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-[#7ED484] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-white truncate">
                        {entry.missionTitle}
                      </div>
                      <div className="text-[12px] text-[#8E9098] tabular-nums">
                        {formatHistoryDate(entry.completedAt)} · {entry.totalSets} подх.
                      </div>
                    </div>
                  </div>
                  {entry.totalRepsOrSec > 0 && (
                    <span className="shrink-0 text-[13px] font-medium text-[#8E9098] tabular-nums">
                      {entry.totalRepsOrSec} повт.
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
