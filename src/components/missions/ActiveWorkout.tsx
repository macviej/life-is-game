import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Info, Minus, Plus, SkipForward } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { EXERCISES } from '../../data/exercises';
import { Exercise, MissionExerciseTask } from '../../types/game';
import { ExerciseAnimationSvg } from '../exercises/ExerciseAnimationSvg';
import { ExerciseGuideModal } from '../exercises/ExerciseGuideModal';

export const ActiveWorkout: React.FC = () => {
  const { state, cancelActiveMission, completeMission } = useGame();

  const mission = useMemo(
    () => state.missions.find((m) => m.id === state.activeMissionId) ?? null,
    [state.missions, state.activeMissionId]
  );

  const [tasksState, setTasksState] = useState<MissionExerciseTask[]>([]);
  const [activeTaskIdx, setActiveTaskIdx] = useState(0);
  const [currentValue, setCurrentValue] = useState(1);
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [restTotalSeconds, setRestTotalSeconds] = useState(90);
  const [guideExercise, setGuideExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    if (!mission) return;
    const cloned = mission.tasks.map((t) => ({
      ...t,
      completedSets: [],
    }));
    setTasksState(cloned);
    setActiveTaskIdx(0);
    setCurrentValue(cloned[0]?.targetPerSet ?? 8);
    setRestSecondsLeft(0);
  }, [mission?.id]);

  useEffect(() => {
    if (restSecondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setRestSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [restSecondsLeft > 0]);

  if (!mission || tasksState.length === 0) return null;

  const currentTask = tasksState[activeTaskIdx] ?? tasksState[0];
  const currentExercise = EXERCISES[currentTask.exerciseId];
  const unitLabel =
    currentExercise?.unit === 'seconds'
      ? 'сек'
      : currentExercise?.unit === 'meters'
      ? 'м'
      : 'повт.';

  const totalPlannedSets = tasksState.reduce((acc, t) => acc + t.sets, 0);
  const totalDoneSets = tasksState.reduce((acc, t) => acc + t.completedSets.length, 0);
  const progressPercent = Math.min(
    100,
    Math.round((totalDoneSets / Math.max(1, totalPlannedSets)) * 100)
  );
  const allSetsDone = totalDoneSets >= totalPlannedSets;

  const handleCompleteSet = () => {
    const updated = tasksState.map((task, idx) =>
      idx === activeTaskIdx
        ? { ...task, completedSets: [...task.completedSets, currentValue] }
        : task
    );
    setTasksState(updated);

    const updatedCurrent = updated[activeTaskIdx];
    const nextIncompleteIdx = updated.findIndex((t) => t.completedSets.length < t.sets);

    if (nextIncompleteIdx !== -1) {
      const rest = currentExercise?.restSeconds ?? 90;
      setRestTotalSeconds(rest);
      setRestSecondsLeft(rest);

      if (updatedCurrent.completedSets.length >= updatedCurrent.sets) {
        setActiveTaskIdx(nextIncompleteIdx);
        setCurrentValue(updated[nextIncompleteIdx].targetPerSet);
      }
    } else {
      setRestSecondsLeft(0);
    }
  };

  const handleFinish = () => {
    completeMission(mission.id, tasksState);
  };

  const ringRadius = 68;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference -
    ((restSecondsLeft / Math.max(1, restTotalSeconds)) * ringCircumference);

  const restMinutes = Math.floor(restSecondsLeft / 60);
  const restSecs = restSecondsLeft % 60;

  return (
    <div className="min-h-screen lg:min-h-0 w-full px-5 md:px-0 pt-4 md:pt-6 pb-10 flex flex-col gap-6">
      {/* Apple Watch / Fitness+ Top Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={cancelActiveMission}
            className="w-10 h-10 rounded-full apple-card flex items-center justify-center text-white/90 hover:text-white active:scale-95 transition"
            aria-label="Выйти из тренировки"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>

          <div className="text-center min-w-0 flex-1">
            <div className="text-[16px] md:text-[18px] font-semibold tracking-[-0.01em] text-white truncate">
              {mission.title}
            </div>
            <div className="text-[12px] text-[#98989F] tabular-nums">
              {totalDoneSets} из {totalPlannedSets} подходов
            </div>
          </div>

          <div className="w-10 text-right text-[14px] font-bold text-[#E5A3BD] tabular-nums">
            {progressPercent}%
          </div>
        </div>

        <div className="h-[4px] w-full rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full apple-sunset-cta transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Responsive 2-column Studio on Tablet/Desktop, Single Column on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
      <div className="lg:col-span-7">

      {/* Main Focus Card: Glowing Rest Ring OR Active Set Stepper */}
      {restSecondsLeft > 0 ? (
        <div className="rounded-[28px] apple-card p-6 flex flex-col items-center text-center space-y-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#98989F]">
            Отдых между подходами
          </span>

          <div className="relative w-[168px] h-[168px] flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <defs>
                <linearGradient id="restRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E5A3BD" />
                  <stop offset="100%" stopColor="#8AE5C3" />
                </linearGradient>
              </defs>
              <circle
                cx="80"
                cy="80"
                r={ringRadius}
                fill="none"
                stroke="rgba(255, 55, 95, 0.16)"
                strokeWidth="10"
              />
              <circle
                cx="80"
                cy="80"
                r={ringRadius}
                fill="none"
                stroke="url(#restRingGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-all duration-500"
                style={{ filter: 'drop-shadow(0 0 8px rgba(255, 55, 95, 0.45))' }}
              />
            </svg>
            <span className="absolute text-[40px] font-bold tracking-[-0.03em] text-white tabular-nums">
              {restMinutes}:{String(restSecs).padStart(2, '0')}
            </span>
          </div>

          <div className="w-full grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setRestSecondsLeft((s) => s + 30);
                setRestTotalSeconds((t) => Math.max(t, restSecondsLeft + 30));
              }}
              className="h-[50px] rounded-[16px] apple-card-elevated hover:bg-[#3A3A3C] text-white text-[15px] font-semibold active:scale-[0.97] transition"
            >
              +30 сек
            </button>
            <button
              type="button"
              onClick={() => setRestSecondsLeft(0)}
              className="h-[50px] rounded-[16px] bg-white text-black text-[15px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.97] transition"
            >
              <SkipForward className="w-4 h-4" />
              <span>Готов</span>
            </button>
          </div>
        </div>
      ) : allSetsDone ? (
        <div className="rounded-[28px] apple-card p-6 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#30D158]/15 text-[#30D158] flex items-center justify-center shadow-[0_0_24px_rgba(48,209,88,0.22)]">
            <Check className="w-8 h-8 stroke-[2.6]" />
          </div>
          <div>
            <h2 className="text-[24px] font-bold tracking-[-0.02em] text-white">
              Все подходы выполнены
            </h2>
            <p className="mt-1.5 text-[14px] text-[#98989F] leading-relaxed">
              Зафиксируй тренировку, чтобы получить опыт и обновить восстановление мышц.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFinish}
            className="w-full h-[54px] rounded-[18px] apple-sunset-cta text-[#111214] text-[16px] font-semibold active:scale-[0.97] transition"
          >
            Завершить тренировку
          </button>
        </div>
      ) : (
        <div className="rounded-[28px] apple-card p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#E5A3BD] tabular-nums">
                Подход {Math.min(currentTask.completedSets.length + 1, currentTask.sets)} из{' '}
                {currentTask.sets} · Отдых {currentExercise?.restSeconds ?? 90} сек
              </span>
              <h2 className="text-[22px] sm:text-[24px] font-bold tracking-[-0.025em] text-white leading-snug">
                {currentExercise?.name ?? currentTask.exerciseId}
              </h2>
            </div>

            {currentExercise && (
              <button
                type="button"
                onClick={() => setGuideExercise(currentExercise)}
                className="shrink-0 h-9 px-3 rounded-full apple-card-elevated hover:bg-[#32343B] text-[12px] font-semibold text-white inline-flex items-center gap-1.5 active:scale-95 transition"
              >
                <Info className="w-3.5 h-3.5 text-[#E5A3BD]" />
                <span>Техника</span>
              </button>
            )}
          </div>

          {/* Live 3D Side-Profile Athlete Demonstration */}
          <ExerciseAnimationSvg
            exerciseId={currentTask.exerciseId}
            className="w-full h-48 sm:h-56"
          />

          {currentExercise?.techniqueTip && (
            <p className="text-[13px] text-[#98989F] leading-relaxed text-center px-1">
              {currentExercise.techniqueTip}
            </p>
          )}

          {/* Apple Watch Style Big Crisp Stepper */}
          <div className="flex items-center justify-between gap-4 px-2">
            <button
              type="button"
              onClick={() =>
                setCurrentValue((v) =>
                  Math.max(1, v - (currentExercise?.unit === 'seconds' ? 5 : 1))
                )
              }
              className="w-14 h-14 rounded-full apple-card-elevated hover:bg-[#3A3A3C] flex items-center justify-center text-white active:scale-95 transition"
              aria-label="Уменьшить"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="text-[56px] font-bold tracking-[-0.04em] leading-none text-white tabular-nums">
                {currentValue}
              </div>
              <div className="mt-1.5 text-[13px] font-medium text-[#98989F]">{unitLabel}</div>
            </div>

            <button
              type="button"
              onClick={() =>
                setCurrentValue((v) => v + (currentExercise?.unit === 'seconds' ? 5 : 1))
              }
              className="w-14 h-14 rounded-full apple-card-elevated hover:bg-[#3A3A3C] flex items-center justify-center text-white active:scale-95 transition"
              aria-label="Увеличить"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleCompleteSet}
            className="w-full h-[54px] rounded-[18px] apple-sunset-cta text-[#111214] text-[16px] font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition"
          >
            <Check className="w-5 h-5 stroke-[2.6]" />
            <span>Засчитать подход</span>
          </button>
        </div>
      )}
      </div>

      {/* Apple Health Inset Grouped Exercise Checklist */}
      <div className="lg:col-span-5 space-y-2.5">
        <div className="rounded-[24px] apple-card divide-y divide-white/[0.07] overflow-hidden">
          {tasksState.map((task, idx) => {
            const ex = EXERCISES[task.exerciseId];
            const done = task.completedSets.length >= task.sets;
            const isCurrent = idx === activeTaskIdx && !allSetsDone;
            return (
              <button
                key={`${task.exerciseId}-${idx}`}
                type="button"
                onClick={() => {
                  setActiveTaskIdx(idx);
                  setCurrentValue(task.targetPerSet);
                }}
                className={`w-full px-4 py-3.5 flex items-center justify-between text-left transition ${
                  isCurrent ? 'bg-[#E5A3BD]/[0.10]' : 'hover:bg-white/[0.025]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-3">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      done
                        ? 'bg-[#30D158]'
                        : isCurrent
                        ? 'bg-[#E5A3BD]'
                        : 'bg-white/20'
                    }`}
                  />
                  <div
                    className={`text-[14px] font-medium truncate ${
                      done ? 'text-[#636366] line-through' : 'text-white'
                    }`}
                  >
                    {ex?.name ?? task.exerciseId}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#98989F] tabular-nums">
                    {task.completedSets.length}/{task.sets}
                  </span>
                  {done && <Check className="w-4 h-4 text-[#30D158]" />}
                  {ex && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setGuideExercise(ex);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          setGuideExercise(ex);
                        }
                      }}
                      className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-[#8E9098] hover:text-white transition"
                      aria-label={`Техника: ${ex.name}`}
                    >
                      <Info className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {totalDoneSets > 0 && !allSetsDone && (
          <button
            type="button"
            onClick={handleFinish}
            className="w-full h-11 rounded-[16px] apple-card text-[#98989F] hover:text-white text-[14px] font-medium transition active:scale-[0.98] tabular-nums"
          >
            Завершить досрочно ({totalDoneSets}/{totalPlannedSets})
          </button>
        )}
      </div>
      </div>

      <ExerciseGuideModal exercise={guideExercise} onClose={() => setGuideExercise(null)} />
    </div>
  );
};
