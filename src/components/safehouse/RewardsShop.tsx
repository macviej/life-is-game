import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Download,
  LogIn,
  LogOut,
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

export const RewardsShop: React.FC = () => {
  const {
    state,
    setIsOnboardingOpen,
    exportSaveJson,
    importSaveJson,
    resetProgress,
  } = useGame();
  const { user, setIsAuthModalOpen, signOutUser } = useAuth();

  const [confirmReset, setConfirmReset] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const flash = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 2600);
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

  const xpPercent = Math.min(
    100,
    Math.round((state.respectXp / Math.max(1, state.nextLevelXp)) * 100)
  );

  return (
    <div className="px-5 md:px-0 pt-5 pb-6 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-semibold tracking-[-0.025em] text-white leading-tight">
            Профиль
          </h1>
          <p className="mt-1 text-[13px] text-[#8E9098]">
            Прогресс, история тренировок и настройки
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
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#25262B] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#E5A3BD]">
                  <Cloud className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-white truncate">
                    {user ? user.displayName || user.email : 'Локальный режим'}
                  </div>
                  <div className="text-[12px] text-[#8E9098] truncate">
                    {user
                      ? `${user.email ?? ''} · Синхронизация активна`
                      : 'Войди, чтобы синхронизировать телефон и ПК'}
                  </div>
                </div>
              </div>
            </div>

            {user ? (
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="w-full h-10 rounded-[13px] bg-[#25262B] hover:bg-[#32343B] text-[13px] font-medium text-white inline-flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <LogOut className="w-4 h-4 text-[#8E9098]" />
                <span>Выйти из аккаунта</span>
              </button>
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
                <div className="text-[13px] text-[#8E9098]">
                  Уровень {state.level} · {state.rankTitle}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[22px] font-bold text-[#7ED484] tabular-nums leading-none">
                  {state.history.length}
                </div>
                <div className="text-[11px] text-[#8E9098] mt-1">тренировок</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[12px] text-[#8E9098] tabular-nums">
                <span>Опыт до уровня {state.level + 1}</span>
                <span>
                  {state.respectXp} / {state.nextLevelXp} XP
                </span>
              </div>
              <div className="h-[5px] w-full rounded-full bg-white/[0.10] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#E5A3BD] transition-all duration-500"
                  style={{ width: `${Math.max(4, xpPercent)}%` }}
                />
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
                  <span className="shrink-0 text-[13px] font-semibold text-[#8AE5C3] tabular-nums">
                    +{entry.earnedRespect} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
