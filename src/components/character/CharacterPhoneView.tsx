import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  Hourglass,
  Info,
  Play,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { EXERCISES } from '../../data/exercises';
import { calculateMuscleReadiness, formatDurationMs } from '../../engine/recoveryEngine';
import { Exercise, Mission, MuscleGroup } from '../../types/game';
import { ExerciseGuideModal } from '../exercises/ExerciseGuideModal';

interface CharacterPhoneViewProps {
  onOpenPlan: () => void;
}

const MUSCLE_ROWS: { id: MuscleGroup; label: string }[] = [
  { id: 'back_biceps', label: 'Спина и бицепс' },
  { id: 'chest_triceps', label: 'Грудь и трицепс' },
  { id: 'shoulders', label: 'Плечи' },
  { id: 'core', label: 'Кор и пресс' },
  { id: 'legs', label: 'Ноги' },
];

function getTodayIndex(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function statToQuarterLevel(statValue: number): number {
  if (statValue >= 75) return 4;
  if (statValue >= 50) return 3;
  if (statValue >= 25) return 2;
  return 1;
}

function formatRestLabel(seconds: number): string {
  if (seconds >= 120 && seconds % 60 === 0) return `${seconds / 60} мин`;
  if (seconds >= 120) return `${Math.floor(seconds / 60)}м ${seconds % 60}с`;
  return `${seconds} сек`;
}

function estimateWorkoutMinutes(mission: Mission | undefined): number {
  if (!mission) return 0;
  let totalSec = 0;
  for (const t of mission.tasks) {
    const ex = EXERCISES[t.exerciseId];
    const workPerSet = ex?.unit === 'seconds' ? t.targetPerSet : Math.max(25, t.targetPerSet * 4);
    const rest = ex?.restSeconds ?? 90;
    totalSec += t.sets * workPerSet + Math.max(0, t.sets - 1) * rest + 45;
  }
  return Math.max(5, Math.round(totalSec / 60));
}

const SegmentedLevelRing: React.FC<{
  filledSegments: number;
  accentColor: string;
  trackColor?: string;
  icon: React.ReactNode;
}> = ({ filledSegments, accentColor, trackColor = '#2E2F34', icon }) => {
  const size = 66;
  const center = size / 2;
  const radius = 24;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const gap = 5.5;
  const segLen = circumference / 4 - gap;

  return (
    <div className="relative w-[66px] h-[66px] shrink-0 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {[0, 1, 2, 3].map((idx) => {
          const offset = -(idx * (circumference / 4) + gap / 2);
          const isFilled = idx < filledSegments;
          return (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={isFilled ? accentColor : trackColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segLen} ${circumference - segLen}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{icon}</div>
    </div>
  );
};

export const CharacterPhoneView: React.FC<CharacterPhoneViewProps> = ({ onOpenPlan }) => {
  const { state, now, startMission, setIsOnboardingOpen } = useGame();
  const [guideExercise, setGuideExercise] = useState<Exercise | null>(null);

  const todayIdx = getTodayIndex();
  const schedule = state.activePlan.weeklySchedule || [];
  const todayPlan = schedule[todayIdx] ?? schedule[0];
  const tomorrowPlan = schedule[(todayIdx + 1) % Math.max(1, schedule.length)];

  const todayMission: Mission | undefined = todayPlan?.primaryMissionId
    ? state.missions.find((m) => m.id === todayPlan.primaryMissionId)
    : state.missions.find((m) => m.isUnlocked && m.type !== 'grease_the_groove');

  const todayKey = new Date(now).toISOString().slice(0, 10);
  const completedToday = useMemo(() => {
    if (!todayMission) return false;
    return state.history.some(
      (h) =>
        h.missionId === todayMission.id &&
        new Date(h.completedAt).toISOString().slice(0, 10) === todayKey
    );
  }, [state.history, todayMission, todayKey]);

  const hpPercent = Math.min(
    100,
    Math.max(0, Math.round((state.stats.currentHp / Math.max(1, state.stats.maxHp)) * 100))
  );
  const healthLabel =
    hpPercent >= 75 ? 'Здоров' : hpPercent >= 45 ? 'Восстановление' : 'Усталость';
  const healthColor =
    hpPercent >= 75 ? 'text-[#7ED484]' : hpPercent >= 45 ? 'text-[#E5C97B]' : 'text-[#E5A3BD]';

  const muscleList = useMemo(() => {
    return MUSCLE_ROWS.map((row) => {
      const rec = state.muscleRecovery[row.id];
      const percent = rec ? calculateMuscleReadiness(rec, now) : 100;
      const msRemaining =
        rec?.readyAtTimestamp && rec.readyAtTimestamp > now ? rec.readyAtTimestamp - now : 0;
      return { ...row, percent, msRemaining };
    });
  }, [state.muscleRecovery, now]);

  // Направления внутри группы «Спорт» (для визуального прогресса как на референсе)
  const sportTracks = [
    {
      id: 'strength',
      label: 'Силовая',
      quarter: statToQuarterLevel(state.stats.strength),
      value: state.stats.strength,
      accent: '#E5A3BD',
      track: '#3B2A32',
      icon: <Heart className="w-4 h-4 fill-[#E5A3BD] text-[#E5A3BD]" />,
    },
    {
      id: 'cardio',
      label: 'Кардио',
      quarter: statToQuarterLevel(state.stats.stamina),
      value: state.stats.stamina,
      accent: '#8AE5C3',
      track: '#26332F',
      icon: <Zap className="w-4 h-4 fill-[#8AE5C3] text-[#8AE5C3]" />,
    },
    {
      id: 'mobility',
      label: 'Мобильность',
      quarter: statToQuarterLevel(state.stats.agility),
      value: state.stats.agility,
      accent: '#A88CE8',
      track: '#2E283B',
      icon: <Eye className="w-4 h-4 text-[#A88CE8]" />,
    },
  ];

  const todayAccent =
    todayMission?.category === 'cardio_street'
      ? '#8AE5C3'
      : todayMission?.category === 'mobility_hp'
      ? '#A88CE8'
      : '#E5A3BD';
  const todayWindowBg =
    todayMission?.category === 'cardio_street'
      ? '#192924'
      : todayMission?.category === 'mobility_hp'
      ? '#231D30'
      : '#2E1F26';

  return (
    <div className="px-5 md:px-0 pt-5 pb-6 space-y-5">
      {/* Чистая шапка профиля */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] md:text-[30px] font-semibold tracking-[-0.02em] text-white leading-tight">
            {state.playerName}
          </h1>
          <div className="mt-0.5 flex items-center gap-2 text-[14px]">
            <span className={`font-medium ${healthColor}`}>{healthLabel}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOnboardingOpen(true)}
          className="lg:hidden w-10 h-10 rounded-full apple-card hover:bg-[#25262B] flex items-center justify-center text-[#A1A3AA] hover:text-white active:scale-95 transition"
          aria-label="Настроить программу"
        >
          <SlidersHorizontal className="w-[17px] h-[17px]" />
        </button>
      </header>

      {/* Группа миссий: Спорт */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* ЛЕВАЯ КОЛОНКА: Главная миссия на сегодня */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-medium text-[#8E9098]">Группа: Спорт</span>
              <span className="text-white/20">·</span>
              <span className="text-[13px] text-[#E5A3BD] font-medium">
                Сегодня ({todayPlan?.dayShort ?? 'День'})
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenPlan}
              className="text-[13px] font-medium text-[#8E9098] hover:text-white inline-flex items-center gap-0.5 transition"
            >
              <span>Вся неделя</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ЕДИНСТВЕННАЯ ПОНЯТНАЯ КАРТОЧКА МИССИИ НА СЕГОДНЯ */}
          <div
            className={`rounded-[20px] p-5 space-y-4 ${
              completedToday ? 'apple-card' : 'apple-card-active'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <span className="text-[12px] font-medium text-[#8E9098]">
                  {todayPlan?.isRecoveryDay ? 'Восстановление дня' : 'Тренировка дня'}
                </span>
                <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-white leading-snug">
                  {todayMission ? todayMission.title : 'День отдыха'}
                </h2>
                {todayMission && (
                  <div className="text-[13px] text-[#8E9098] tabular-nums">
                    ~{estimateWorkoutMinutes(todayMission)} мин · {todayMission.tasks.length} упр. · +
                    {todayMission.rewards.healthBonus} HP
                  </div>
                )}
              </div>

              <SegmentedLevelRing
                filledSegments={statToQuarterLevel(state.stats.strength)}
                accentColor={todayAccent}
                trackColor="#312930"
                icon={
                  completedToday ? (
                    <Check className="w-5 h-5 text-[#7ED484] stroke-[2.6]" />
                  ) : (
                    <Heart
                      className="w-[18px] h-[18px]"
                      style={{ color: todayAccent, fill: todayAccent }}
                    />
                  )
                }
              />
            </div>

            {/* Точный список того, что нужно сделать сегодня: подходы, повторы и отдых */}
            {todayMission && (
              <div className="rounded-[14px] bg-[#131417] border border-white/[0.06] divide-y divide-white/[0.06] overflow-hidden">
                {todayMission.tasks.map((task, idx) => {
                  const ex = EXERCISES[task.exerciseId];
                  if (!ex) return null;
                  const unit = ex.unit === 'seconds' ? 'сек' : ex.unit === 'meters' ? 'м' : 'повт.';
                  return (
                    <button
                      key={`${task.exerciseId}-${idx}`}
                      type="button"
                      onClick={() => setGuideExercise(ex)}
                      className="w-full px-3.5 py-3 flex items-center justify-between gap-3 text-left hover:bg-white/[0.03] transition"
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] text-white/95 font-medium truncate">
                          {ex.name}
                        </div>
                        <div className="mt-0.5 text-[12px] text-[#8E9098] tabular-nums">
                          {task.sets} подх. × {task.targetPerSet} {unit} · отдых{' '}
                          {formatRestLabel(ex.restSeconds)}
                        </div>
                      </div>
                      <Info className="w-4 h-4 text-[#E5A3BD] shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Статус-блок как в референсе + одна чёткая кнопка действия */}
            {completedToday ? (
              <div className="rounded-[14px] bg-[#25262B] px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="text-[13px] leading-snug">
                  <div className="text-white font-medium">Тренировка на сегодня выполнена.</div>
                  <div className="text-[#8E9098] mt-0.5">
                    Отдых и восстановление.
                    {tomorrowPlan ? ` Завтра (${tomorrowPlan.dayShort}): ${tomorrowPlan.title}.` : ''}
                  </div>
                </div>
                <Clock className="w-4 h-4 text-[#8E9098] shrink-0" />
              </div>
            ) : todayMission ? (
              <div className="space-y-3">
                <div
                  className="rounded-[12px] px-3.5 py-2.5 space-y-2"
                  style={{ backgroundColor: todayWindowBg }}
                >
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-white/90">Окно тренировки открыто</span>
                    <Hourglass className="w-3.5 h-3.5" style={{ color: todayAccent }} />
                  </div>
                  <div className="h-[5px] w-full rounded-full bg-black/35 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: '100%', backgroundColor: todayAccent }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => startMission(todayMission.id)}
                  className="w-full h-12 rounded-[14px] apple-sunset-cta text-[#111214] text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition"
                >
                  <Play className="w-4 h-4 fill-[#111214]" />
                  <span>Начать сегодняшнюю тренировку</span>
                </button>
              </div>
            ) : (
              <div className="rounded-[14px] bg-[#25262B] px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="text-[13px] text-[#C8CAD0]">
                  Сегодня день полного отдыха и восстановления мышц.
                </div>
                <Clock className="w-4 h-4 text-[#8E9098] shrink-0" />
              </div>
            )}
          </div>

          {/* 3 компактных кольца прогресса по направлениям спорта */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sportTracks.map((tr) => (
              <div
                key={tr.id}
                className="rounded-[16px] apple-card p-3.5 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-[14px] font-semibold text-white">{tr.label}</div>
                  <div className="text-[12px] text-[#8E9098] tabular-nums">
                    {tr.value} / 100
                  </div>
                </div>
                <SegmentedLevelRing
                  filledSegments={tr.quarter}
                  accentColor={tr.accent}
                  trackColor={tr.track}
                  icon={tr.icon}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ПРАВАЯ КОЛОНКА: Восстановление мышц */}
        <section className="lg:col-span-5 space-y-3.5">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[14px] font-medium text-[#8E9098]">Восстановление мышц</h2>
          </div>

          <div className="rounded-[18px] apple-card divide-y divide-white/[0.06] overflow-hidden">
            {muscleList.map((m) => {
              const isReady = m.percent >= 85;
              const barColor = isReady
                ? '#7ED484'
                : m.percent >= 45
                ? '#E5C97B'
                : '#E5A3BD';

              return (
                <div key={m.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-white/90">{m.label}</span>
                    <span className="text-[12px] text-[#8E9098] tabular-nums">
                      {isReady ? 'Готово' : `${formatDurationMs(m.msRemaining)} · ${m.percent}%`}
                    </span>
                  </div>
                  <div className="h-[4px] w-full rounded-full bg-white/[0.07] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(5, m.percent)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <ExerciseGuideModal exercise={guideExercise} onClose={() => setGuideExercise(null)} />
    </div>
  );
};
