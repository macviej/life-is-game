import React from 'react';
import {
  Activity,
  Award,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  History,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { calculateMuscleReadiness, formatDurationMs } from '../../engine/recoveryEngine';
import { playRadarBlipSound } from '../../engine/soundEffects';
import { MuscleGroup, MuscleRecoveryState } from '../../types/game';

function extractPercent(val: unknown, fallback: number): number {
  if (typeof val === 'number' && !Number.isNaN(val)) {
    return Math.min(100, Math.max(0, Math.round(val)));
  }
  if (val && typeof val === 'object' && 'readinessPercent' in val) {
    const p = (val as { readinessPercent?: unknown }).readinessPercent;
    if (typeof p === 'number' && !Number.isNaN(p)) {
      return Math.min(100, Math.max(0, Math.round(p)));
    }
  }
  return Math.min(100, Math.max(0, Math.round(fallback)));
}

const MUSCLE_ORDER: MuscleGroup[] = [
  'back_biceps',
  'chest_triceps',
  'shoulders',
  'core',
  'legs',
  'cns_cardio',
];

const DEFAULT_MUSCLE_LABELS: Record<MuscleGroup, string> = {
  back_biceps: 'Спина, широчайшие и хват',
  chest_triceps: 'Грудь и трицепс',
  shoulders: 'Плечи и ротаторы',
  core: 'Пресс и кор',
  legs: 'Ноги и ягодицы',
  cns_cardio: 'ЦНС и выносливость',
};

function formatDateTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const CharacterStatsView: React.FC = () => {
  const { state, now, startMission } = useGame();

  const healthScore = Math.min(100, Math.max(0, Math.round(state.stats.healthLevel)));
  const currentHp = Math.round(state.stats.currentHp);
  const maxHp = Math.max(1, Math.round(state.stats.maxHp));
  const hpPercent = Math.min(100, Math.max(0, Math.round((currentHp / maxHp) * 100)));

  // Параметры SVG-кольца (Whoop / Apple Fitness style)
  const ringRadius = 70;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference * (1 - healthScore / 100);

  const statRows = [
    {
      label: 'Здоровье',
      sub: `Тонус • HP ${currentHp}/${maxHp}`,
      value: state.stats.healthLevel,
      gradient: 'from-[#10E598] to-[#00DFC8]',
      textColor: '#10E598',
      icon: HeartPulse,
    },
    {
      label: 'Сила',
      sub: 'Турник, брусья и свободные веса',
      value: state.stats.strength,
      gradient: 'from-[#FF4D8D] to-[#FF8A4C]',
      textColor: '#FF4D8D',
      icon: Dumbbell,
    },
    {
      label: 'Выносливость',
      sub: 'Кардио, темп и многоповторка',
      value: state.stats.stamina,
      gradient: 'from-[#00DFC8] to-[#38BDF8]',
      textColor: '#00DFC8',
      icon: Activity,
    },
    {
      label: 'Мобильность',
      sub: 'Контроль тела, кор и суставы',
      value: state.stats.agility,
      gradient: 'from-[#FF8A4C] to-[#FFD166]',
      textColor: '#FF8A4C',
      icon: Sparkles,
    },
    {
      label: 'Дисциплина',
      sub: 'Регулярность и множитель наград',
      value: state.stats.discipline,
      gradient: 'from-[#FFD166] to-[#FF4D8D]',
      textColor: '#FFD166',
      icon: Flame,
    },
  ];

  const mobilityMission = state.missions.find((m) => m.category === 'mobility_hp');

  const handleStartMobility = () => {
    if (!mobilityMission) return;
    if (state.soundEnabled) {
      playRadarBlipSound();
    }
    startMission(mobilityMission.id);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* HERO-БЛОК (2 колонки: SVG-кольцо Здоровья + 5 градиентных шкал) */}
      <section className="sunset-card-warm rounded-3xl p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF8A4C]">
              SOLIS BAY ATHLETE PROFILE
            </div>
            <h1 className="mt-1 font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-[#F8F5FF]">
              ЗДОРОВЬЕ И ХАРАКТЕРИСТИКИ
            </h1>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#10E598]/10 border border-[#10E598]/25 text-xs font-semibold text-[#10E598]">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>План: {state.activePlan?.name || 'Стартовый'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Левая колонка: SVG-кольцо Уровня Здоровья */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-2xl bg-[#0E0A18]/65 border border-white/[0.07] p-6 text-center">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 176 176">
                <defs>
                  <linearGradient id="healthSunsetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF4D8D" />
                    <stop offset="50%" stopColor="#FF8A4C" />
                    <stop offset="100%" stopColor="#10E598" />
                  </linearGradient>
                </defs>
                {/* Фоновый трек */}
                <circle
                  cx="88"
                  cy="88"
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="14"
                />
                {/* Внешнее кольцо Health Level */}
                <circle
                  cx="88"
                  cy="88"
                  r={ringRadius}
                  fill="none"
                  stroke="url(#healthSunsetGradient)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringDashOffset}
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9F95B8]">
                  Health Level
                </span>
                <span className="font-mono font-bold text-4xl text-[#F8F5FF] tabular-nums leading-none mt-1">
                  {healthScore}
                </span>
                <span className="mt-1.5 font-mono text-xs font-semibold text-[#10E598] tabular-nums">
                  HP {currentHp}/{maxHp} ({hpPercent}%)
                </span>
              </div>
            </div>

            <div className="mt-5 w-full space-y-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFD166]/12 border border-[#FFD166]/30 text-[#FFD166] text-xs font-semibold">
                <Award className="w-3.5 h-3.5" />
                <span>{state.rankTitle}</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-3 py-2.5">
                  <div className="text-[11px] text-[#9F95B8]">Уровень</div>
                  <div className="font-mono font-bold text-lg text-[#F8F5FF] tabular-nums">
                    LVL {state.level}
                  </div>
                </div>
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-3 py-2.5">
                  <div className="text-[11px] text-[#9F95B8]">Серия дней</div>
                  <div className="font-mono font-bold text-lg text-[#FF8A4C] tabular-nums">
                    {state.streakDays} дн.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Правая колонка: 5 градиентных шкал характеристик */}
          <div className="lg:col-span-7 space-y-3.5">
            {statRows.map((row) => {
              const Icon = row.icon;
              const clamped = Math.min(100, Math.max(0, Math.round(row.value)));

              return (
                <div
                  key={row.label}
                  className="rounded-2xl bg-[#0E0A18]/60 border border-white/[0.07] p-4 transition hover:border-white/[0.14]"
                >
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08]"
                        style={{ color: row.textColor }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-[#F8F5FF] truncate">
                          {row.label}
                        </div>
                        <div className="text-xs text-[#9F95B8] truncate">{row.sub}</div>
                      </div>
                    </div>

                    <div className="font-mono font-bold text-base tabular-nums shrink-0 text-[#F8F5FF]">
                      <span style={{ color: row.textColor }}>{clamped}</span>
                      <span className="text-[#9F95B8] text-xs font-medium"> / 100</span>
                    </div>
                  </div>

                  <div className="h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${row.gradient} transition-all duration-500`}
                      style={{ width: `${clamped}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* МАТРИЦА ВОССТАНОВЛЕНИЯ МЫШЦ (6 групп) */}
      <section className="sunset-card rounded-3xl p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00DFC8]">
              RECOVERY TELEMETRY
            </div>
            <h2 className="mt-1 font-display font-extrabold text-xl sm:text-2xl text-[#F8F5FF]">
              МАТРИЦА ВОССТАНОВЛЕНИЯ МЫШЦ
            </h2>
            <p className="text-xs sm:text-sm text-[#9F95B8] mt-1">
              Отслеживайте готовность каждой мышечной группы, чтобы тренироваться на пике формы без перетрена.
            </p>
          </div>

          {mobilityMission && (
            <button
              type="button"
              onClick={handleStartMobility}
              className="shrink-0 min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl sunset-btn-teal text-[#0E0A18] font-bold text-sm transition active:scale-[0.98]"
            >
              <HeartPulse className="w-4 h-4" />
              <span>Восстановительная разминка</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MUSCLE_ORDER.map((group) => {
            const muscle: MuscleRecoveryState = state.muscleRecovery[group] || {
              group,
              label: DEFAULT_MUSCLE_LABELS[group],
              readinessPercent: 100,
              lastTrainedAt: null,
              readyAtTimestamp: null,
            };

            const readiness = extractPercent(
              calculateMuscleReadiness(muscle, now),
              muscle.readinessPercent
            );
            const remainingMs =
              muscle.readyAtTimestamp && muscle.readyAtTimestamp > now
                ? muscle.readyAtTimestamp - now
                : 0;
            const isFull = readiness >= 100 || remainingMs === 0;
            const isReadyToWork = readiness >= 85;

            const barGradient = isFull
              ? 'from-[#10E598] to-[#00DFC8]'
              : isReadyToWork
              ? 'from-[#00DFC8] to-[#38BDF8]'
              : readiness >= 50
              ? 'from-[#FF8A4C] to-[#FFD166]'
              : 'from-[#FF4D8D] to-[#FF8A4C]';

            const statusBadge = isFull
              ? 'bg-[#10E598]/12 text-[#10E598] border-[#10E598]/25'
              : isReadyToWork
              ? 'bg-[#00DFC8]/12 text-[#00DFC8] border-[#00DFC8]/25'
              : 'bg-[#FF8A4C]/12 text-[#FFD166] border-[#FF8A4C]/25';

            return (
              <div
                key={group}
                className="rounded-2xl bg-[#0E0A18]/65 border border-white/[0.08] p-4.5 p-5 flex flex-col justify-between gap-4 transition hover:border-white/[0.15]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-[#F8F5FF] leading-snug">
                      {muscle.label || DEFAULT_MUSCLE_LABELS[group]}
                    </h3>
                    <span className="font-mono font-bold text-base text-[#F8F5FF] tabular-nums shrink-0">
                      {readiness}%
                    </span>
                  </div>

                  <div className="mt-3 h-2.5 w-full rounded-full bg-white/[0.07] overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500`}
                      style={{ width: `${readiness}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border tabular-nums ${statusBadge}`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {isFull ? 'Готова' : `Через ${formatDurationMs(remainingMs)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ИСТОРИЯ ЗАВЕРШЁННЫХ ТРЕНИРОВОК */}
      <section className="sunset-card rounded-3xl p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD166]/12 border border-[#FFD166]/25 text-[#FFD166]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-xl text-[#F8F5FF]">
                ИСТОРИЯ ТРЕНИРОВОК
              </h2>
              <p className="text-xs text-[#9F95B8]">Последние завершённые сессии и миссии</p>
            </div>
          </div>

          {state.history.length > 0 && (
            <span className="font-mono text-xs text-[#9F95B8] tabular-nums">
              Всего: {state.history.length}
            </span>
          )}
        </div>

        {state.history.length === 0 ? (
          <div className="rounded-2xl bg-[#0E0A18]/55 border border-white/[0.07] p-8 text-center text-sm text-[#9F95B8]">
            Пока нет завершённых тренировок. Выберите первую миссию на карте или запишите подход в каталоге!
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06] rounded-2xl bg-[#0E0A18]/55 border border-white/[0.07] overflow-hidden">
            {state.history.slice(0, 15).map((entry) => (
              <div
                key={entry.id}
                className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/[0.02] transition"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-[#F8F5FF] truncate">
                    {entry.missionTitle}
                  </div>
                  <div className="text-xs text-[#9F95B8] mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono tabular-nums">
                    <span>{formatDateTime(entry.completedAt)}</span>
                    <span>• Подходов: {entry.totalSets}</span>
                    <span>• Объём: {entry.totalRepsOrSec}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 font-mono text-xs font-bold tabular-nums">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFD166]/10 text-[#FFD166]">
                    <Zap className="w-3.5 h-3.5" />+{entry.earnedRespect} XP
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#10E598]/10 text-[#10E598]">
                    +${entry.earnedCash}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
