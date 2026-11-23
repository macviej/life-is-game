import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Footprints,
  HeartPulse,
  Home,
  Sparkles,
  X,
  Activity,
  GripHorizontal,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { EQUIPMENT_LIST, EXERCISE_LIST } from '../../data/exercises';
import { calculateAutoWeeklyFrequency } from '../../engine/planGenerator';
import { EquipmentId, WorkoutCategory } from '../../types/game';

const EQUIPMENT_ICONS: Record<EquipmentId, React.ComponentType<{ className?: string }>> = {
  pullup_bar: GripHorizontal,
  dip_bars: Activity,
  bodyweight: Home,
  dumbbells: Dumbbell,
  gym: Dumbbell,
  cardio_gear: Footprints,
  mobility_mat: HeartPulse,
};

function inferFocus(equipment: EquipmentId[]): WorkoutCategory {
  if (equipment.includes('pullup_bar')) return 'pullup_bar';
  if (equipment.includes('bodyweight') || equipment.includes('dip_bars')) return 'calisthenics';
  if (equipment.includes('dumbbells') || equipment.includes('gym')) return 'gym_iron';
  if (equipment.includes('cardio_gear')) return 'cardio_street';
  return 'mobility_hp';
}

export const PlanOnboarding: React.FC = () => {
  const { state, isOnboardingOpen, setIsOnboardingOpen, applyCalibrationPlan } = useGame();

  const shouldShow = isOnboardingOpen || !state.onboardingCompleted;

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentId[]>(
    state.activePlan.availableEquipment.length > 0
      ? state.activePlan.availableEquipment
      : ['pullup_bar', 'bodyweight', 'mobility_mat']
  );
  const [disabledExerciseIds, setDisabledExerciseIds] = useState<string[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);

  const [playerName, setPlayerName] = useState(state.playerName || 'Алекс');
  const [maxPullups, setMaxPullups] = useState(state.activePlan.maxPullupsBaseline || 6);
  const [maxPushups, setMaxPushups] = useState(state.activePlan.maxPushupsBaseline || 20);

  const matchingExercises = useMemo(
    () => EXERCISE_LIST.filter((ex) => selectedEquipment.includes(ex.requiredEquipment)),
    [selectedEquipment]
  );

  const enabledExerciseIds = useMemo(
    () =>
      matchingExercises
        .filter((ex) => !disabledExerciseIds.includes(ex.id))
        .map((ex) => ex.id),
    [matchingExercises, disabledExerciseIds]
  );

  const autoFrequency = useMemo(
    () => calculateAutoWeeklyFrequency(enabledExerciseIds, maxPullups, maxPushups),
    [enabledExerciseIds, maxPullups, maxPushups]
  );

  if (!shouldShow) return null;

  const toggleEquipment = (id: EquipmentId) => {
    setSelectedEquipment((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleExercise = (id: string) => {
    setDisabledExerciseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    if (enabledExerciseIds.length === 0) return;
    applyCalibrationPlan({
      playerName: playerName.trim() || 'Алекс',
      availableEquipment: selectedEquipment,
      enabledExerciseIds,
      maxPullups,
      maxPushups,
      focus: inferFocus(selectedEquipment),
    });
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0E0F11]/88 backdrop-blur-2xl flex items-center justify-center md:p-6 animate-modal-in">
      <div className="relative w-full h-full md:h-auto md:max-h-[88vh] md:max-w-[680px] bg-[#0E0F11] md:apple-card md:rounded-[32px] flex flex-col overflow-hidden">
      {/* Apple Setup Assistant Top Bar */}
      <div className="shrink-0 px-5 md:px-7 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-9 h-9 rounded-full apple-card flex items-center justify-center text-white/90 hover:text-white active:scale-95 transition"
              aria-label="Назад"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === 1 ? 'w-7 bg-[#E5A3BD]' : 'w-2.5 bg-white/20'
              }`}
            />
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === 2 ? 'w-7 bg-[#E5A3BD]' : 'w-2.5 bg-white/20'
              }`}
            />
          </div>
        </div>

        {state.onboardingCompleted && (
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setIsOnboardingOpen(false);
            }}
            className="w-9 h-9 rounded-full apple-card flex items-center justify-center text-[#98989F] hover:text-white active:scale-95 transition"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable Setup Content */}
      <div className="flex-1 overflow-y-auto px-5 md:px-7 pb-32 md:pb-28">
        {step === 1 ? (
          <div className="space-y-5">
            <div className="pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E5A3BD]">
                Настройка программы
              </p>
              <h1 className="mt-1.5 text-[30px] sm:text-[34px] font-bold tracking-[-0.03em] text-white leading-[1.08]">
                На чём будешь тренироваться?
              </h1>
              <p className="mt-2.5 text-[15px] text-[#98989F] leading-relaxed">
                Отметь снаряды и форматы под рукой — соберём личный план без лишних упражнений.
              </p>
            </div>

            {/* Responsive Equipment Selector Grid (2 cols mobile, 3 cols tablet/desktop) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {EQUIPMENT_LIST.map((item) => {
                const isSelected = selectedEquipment.includes(item.id);
                const Icon = EQUIPMENT_ICONS[item.id];
                const count = EXERCISE_LIST.filter((e) => e.requiredEquipment === item.id).length;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleEquipment(item.id)}
                    className={`relative text-left rounded-[22px] p-4 transition-all active:scale-[0.97] ${
                      isSelected
                        ? 'bg-[#231B20] border border-[#E5A3BD]/65'
                        : 'apple-card hover:bg-[#242426]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3.5">
                      <div
                        className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-[#E5A3BD]/20 text-[#E5A3BD]'
                            : 'bg-white/[0.06] text-[#98989F]'
                        }`}
                      >
                        <Icon className="w-[19px] h-[19px] stroke-[1.9]" />
                      </div>

                      <div
                        className={`w-[22px] h-[22px] rounded-full flex items-center justify-center border transition ${
                          isSelected
                            ? 'bg-[#E5A3BD] border-[#E5A3BD] text-[#111214]'
                            : 'border-white/20 bg-[#0E0F11]/20'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div className="text-[15px] font-semibold tracking-[-0.01em] text-white leading-snug">
                      {item.label}
                    </div>
                    <div className="mt-0.5 text-[12px] text-[#8E8E93] tabular-nums">
                      {count} упр.
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Collapsible Apple Health Grouped Exercise Checklist */}
            {matchingExercises.length > 0 && (
              <div className="rounded-[24px] apple-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowExercisePicker((v) => !v)}
                  className="w-full px-4 py-4 flex items-center justify-between text-left active:bg-white/[0.03] transition"
                >
                  <div>
                    <div className="text-[15px] font-semibold text-white">
                      Настроить упражнения вручную
                    </div>
                    <div className="mt-0.5 text-[13px] text-[#8E8E93] tabular-nums">
                      В программе: {enabledExerciseIds.length} из {matchingExercises.length}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-[#98989F]">
                    {showExercisePicker ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {showExercisePicker && (
                  <div className="border-t border-white/[0.07] divide-y divide-white/[0.07] max-h-60 overflow-y-auto">
                    {matchingExercises.map((ex) => {
                      const checked = !disabledExerciseIds.includes(ex.id);
                      return (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => toggleExercise(ex.id)}
                          className="w-full px-4 py-3 hover:bg-white/[0.03] flex items-center justify-between gap-3 text-left transition"
                        >
                          <span
                            className={`text-[14px] ${
                              checked ? 'text-white font-medium' : 'text-[#636366] line-through'
                            }`}
                          >
                            {ex.name}
                          </span>
                          <span
                            className={`w-[22px] h-[22px] shrink-0 rounded-full flex items-center justify-center border transition ${
                              checked
                                ? 'bg-[#E5A3BD] border-[#E5A3BD] text-white'
                                : 'border-white/20'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E5A3BD]">
                Калибровка формы
              </p>
              <h1 className="mt-1.5 text-[32px] font-bold tracking-[-0.03em] text-white leading-[1.08]">
                Твоя отправная точка
              </h1>
              <p className="mt-2.5 text-[15px] text-[#98989F] leading-relaxed">
                Оцени текущую форму — подстроим подходы, сложность миссий и ритм восстановления.
              </p>
            </div>

            {/* Name input — Apple Settings Grouped Row */}
            <div className="rounded-[24px] apple-card p-4 space-y-2">
              <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#8E8E93]">
                Как тебя называть
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={24}
                placeholder="Алекс"
                className="w-full h-12 px-4 rounded-[14px] bg-[#2C2C2E] border border-white/[0.08] text-[16px] font-medium text-white placeholder:text-[#636366] focus:outline-none focus:border-[#E5A3BD] transition"
              />
            </div>

            {/* Strength calibration Apple Sliders */}
            {(selectedEquipment.includes('pullup_bar') ||
              selectedEquipment.includes('bodyweight') ||
              selectedEquipment.includes('dip_bars')) && (
              <div className="rounded-[24px] apple-card divide-y divide-white/[0.07] overflow-hidden">
                {selectedEquipment.includes('pullup_bar') && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[15px] font-semibold text-white block">
                          Подтягивания на максимум
                        </span>
                        <span className="text-[12px] text-[#8E8E93]">за один чистый подход</span>
                      </div>
                      <span className="text-[24px] font-bold tracking-[-0.02em] text-[#E5A3BD] tabular-nums">
                        {maxPullups}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={maxPullups}
                      onChange={(e) => setMaxPullups(Number(e.target.value))}
                      className="apple-slider"
                    />
                  </div>
                )}

                {(selectedEquipment.includes('bodyweight') ||
                  selectedEquipment.includes('dip_bars')) && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[15px] font-semibold text-white block">
                          Отжимания на максимум
                        </span>
                        <span className="text-[12px] text-[#8E8E93]">за один подход</span>
                      </div>
                      <span className="text-[24px] font-bold tracking-[-0.02em] text-white tabular-nums">
                        {maxPushups}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      value={maxPushups}
                      onChange={(e) => setMaxPushups(Number(e.target.value))}
                      className="apple-slider"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Auto-calculated frequency & automatic recovery alerts preview */}
            <div className="rounded-[24px] bg-[#231B20] border border-[#E5A3BD]/30 p-4 flex items-start gap-3.5 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.14)]">
              <div className="w-10 h-10 rounded-[14px] apple-sunset-cta flex items-center justify-center shrink-0 text-[#111214] mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="text-[14px] font-semibold text-white tabular-nums">
                  Авто-ритм: {autoFrequency.daysPerWeek} трен./нед. · {enabledExerciseIds.length} упр.
                </div>
                <p className="text-[13px] text-[#AEAEB2] leading-snug">
                  {autoFrequency.reason}. Уведомления придут сами, когда мышцы восстановятся.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Liquid Glass Bottom Action Bar */}
      <div className="absolute bottom-4 md:bottom-5 left-4 right-4 md:left-7 md:right-7 z-20 rounded-[26px] apple-liquid-glass p-2">
        {step === 1 ? (
          <button
            type="button"
            disabled={enabledExerciseIds.length === 0}
            onClick={() => setStep(2)}
            className="w-full h-[52px] rounded-[20px] apple-sunset-cta disabled:opacity-40 text-[#111214] text-[16px] font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition"
          >
            <span className="tabular-nums">Далее · {enabledExerciseIds.length} упр.</span>
            <ArrowRight className="w-[18px] h-[18px] stroke-[2.2]" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="w-full h-[52px] rounded-[20px] apple-sunset-cta text-[#111214] text-[16px] font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition"
          >
            <span>Запустить мой план</span>
            <Check className="w-[18px] h-[18px] stroke-[2.6]" />
          </button>
        )}
      </div>
      </div>
    </div>
  );
};
