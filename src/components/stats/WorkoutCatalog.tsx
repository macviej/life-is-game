import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Dumbbell,
  Filter,
  HeartPulse,
  Info,
  Minus,
  Plus,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import {
  CATEGORY_META,
  EQUIPMENT_LIST,
  EXERCISE_LIST,
  EXERCISES,
} from '../../data/exercises';
import { playRadarBlipSound } from '../../engine/soundEffects';
import { EquipmentId, Exercise, MuscleGroup, WorkoutCategory } from '../../types/game';

const CATEGORIES: Array<{
  id: 'all' | WorkoutCategory;
  label: string;
  activeClass: string;
}> = [
  {
    id: 'all',
    label: 'Все',
    activeClass:
      'bg-gradient-to-r from-[#FF4D8D] to-[#FF8A4C] text-[#0E0A18] border-transparent shadow-sunset-glow',
  },
  {
    id: 'pullup_bar',
    label: 'Турник',
    activeClass: 'bg-[#00DFC8]/18 text-[#00DFC8] border-[#00DFC8]/50',
  },
  {
    id: 'calisthenics',
    label: 'Воркаут',
    activeClass: 'bg-[#FF4D8D]/18 text-[#FF4D8D] border-[#FF4D8D]/50',
  },
  {
    id: 'gym_iron',
    label: 'Железо',
    activeClass: 'bg-[#A855F7]/20 text-[#C084FC] border-[#A855F7]/50',
  },
  {
    id: 'cardio_street',
    label: 'Кардио',
    activeClass: 'bg-[#FFD166]/18 text-[#FFD166] border-[#FFD166]/50',
  },
  {
    id: 'mobility_hp',
    label: 'Здоровье',
    activeClass: 'bg-[#10E598]/18 text-[#10E598] border-[#10E598]/50',
  },
];

const MUSCLE_SHORT: Record<MuscleGroup, string> = {
  back_biceps: 'Спина и бицепс',
  chest_triceps: 'Грудь и трицепс',
  shoulders: 'Плечи',
  core: 'Пресс / Кор',
  legs: 'Ноги',
  cns_cardio: 'ЦНС и сердце',
};

interface ExerciseQuickLogState {
  sets: number;
  amount: number;
}

export const WorkoutCatalog: React.FC = () => {
  const { state, quickLogFreeExercise } = useGame();

  const [selectedCategory, setSelectedCategory] = useState<'all' | WorkoutCategory>('all');
  const [onlyMyEquipment, setOnlyMyEquipment] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inputsByExercise, setInputsByExercise] = useState<
    Record<string, ExerciseQuickLogState>
  >({});
  const [loggedId, setLoggedId] = useState<string | null>(null);

  const equipmentMap = useMemo(() => {
    const map: Partial<Record<EquipmentId, { label: string; icon: string }>> = {};
    for (const eq of EQUIPMENT_LIST) {
      map[eq.id] = { label: eq.label, icon: eq.icon };
    }
    return map;
  }, []);

  const availableEquipmentSet = useMemo(
    () => new Set<EquipmentId>(state.activePlan?.availableEquipment ?? []),
    [state.activePlan?.availableEquipment]
  );

  const enabledExerciseSet = useMemo(
    () => new Set<string>(state.activePlan?.enabledExerciseIds ?? []),
    [state.activePlan?.enabledExerciseIds]
  );

  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EXERCISE_LIST.filter((ex) => {
      if (selectedCategory !== 'all' && ex.category !== selectedCategory) return false;
      if (onlyMyEquipment && availableEquipmentSet.size > 0) {
        if (ex.requiredEquipment && !availableEquipmentSet.has(ex.requiredEquipment)) {
          return false;
        }
      }
      if (!q) return true;
      return (
        ex.name.toLowerCase().includes(q) ||
        ex.description.toLowerCase().includes(q) ||
        ex.techniqueTip.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, onlyMyEquipment, availableEquipmentSet, searchQuery]);

  const getValues = (ex: Exercise): ExerciseQuickLogState => {
    const base = EXERCISES[ex.id] ?? ex;
    return (
      inputsByExercise[ex.id] || {
        sets: base.defaultSets,
        amount: base.defaultTarget,
      }
    );
  };

  const updateValues = (ex: Exercise, patch: Partial<ExerciseQuickLogState>) => {
    const current = getValues(ex);
    setInputsByExercise((prev) => ({
      ...prev,
      [ex.id]: {
        sets: Math.max(1, Math.min(20, patch.sets ?? current.sets)),
        amount: Math.max(1, patch.amount ?? current.amount),
      },
    }));
  };

  const handleQuickLog = (ex: Exercise) => {
    const { sets, amount } = getValues(ex);
    if (state.soundEnabled) {
      playRadarBlipSound();
    }
    quickLogFreeExercise(ex.id, sets, amount);
    setLoggedId(ex.id);
    window.setTimeout(() => {
      setLoggedId((prev) => (prev === ex.id ? null : prev));
    }, 2200);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Шапка и панель фильтров */}
      <section className="sunset-card-warm rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF4D8D]">
              SOLIS BAY EXERCISE LIBRARY
            </div>
            <h1 className="mt-1 font-display font-extrabold text-2xl sm:text-3xl text-[#F8F5FF]">
              КАТАЛОГ ТРЕНИРОВОК
            </h1>
            <p className="text-xs sm:text-sm text-[#9F95B8] mt-1">
              Записывайте любые свободные подходы вне миссий — характеристики, баланс и таймеры регенерации обновятся сразу.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            {/* Переключатель «Только мой инвентарь» */}
            <button
              type="button"
              onClick={() => {
                if (state.soundEnabled) playRadarBlipSound();
                setOnlyMyEquipment((prev) => !prev);
              }}
              aria-pressed={onlyMyEquipment}
              className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border text-xs font-semibold transition shrink-0 ${
                onlyMyEquipment
                  ? 'bg-[#00DFC8]/16 border-[#00DFC8]/50 text-[#00DFC8]'
                  : 'bg-[#0E0A18]/65 border-white/[0.1] text-[#9F95B8] hover:text-[#F8F5FF] hover:border-white/20'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Только мой инвентарь</span>
              <span
                className={`h-2 w-2 rounded-full ${
                  onlyMyEquipment ? 'bg-[#00DFC8]' : 'bg-white/20'
                }`}
              />
            </button>

            {/* Поиск */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#9F95B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск упражнения..."
                className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-2xl bg-[#0E0A18]/75 border border-white/[0.1] focus:border-[#FF8A4C] focus:outline-none text-sm text-[#F8F5FF] placeholder:text-[#9F95B8]/70 transition"
              />
            </div>
          </div>
        </div>

        {/* Категории */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            const label =
              cat.id === 'all' ? cat.label : CATEGORY_META[cat.id]?.label || cat.label;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (state.soundEnabled) playRadarBlipSound();
                  setSelectedCategory(cat.id);
                }}
                className={`shrink-0 px-4 py-2.5 rounded-2xl border text-xs font-bold transition ${
                  active
                    ? cat.activeClass
                    : 'bg-[#0E0A18]/50 border-white/[0.08] text-[#9F95B8] hover:border-white/20 hover:text-[#F8F5FF]'
                }`}
              >
                {cat.id === 'mobility_hp' ? 'Здоровье' : label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Сетка упражнений */}
      {filteredExercises.length === 0 ? (
        <div className="sunset-card rounded-3xl p-10 text-center space-y-2">
          <div className="text-base font-semibold text-[#F8F5FF]">
            По выбранным фильтрам ничего не найдено
          </div>
          <p className="text-sm text-[#9F95B8]">
            Попробуйте сбросить поиск или отключить фильтр «Только мой инвентарь».
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredExercises.map((ex) => {
            const vals = getValues(ex);
            const unitLabel =
              ex.unit === 'seconds' ? 'сек' : ex.unit === 'meters' ? 'м' : 'повт.';
            const step = ex.unit === 'seconds' ? 5 : ex.unit === 'meters' ? 10 : 1;
            const isJustLogged = loggedId === ex.id;
            const catMeta = CATEGORY_META[ex.category];
            const catColor = catMeta?.color || '#00DFC8';
            const equipInfo = ex.requiredEquipment ? equipmentMap[ex.requiredEquipment] : undefined;
            const isInPlan = enabledExerciseSet.has(ex.id);

            return (
              <article
                key={ex.id}
                className="sunset-card rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-5 transition hover:border-white/[0.16]"
              >
                <div className="space-y-3.5">
                  {/* Верхняя строка: категория + доступность + регенерация */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                      style={{
                        color: catColor,
                        backgroundColor: `${catColor}18`,
                        borderColor: `${catColor}40`,
                      }}
                    >
                      {catMeta?.label || ex.category}
                    </span>

                    <div className="flex items-center gap-2">
                      {isInPlan ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#10E598]/12 text-[#10E598] border border-[#10E598]/30">
                          <Sparkles className="w-3 h-3" />
                          В твоём плане
                        </span>
                      ) : equipInfo ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.05] text-[#9F95B8] border border-white/[0.08]">
                          <span>{equipInfo.icon}</span>
                          <span>{equipInfo.label}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display font-bold text-lg text-[#F8F5FF] leading-snug">
                      {ex.name}
                    </h3>
                    <p className="mt-1.5 text-xs text-[#9F95B8] leading-relaxed">
                      {ex.description}
                    </p>
                  </div>

                  {/* Целевые мышцы */}
                  <div className="flex flex-wrap gap-1.5">
                    {ex.primaryMuscles.map((m) => (
                      <span
                        key={m}
                        className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-[#FF4D8D]/14 text-[#FF4D8D] border border-[#FF4D8D]/25"
                      >
                        {state.muscleRecovery[m]?.label || MUSCLE_SHORT[m] || m}
                      </span>
                    ))}
                    {ex.secondaryMuscles.map((m) => (
                      <span
                        key={m}
                        className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-white/[0.04] text-[#9F95B8] border border-white/[0.07]"
                      >
                        {MUSCLE_SHORT[m] || m}
                      </span>
                    ))}
                  </div>

                  {/* Совет по технике */}
                  <div className="rounded-2xl bg-[#0E0A18]/65 border border-white/[0.07] p-3 flex items-start gap-2.5 text-xs text-[#F8F5FF]/85 leading-relaxed">
                    <Info className="w-4 h-4 text-[#FFD166] shrink-0 mt-0.5" />
                    <span>{ex.techniqueTip}</span>
                  </div>

                  {/* Награды и время восстановления */}
                  <div className="flex items-center justify-between gap-2 text-xs font-mono font-semibold tabular-nums pt-0.5">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-[#FFD166]">
                        <Zap className="w-3.5 h-3.5" />+{ex.xpPerSet} XP
                      </span>
                      <span className="text-[#10E598]">+${ex.cashPerSet}</span>
                      {ex.healthBonus > 0 && (
                        <span className="inline-flex items-center gap-1 text-[#00DFC8]">
                          <HeartPulse className="w-3.5 h-3.5" />+{ex.healthBonus} HP
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[#9F95B8]">
                      <Clock className="w-3.5 h-3.5" />
                      {ex.recoveryHours}ч
                    </span>
                  </div>
                </div>

                {/* Быстрый лог подхода / тренировки */}
                <div className="pt-4 border-t border-white/[0.08] space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Подходы */}
                    <div className="flex items-center justify-between rounded-2xl bg-[#0E0A18]/80 border border-white/[0.08] p-1">
                      <button
                        type="button"
                        onClick={() => updateValues(ex, { sets: vals.sets - 1 })}
                        className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] flex items-center justify-center text-[#F8F5FF] transition active:scale-95"
                        aria-label="Уменьшить подходы"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="text-center">
                        <div className="font-mono font-bold text-sm text-[#F8F5FF] tabular-nums">
                          {vals.sets}
                        </div>
                        <div className="text-[10px] text-[#9F95B8] uppercase">подх.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateValues(ex, { sets: vals.sets + 1 })}
                        className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] flex items-center justify-center text-[#F8F5FF] transition active:scale-95"
                        aria-label="Увеличить подходы"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Повторения / секунды */}
                    <div className="flex items-center justify-between rounded-2xl bg-[#0E0A18]/80 border border-white/[0.08] p-1">
                      <button
                        type="button"
                        onClick={() => updateValues(ex, { amount: vals.amount - step })}
                        className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] flex items-center justify-center text-[#F8F5FF] transition active:scale-95"
                        aria-label="Уменьшить количество"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="text-center">
                        <div className="font-mono font-bold text-sm text-[#00DFC8] tabular-nums">
                          {vals.amount}
                        </div>
                        <div className="text-[10px] text-[#9F95B8] uppercase">{unitLabel}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateValues(ex, { amount: vals.amount + step })}
                        className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] flex items-center justify-center text-[#F8F5FF] transition active:scale-95"
                        aria-label="Увеличить количество"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuickLog(ex)}
                    className={`w-full min-h-[48px] px-4 py-2.5 rounded-2xl font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                      isJustLogged
                        ? 'bg-[#10E598] text-[#0E0A18]'
                        : 'bg-white/[0.06] hover:bg-gradient-to-r hover:from-[#FF4D8D] hover:to-[#FF8A4C] border border-white/[0.1] hover:border-transparent text-[#F8F5FF] hover:text-[#0E0A18]'
                    }`}
                  >
                    {isJustLogged ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Тренировка записана!</span>
                      </>
                    ) : (
                      <>
                        <Dumbbell className="w-4 h-4" />
                        <span>Записать подход / тренировку</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
