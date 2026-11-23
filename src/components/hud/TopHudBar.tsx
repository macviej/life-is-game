import React from 'react';
import {
  Heart,
  SlidersHorizontal,
  Smartphone,
  Star,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { formatDurationMs } from '../../engine/recoveryEngine';
import { playRadarBlipSound } from '../../engine/soundEffects';

function formatCash(amount: number): string {
  const safe = Math.max(0, Math.floor(amount));
  return `$${safe.toLocaleString('en-US')}`;
}

export const TopHudBar: React.FC = () => {
  const {
    state,
    recommendation,
    unreadNotificationsCount,
    isPhoneOpen,
    setIsPhoneOpen,
    setIsOnboardingOpen,
    requestCoachStatusPing,
  } = useGame();

  const hpPercent = Math.min(
    100,
    Math.max(0, Math.round((state.stats.currentHp / Math.max(1, state.stats.maxHp)) * 100))
  );
  const isLowHp = hpPercent < 40;

  const isReady =
    recommendation.status === 'grease_ready' || recommendation.status === 'pullup_ready';

  const statusTimerLabel =
    recommendation.status === 'grease_ready' ||
    (recommendation.pullupReadinessPercent >= 85 && recommendation.msUntilPullupReady <= 0)
      ? 'ГОТОВО'
      : recommendation.msUntilPullupReady > 0
        ? formatDurationMs(recommendation.msUntilPullupReady)
        : formatDurationMs(recommendation.msUntilNextGrease);

  const statusDotColor = isReady
    ? 'bg-[#00DFC8]'
    : recommendation.status === 'parallel_suggested'
      ? 'bg-[#FF4D8D]'
      : 'bg-[#FFD166]';

  return (
    <header className="sticky top-0 z-40 bg-[#0E0A18]/85 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Левая часть: Логотип LIFE IS GAME + Игрок */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex flex-col leading-none shrink-0">
              <span className="font-display font-extrabold text-xl sm:text-2xl tracking-wider sunset-gradient-text uppercase">
                LIFE IS GAME
              </span>
              <span className="text-[10px] font-semibold tracking-[0.22em] text-[#9F95B8] uppercase mt-0.5">
                Solis Bay
              </span>
            </div>

            <div className="h-7 w-px bg-white/[0.1] hidden sm:block shrink-0" />

            <div className="min-w-0">
              <div className="text-sm font-bold text-[#F8F5FF] truncate">
                {state.playerName}
              </div>
              <div className="text-[11px] font-medium text-[#9F95B8] truncate">
                <span className="font-mono text-[#FFD166] font-semibold">LVL {state.level}</span>
                <span className="mx-1.5 text-white/25">•</span>
                <span>{state.rankTitle}</span>
              </div>
            </div>
          </div>

          {/* Мобильные быстрые кнопки справа */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                playRadarBlipSound();
                setIsOnboardingOpen(true);
              }}
              aria-label="Мой инвентарь"
              className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[#F8F5FF] flex items-center justify-center transition"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#00DFC8]" />
            </button>

            <button
              type="button"
              onClick={() => {
                playRadarBlipSound();
                setIsPhoneOpen(!isPhoneOpen);
              }}
              aria-label="Solis Link"
              className={`relative w-10 h-10 rounded-xl border flex items-center justify-center transition ${
                isPhoneOpen
                  ? 'bg-[#FF4D8D] border-[#FF4D8D] text-white'
                  : 'bg-[#FF4D8D]/15 border-[#FF4D8D]/35 text-[#FF4D8D]'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-[#FF4D8D] to-[#FF8A4C] text-white font-mono text-[10px] font-bold flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Центр: Капсула Здоровье (HP) + живой статус «Когда продолжить» */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 lg:flex-1 lg:justify-center min-w-0">
          {/* Капсула Здоровье (HP) */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] shrink-0">
            <Heart
              className={`w-3.5 h-3.5 fill-current ${
                isLowHp ? 'text-[#FF4D8D] animate-pulse' : 'text-[#10E598]'
              }`}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#F8F5FF]">Здоровье</span>
              <div className="w-16 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isLowHp
                      ? 'bg-gradient-to-r from-[#FF4D8D] to-[#FF8A4C]'
                      : 'bg-gradient-to-r from-[#00DFC8] to-[#10E598]'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
              <span className="font-mono text-xs font-semibold text-[#10E598] tabular-nums">
                {Math.round(state.stats.currentHp)}
              </span>
            </div>
          </div>

          {/* Кликабельный статус «Когда продолжить» */}
          <button
            type="button"
            onClick={() => {
              playRadarBlipSound();
              requestCoachStatusPing();
            }}
            title="Нажми, чтобы получить актуальную сводку от тренера"
            className="flex-1 sm:flex-initial min-w-0 max-w-md inline-flex items-center justify-between gap-3 px-3.5 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#FF8A4C]/35 transition text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${statusDotColor}`} />
              <span className="text-xs text-[#F8F5FF] font-medium truncate">
                {recommendation.headline}
              </span>
            </div>
            <span
              className={`shrink-0 font-mono text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                isReady
                  ? 'bg-[#00DFC8]/15 text-[#00DFC8]'
                  : 'bg-[#FFD166]/15 text-[#FFD166]'
              }`}
            >
              {statusTimerLabel}
            </span>
          </button>
        </div>

        {/* Правая часть: Баланс $, Звёзды стрика ★, Мой инвентарь, Solis Link */}
        <div className="flex items-center justify-between lg:justify-end gap-2.5 shrink-0">
          {/* Баланс $ */}
          <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#10E598]/10 border border-[#10E598]/25 font-mono font-bold text-sm text-[#10E598] tabular-nums">
            {formatCash(state.cash)}
          </div>

          {/* Звёзды стрика */}
          <div
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]"
            title={`Стрик: ${state.streakDays} дн. (${state.heatStars} из 6 звёзд)`}
          >
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 6 }).map((_, idx) => {
                const active = idx < state.heatStars;
                return (
                  <Star
                    key={idx}
                    className={`w-3 h-3 ${
                      active ? 'text-[#FFD166] fill-[#FFD166]' : 'text-white/15'
                    }`}
                  />
                );
              })}
            </div>
            <span className="ml-1 font-mono text-[11px] font-semibold text-[#FFD166] tabular-nums">
              {state.streakDays}д
            </span>
          </div>

          {/* Кнопки (Десктоп) */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playRadarBlipSound();
                setIsOnboardingOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/20 text-xs font-semibold text-[#F8F5FF] transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#00DFC8]" />
              <span>Мой инвентарь</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playRadarBlipSound();
                setIsPhoneOpen(!isPhoneOpen);
              }}
              className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-semibold transition ${
                isPhoneOpen
                  ? 'sunset-btn-primary border-transparent text-white'
                  : 'bg-[#FF4D8D]/12 hover:bg-[#FF4D8D]/20 border-[#FF4D8D]/35 text-[#F8F5FF]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-[#FF8A4C]" />
              <span>Solis Link</span>
              {unreadNotificationsCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-[#FF4D8D] to-[#FF8A4C] text-white font-mono text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
