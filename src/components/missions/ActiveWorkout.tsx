import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Dumbbell,
  Info,
  Minus,
  Pencil,
  Plus,
  Search,
  SkipForward,
  Trash2,
  X,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { CATEGORY_META, EXERCISE_LIST, EXERCISES } from '../../data/exercises';
import { Exercise, MissionExerciseTask, WorkoutCategory } from '../../types/game';
import { ExerciseAnimationSvg } from '../exercises/ExerciseAnimationSvg';
import { ExerciseGuideModal } from '../exercises/ExerciseGuideModal';

const WEIGHT_PRESETS = [0, 5, 10, 16, 20, 40];

function formatWeightKg(val: number): string {
  return Number.isInteger(val) ? `${val}` : val.toFixed(1);
}

export const ActiveWorkout: React.FC = () => {
  const {
    state,
    cancelActiveMission,
    completeMission,
    updateFitnessMissionTasks,
  } = useGame();

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
  const [weightExpandedByIdx, setWeightExpandedByIdx] = useState<Record<number, boolean>>({});

  // Edit workout state
  const [isEditing, setIsEditing] = useState(false);
  const [editDraftTasks, setEditDraftTasks] = useState<MissionExerciseTask[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState<WorkoutCategory | 'all'>('all');

  useEffect(() => {
    if (!mission) return;
    const cloned = mission.tasks.map((t) => ({
      ...t,
      weightKg: t.weightKg ?? EXERCISES[t.exerciseId]?.defaultWeightKg,
      completedSets: [],
    }));
    setTasksState(cloned);
    setActiveTaskIdx(0);
    setCurrentValue(cloned[0]?.targetPerSet ?? 8);
    setRestSecondsLeft(0);
    setWeightExpandedByIdx({});
    setIsEditing(false);
  }, [mission?.id]);

  useEffect(() => {
    if (restSecondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setRestSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [restSecondsLeft > 0]);

  const filteredCatalogExercises = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase();
    return EXERCISE_LIST.filter((ex) => {
      const catMatch =
        exerciseCategoryFilter === 'all' || ex.category === exerciseCategoryFilter;
      const textMatch =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.description.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [exerciseSearch, exerciseCategoryFilter]);

  if (!mission || tasksState.length === 0) return null;

  const currentTask = tasksState[activeTaskIdx] ?? tasksState[0];
  const currentExercise = EXERCISES[currentTask.exerciseId];
  const unitLabel =
    currentExercise?.unit === 'seconds'
      ? 'сек'
      : currentExercise?.unit === 'meters'
      ? 'м'
      : 'повт.';

  const showWeightControl =
    Boolean(currentExercise?.supportsWeight) ||
    currentTask.weightKg !== undefined ||
    Boolean(weightExpandedByIdx[activeTaskIdx]);

  const activeWeightKg = currentTask.weightKg ?? 0;

  const totalPlannedSets = tasksState.reduce((acc, t) => acc + t.sets, 0);
  const totalDoneSets = tasksState.reduce((acc, t) => acc + t.completedSets.length, 0);
  const progressPercent = Math.min(
    100,
    Math.round((totalDoneSets / Math.max(1, totalPlannedSets)) * 100)
  );
  const allSetsDone = totalDoneSets >= totalPlannedSets;

  const handleSetTaskWeight = (taskIdx: number, nextKg: number) => {
    const clamped = Math.max(0, Math.round(nextKg * 2) / 2);
    setTasksState((prev) =>
      prev.map((task, idx) =>
        idx === taskIdx ? { ...task, weightKg: clamped } : task
      )
    );
  };

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

  const handleOpenEditor = () => {
    setEditDraftTasks(tasksState.map((t) => ({ ...t })));
    setExerciseSearch('');
    setExerciseCategoryFilter('all');
    setIsEditing(true);
  };

  const handleUpdateDraftTask = (
    idx: number,
    patch: Partial<MissionExerciseTask>
  ) => {
    setEditDraftTasks((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, ...patch } : t))
    );
  };

  const handleRemoveDraftTask = (idx: number) => {
    setEditDraftTasks((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleAddExerciseToDraft = (ex: Exercise) => {
    setEditDraftTasks((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        sets: ex.defaultSets,
        targetPerSet: ex.defaultTarget,
        completedSets: [],
        weightKg: ex.defaultWeightKg,
      },
    ]);
  };

  const handleSaveEditor = () => {
    if (editDraftTasks.length === 0) return;

    const sanitized: MissionExerciseTask[] = editDraftTasks.map((t) => ({
      exerciseId: t.exerciseId,
      sets: Math.max(1, Math.min(12, Math.round(t.sets))),
      targetPerSet: Math.max(1, Math.round(t.targetPerSet)),
      completedSets: t.completedSets.slice(0, Math.max(1, Math.round(t.sets))),
      weightKg:
        t.weightKg !== undefined
          ? Math.max(0, Math.round(t.weightKg * 2) / 2)
          : undefined,
    }));

    updateFitnessMissionTasks(
      mission.id,
      sanitized.map((t) => ({
        exerciseId: t.exerciseId,
        sets: t.sets,
        targetPerSet: t.targetPerSet,
        completedSets: [],
        weightKg: t.weightKg,
      }))
    );

    setTasksState(sanitized);
    const nextIdx = Math.min(activeTaskIdx, sanitized.length - 1);
    setActiveTaskIdx(nextIdx);
    setCurrentValue(sanitized[nextIdx]?.targetPerSet ?? 8);
    setIsEditing(false);
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
        <div className="flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={cancelActiveMission}
            className="w-10 h-10 shrink-0 rounded-full apple-card flex items-center justify-center text-white/90 hover:text-white active:scale-95 transition"
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

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenEditor}
              className="h-9 px-3 rounded-full apple-card-elevated hover:bg-[#32343B] text-[12px] font-semibold text-white inline-flex items-center gap-1.5 active:scale-95 transition"
            >
              <Pencil className="w-3.5 h-3.5 text-[#E5A3BD]" />
              <span className="hidden sm:inline">Изменить тренировку</span>
              <span className="sm:hidden">Изменить</span>
            </button>

            <div className="w-10 text-right text-[14px] font-bold text-[#E5A3BD] tabular-nums">
              {progressPercent}%
            </div>
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
                  Зафиксируй тренировку, чтобы обновить восстановление мышц.
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

                <div className="shrink-0 flex items-center gap-1.5">
                  {!showWeightControl && (
                    <button
                      type="button"
                      onClick={() => {
                        setWeightExpandedByIdx((prev) => ({
                          ...prev,
                          [activeTaskIdx]: true,
                        }));
                        if (currentTask.weightKg === undefined) {
                          handleSetTaskWeight(activeTaskIdx, 0);
                        }
                      }}
                      className="h-9 px-3 rounded-full apple-card-elevated hover:bg-[#32343B] text-[12px] font-semibold text-[#8AE5C3] inline-flex items-center gap-1 active:scale-95 transition"
                    >
                      <Dumbbell className="w-3.5 h-3.5" />
                      <span>+ Вес</span>
                    </button>
                  )}

                  {currentExercise && (
                    <button
                      type="button"
                      onClick={() => setGuideExercise(currentExercise)}
                      className="h-9 px-3 rounded-full apple-card-elevated hover:bg-[#32343B] text-[12px] font-semibold text-white inline-flex items-center gap-1.5 active:scale-95 transition"
                    >
                      <Info className="w-3.5 h-3.5 text-[#E5A3BD]" />
                      <span>Техника</span>
                    </button>
                  )}
                </div>
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

              {/* Working Weight Control (kg) */}
              {showWeightControl && (
                <div className="rounded-[18px] bg-[#131417] border border-white/[0.07] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#8AE5C3]">
                      <Dumbbell className="w-3.5 h-3.5" />
                      <span>Рабочий вес (кг)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleSetTaskWeight(activeTaskIdx, activeWeightKg - 2.5)
                        }
                        className="h-8 px-2.5 rounded-[10px] apple-card-elevated hover:bg-[#3A3A3C] text-[12px] font-semibold text-white active:scale-95 transition tabular-nums"
                      >
                        −2.5
                      </button>
                      <div className="min-w-[74px] text-center text-[15px] font-bold text-white tabular-nums">
                        {formatWeightKg(activeWeightKg)} кг
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleSetTaskWeight(activeTaskIdx, activeWeightKg + 2.5)
                        }
                        className="h-8 px-2.5 rounded-[10px] apple-card-elevated hover:bg-[#3A3A3C] text-[12px] font-semibold text-white active:scale-95 transition tabular-nums"
                      >
                        +2.5
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {WEIGHT_PRESETS.map((kg) => {
                      const active = activeWeightKg === kg;
                      return (
                        <button
                          key={kg}
                          type="button"
                          onClick={() => handleSetTaskWeight(activeTaskIdx, kg)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tabular-nums transition active:scale-95 ${
                            active
                              ? 'bg-[#8AE5C3] text-[#111214]'
                              : 'bg-white/[0.06] text-[#C8CAD0] hover:text-white'
                          }`}
                        >
                          {kg} кг
                        </button>
                      );
                    })}
                  </div>
                </div>
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
                  <div className="mt-1.5 text-[13px] font-medium text-[#98989F]">
                    {unitLabel}
                    {activeWeightKg > 0 ? ` · ${formatWeightKg(activeWeightKg)} кг` : ''}
                  </div>
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
                    <div className="min-w-0">
                      <div
                        className={`text-[14px] font-medium truncate ${
                          done ? 'text-[#636366] line-through' : 'text-white'
                        }`}
                      >
                        {ex?.name ?? task.exerciseId}
                      </div>
                      {task.weightKg !== undefined && task.weightKg > 0 && (
                        <div className="text-[11px] font-medium text-[#8AE5C3] tabular-nums">
                          {formatWeightKg(task.weightKg)} кг
                        </div>
                      )}
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

      {/* Workout Editor Modal */}
      {isEditing && (
        <div
          className="fixed inset-0 z-50 bg-[#0E0F11]/85 backdrop-blur-xl flex items-end sm:items-center justify-center sm:p-6 animate-modal-in"
          onClick={() => setIsEditing(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-[660px] max-h-[92vh] rounded-t-[28px] sm:rounded-[28px] apple-liquid-glass flex flex-col overflow-hidden"
          >
            {/* Editor Header */}
            <div className="shrink-0 px-5 pt-5 pb-3.5 border-b border-white/[0.08] flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E5A3BD]">
                  Фитнес-редактор
                </span>
                <h2 className="mt-0.5 text-[20px] font-bold text-white">
                  Изменить тренировку
                </h2>
                <p className="text-[12px] text-[#8E9098]">{mission.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-9 h-9 rounded-full apple-card-elevated flex items-center justify-center text-[#98989F] hover:text-white active:scale-95 transition"
                aria-label="Закрыть редактор"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Editor Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {/* Current Exercises in Mission */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#8E9098]">
                    Упражнения в плане ({editDraftTasks.length})
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {editDraftTasks.map((task, idx) => {
                    const ex = EXERCISES[task.exerciseId];
                    const step =
                      ex?.unit === 'seconds' ? 5 : ex?.unit === 'meters' ? 50 : 1;
                    const u =
                      ex?.unit === 'seconds'
                        ? 'сек'
                        : ex?.unit === 'meters'
                        ? 'м'
                        : 'повт.';
                    const w = task.weightKg ?? 0;

                    return (
                      <div
                        key={`${task.exerciseId}-${idx}`}
                        className="rounded-[18px] apple-card p-3.5 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold text-white truncate">
                              {ex?.name ?? task.exerciseId}
                            </div>
                            {ex && (
                              <span
                                className="text-[11px] font-medium"
                                style={{ color: CATEGORY_META[ex.category].color }}
                              >
                                {CATEGORY_META[ex.category].label}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={editDraftTasks.length <= 1}
                            onClick={() => handleRemoveDraftTask(idx)}
                            className="shrink-0 w-8 h-8 rounded-full hover:bg-white/[0.08] text-[#8E9098] hover:text-[#FF6B8B] disabled:opacity-30 flex items-center justify-center transition"
                            aria-label="Удалить упражнение"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* Sets */}
                          <div className="rounded-[12px] bg-[#131417] border border-white/[0.06] px-3 py-2 flex items-center justify-between">
                            <span className="text-[11px] text-[#8E9098]">Подходы</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateDraftTask(idx, {
                                    sets: Math.max(1, task.sets - 1),
                                  })
                                }
                                className="w-7 h-7 rounded-[8px] apple-card-elevated flex items-center justify-center text-white"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center text-[13px] font-bold text-white tabular-nums">
                                {task.sets}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateDraftTask(idx, {
                                    sets: Math.min(12, task.sets + 1),
                                  })
                                }
                                className="w-7 h-7 rounded-[8px] apple-card-elevated flex items-center justify-center text-white"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Target */}
                          <div className="rounded-[12px] bg-[#131417] border border-white/[0.06] px-3 py-2 flex items-center justify-between">
                            <span className="text-[11px] text-[#8E9098]">Цель ({u})</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateDraftTask(idx, {
                                    targetPerSet: Math.max(step, task.targetPerSet - step),
                                  })
                                }
                                className="w-7 h-7 rounded-[8px] apple-card-elevated flex items-center justify-center text-white"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="min-w-[30px] text-center text-[13px] font-bold text-white tabular-nums">
                                {task.targetPerSet}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateDraftTask(idx, {
                                    targetPerSet: task.targetPerSet + step,
                                  })
                                }
                                className="w-7 h-7 rounded-[8px] apple-card-elevated flex items-center justify-center text-white"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Weight */}
                          <div className="rounded-[12px] bg-[#131417] border border-white/[0.06] px-3 py-2 flex items-center justify-between">
                            <span className="text-[11px] text-[#8E9098]">Вес (кг)</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateDraftTask(idx, {
                                    weightKg: Math.max(0, w - 2.5),
                                  })
                                }
                                className="w-7 h-7 rounded-[8px] apple-card-elevated flex items-center justify-center text-white"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="min-w-[36px] text-center text-[13px] font-bold text-[#8AE5C3] tabular-nums">
                                {formatWeightKg(w)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateDraftTask(idx, {
                                    weightKg: w + 2.5,
                                  })
                                }
                                className="w-7 h-7 rounded-[8px] apple-card-elevated flex items-center justify-center text-white"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Exercise From Catalog */}
              <div className="space-y-3 pt-2 border-t border-white/[0.08]">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#8E9098]">
                  Добавить упражнение из базы
                </h3>

                <div className="relative">
                  <Search className="w-4 h-4 text-[#636366] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    placeholder="Поиск упражнения (турник, брусья, гантели...)"
                    className="w-full h-10 pl-10 pr-3.5 rounded-[12px] bg-[#131417] border border-white/[0.08] text-[13px] text-white placeholder-[#636366] focus:outline-none focus:border-[#E5A3BD]/60"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setExerciseCategoryFilter('all')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                      exerciseCategoryFilter === 'all'
                        ? 'bg-white text-[#111214]'
                        : 'apple-card-elevated text-[#98989F] hover:text-white'
                    }`}
                  >
                    Все
                  </button>
                  {(Object.keys(CATEGORY_META) as WorkoutCategory[]).map((cat) => {
                    const meta = CATEGORY_META[cat];
                    const active = exerciseCategoryFilter === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setExerciseCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                          active
                            ? 'bg-white text-[#111214]'
                            : 'apple-card-elevated text-[#98989F] hover:text-white'
                        }`}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-[16px] bg-[#131417] border border-white/[0.07] divide-y divide-white/[0.06] max-h-56 overflow-y-auto">
                  {filteredCatalogExercises.map((ex) => {
                    const u =
                      ex.unit === 'seconds'
                        ? 'сек'
                        : ex.unit === 'meters'
                        ? 'м'
                        : 'повт.';
                    return (
                      <div
                        key={ex.id}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-2.5"
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-white truncate">
                            {ex.name}
                          </div>
                          <div className="text-[11px] text-[#8E9098] tabular-nums">
                            {CATEGORY_META[ex.category].label} · {ex.defaultSets}×{ex.defaultTarget} {u}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddExerciseToDraft(ex)}
                          className="shrink-0 h-8 px-3 rounded-[10px] apple-card-elevated hover:bg-[#32343B] text-[12px] font-semibold text-[#8AE5C3] inline-flex items-center gap-1 active:scale-95 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Добавить</span>
                        </button>
                      </div>
                    );
                  })}
                  {filteredCatalogExercises.length === 0 && (
                    <div className="p-4 text-center text-[12px] text-[#8E9098]">
                      Упражнения не найдены
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Editor Footer */}
            <div className="shrink-0 px-5 py-4 border-t border-white/[0.08] flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="h-11 px-5 rounded-[14px] apple-card-elevated text-[14px] font-semibold text-[#D1D3D9] hover:text-white active:scale-[0.98] transition"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveEditor}
                className="flex-1 h-11 rounded-[14px] apple-sunset-cta text-[#111214] text-[14px] font-semibold active:scale-[0.98] transition"
              >
                Сохранить изменения
              </button>
            </div>
          </div>
        </div>
      )}

      <ExerciseGuideModal exercise={guideExercise} onClose={() => setGuideExercise(null)} />
    </div>
  );
};
