import React, { useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Info,
  Play,
  SlidersHorizontal,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { EXERCISES } from '../../data/exercises';
import { Exercise, Mission } from '../../types/game';
import { ExerciseGuideModal } from '../exercises/ExerciseGuideModal';

function getTodayIndex(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function formatRestLabel(seconds: number): string {
  if (seconds >= 120 && seconds % 60 === 0) return `${seconds / 60} мин`;
  if (seconds >= 120) return `${Math.floor(seconds / 60)}м ${seconds % 60}с`;
  return `${seconds} сек`;
}

export const MissionMap: React.FC = () => {
  const { state, now, startMission, setIsOnboardingOpen } = useGame();

  const todayIdx = getTodayIndex();
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(todayIdx);
  const [guideExercise, setGuideExercise] = useState<Exercise | null>(null);

  const schedule = state.activePlan.weeklySchedule || [];
  const selectedDay = schedule[selectedDayIdx] ?? schedule[0];
  const selectedMission: Mission | undefined = selectedDay?.primaryMissionId
    ? state.missions.find((m) => m.id === selectedDay.primaryMissionId)
    : undefined;

  const todayKey = new Date(now).toISOString().slice(0, 10);
  const completedTodayIds = useMemo(() => {
    return new Set(
      state.history
        .filter((h) => new Date(h.completedAt).toISOString().slice(0, 10) === todayKey)
        .map((h) => h.missionId)
    );
  }, [state.history, todayKey]);

  return (
    <div className="px-5 md:px-0 pt-5 pb-6 space-y-6">
      {/* Чистая шапка */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[12px] font-medium text-[#E5A3BD]">Группа миссий: Спорт</span>
          <h1 className="mt-0.5 text-[28px] md:text-[32px] font-semibold tracking-[-0.025em] text-white leading-tight">
            План на неделю
          </h1>
          <p className="mt-1 text-[13px] text-[#8E9098]">
            На каждый день — одна конкретная тренировка без лишнего выбора.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOnboardingOpen(true)}
          className="lg:hidden shrink-0 mt-1 h-9 px-3.5 rounded-full apple-card-elevated text-[13px] font-medium text-white inline-flex items-center gap-1.5 hover:bg-[#32343B] active:scale-95 transition"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#E5A3BD]" />
          <span>Настроить</span>
        </button>
      </header>

      {/* Полоса 7 дней недели */}
      <div className="grid grid-cols-7 gap-1.5 md:gap-2.5">
        {schedule.map((day, idx) => {
          const isSelected = idx === selectedDayIdx;
          const isToday = idx === todayIdx;
          const isDoneToday =
            isToday && day.primaryMissionId ? completedTodayIds.has(day.primaryMissionId) : false;

          return (
            <button
              key={day.dayNumber}
              type="button"
              onClick={() => setSelectedDayIdx(idx)}
              className={`py-2.5 md:py-3 rounded-[14px] flex flex-col items-center gap-1.5 transition active:scale-95 ${
                isSelected
                  ? 'bg-white text-[#111214]'
                  : isToday
                  ? 'apple-card-active text-white'
                  : 'apple-card text-[#8E9098] hover:text-white'
              }`}
            >
              <span className="text-[12px] font-semibold">{day.dayShort}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isDoneToday
                    ? 'bg-[#7ED484]'
                    : isSelected
                    ? day.isRecoveryDay
                      ? 'bg-[#7ED484]'
                      : 'bg-[#111214]'
                    : day.isRecoveryDay
                    ? 'bg-[#7ED484]/60'
                    : 'bg-[#E5A3BD]'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Основная сетка: слева выбранный день подробно, справа вся неделя */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Подробная карточка выбранного дня */}
        {selectedDay && (
          <section className="lg:col-span-6 rounded-[20px] apple-card-active p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[12px] font-medium text-[#E5A3BD]">
                  {selectedDayIdx === todayIdx ? 'Сегодня' : selectedDay.dayShort} ·{' '}
                  {selectedDay.isRecoveryDay ? 'Восстановление' : 'Тренировка'}
                </span>
                <h2 className="mt-1 text-[21px] font-semibold text-white leading-snug">
                  {selectedMission ? selectedMission.title : selectedDay.title}
                </h2>
              </div>

              {selectedDayIdx === todayIdx &&
                selectedMission &&
                completedTodayIds.has(selectedMission.id) && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7ED484]/15 text-[#7ED484] text-[12px] font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    Выполнено
                  </span>
                )}
            </div>

            {selectedMission ? (
              <>
                <div className="rounded-[14px] bg-[#131417] border border-white/[0.06] divide-y divide-white/[0.06] overflow-hidden">
                  {selectedMission.tasks.map((t, idx) => {
                    const ex = EXERCISES[t.exerciseId];
                    if (!ex) return null;
                    const u = ex.unit === 'seconds' ? 'сек' : ex.unit === 'meters' ? 'м' : 'повт.';
                    return (
                      <button
                        key={`${t.exerciseId}-${idx}`}
                        type="button"
                        onClick={() => setGuideExercise(ex)}
                        className="w-full px-3.5 py-3 flex items-center justify-between gap-3 text-left hover:bg-white/[0.03] transition"
                      >
                        <div className="min-w-0">
                          <div className="text-[14px] text-white/95 font-medium truncate">
                            {ex.name}
                          </div>
                          <div className="mt-0.5 text-[12px] text-[#8E9098] tabular-nums">
                            {t.sets} подх. × {t.targetPerSet} {u} · отдых{' '}
                            {formatRestLabel(ex.restSeconds)}
                          </div>
                        </div>
                        <Info className="w-4 h-4 text-[#E5A3BD] shrink-0" />
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => startMission(selectedMission.id)}
                  className="w-full h-12 rounded-[14px] apple-sunset-cta text-[#111214] text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition"
                >
                  <Play className="w-4 h-4 fill-[#111214]" />
                  <span>
                    {selectedDayIdx === todayIdx
                      ? 'Начать тренировку'
                      : `Выполнить тренировку (${selectedDay.dayShort})`}
                  </span>
                </button>
              </>
            ) : (
              <div className="rounded-[14px] bg-[#25262B] px-4 py-4 flex items-center justify-between gap-3 text-[13px] text-[#C8CAD0]">
                <span>День отдыха — мышцы восстанавливаются перед следующей нагрузкой.</span>
                <Clock className="w-4 h-4 text-[#8E9098] shrink-0" />
              </div>
            )}
          </section>
        )}

        {/* Чистый список всех 7 дней недели */}
        <section className="lg:col-span-6 space-y-2.5">
          <h3 className="text-[14px] font-medium text-[#8E9098] px-0.5">Расписание по дням</h3>
          <div className="rounded-[18px] apple-card divide-y divide-white/[0.06] overflow-hidden">
            {schedule.map((day, idx) => {
              const m = day.primaryMissionId
                ? state.missions.find((item) => item.id === day.primaryMissionId)
                : undefined;
              const isToday = idx === todayIdx;
              const isSelected = idx === selectedDayIdx;
              const isDone = isToday && m ? completedTodayIds.has(m.id) : false;

              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  onClick={() => setSelectedDayIdx(idx)}
                  className={`w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition ${
                    isSelected ? 'bg-white/[0.05]' : 'hover:bg-white/[0.025]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-9 h-9 rounded-[11px] flex items-center justify-center text-[12px] font-semibold shrink-0 ${
                        isToday
                          ? 'bg-[#E5A3BD] text-[#111214]'
                          : 'bg-[#25262B] text-[#C8CAD0]'
                      }`}
                    >
                      {day.dayShort}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-white truncate">
                        {m ? m.title : day.title}
                      </div>
                      <div className="text-[12px] text-[#8E9098] truncate">
                        {m
                          ? `${m.tasks.length} упр. · +${m.rewards.respectXp} XP`
                          : 'Отдых и восстановление'}
                      </div>
                    </div>
                  </div>

                  {isDone ? (
                    <span className="shrink-0 w-7 h-7 rounded-full bg-[#7ED484]/15 text-[#7ED484] flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </span>
                  ) : isToday ? (
                    <span className="shrink-0 text-[11px] font-semibold text-[#E5A3BD]">
                      Сегодня
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <ExerciseGuideModal exercise={guideExercise} onClose={() => setGuideExercise(null)} />
    </div>
  );
};
