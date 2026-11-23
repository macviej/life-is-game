import React from 'react';
import { X, Wind, Target, CheckCircle2 } from 'lucide-react';
import { Exercise } from '../../types/game';
import { MUSCLE_LABELS } from '../../engine/recoveryEngine';
import { ExerciseAnimationSvg } from './ExerciseAnimationSvg';

interface ExerciseGuideModalProps {
  exercise: Exercise | null;
  onClose: () => void;
}

function getBreathingCue(exercise: Exercise): string {
  if (exercise.category === 'mobility_hp') {
    return 'Дыши глубоко и спокойно через нос, на длинном выдохе мягко расслабляй мышцы.';
  }
  if (exercise.unit === 'seconds') {
    return 'Не задерживай дыхание: сохраняй ровный спокойный ритм на протяжении всего подхода.';
  }
  return 'Выдох на усилии (подъём / жим), плавный вдох при контролируемом возврате в исходное положение.';
}

export const ExerciseGuideModal: React.FC<ExerciseGuideModalProps> = ({
  exercise,
  onClose,
}) => {
  if (!exercise) return null;

  const muscles = [
    ...exercise.primaryMuscles.map((m) => MUSCLE_LABELS[m]),
    ...exercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m]),
  ];
  const uniqueMuscles = Array.from(new Set(muscles));

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0E0F11]/85 backdrop-blur-xl flex items-end sm:items-center justify-center sm:p-6 animate-modal-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[520px] max-h-[90vh] rounded-t-[28px] sm:rounded-[28px] apple-card flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-white/[0.07]">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E5A3BD]">
              Техника выполнения
            </span>
            <h2 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-white leading-snug">
              {exercise.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full apple-card-elevated flex items-center justify-center text-[#98989F] hover:text-white active:scale-95 transition"
            aria-label="Закрыть инструкцию"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Live 3D Side-Profile Athlete */}
          <ExerciseAnimationSvg exerciseId={exercise.id} className="w-full h-60 sm:h-64" />

          {/* Target Muscles */}
          <div className="flex flex-wrap gap-1.5">
            {uniqueMuscles.map((label) => (
              <span
                key={label}
                className="px-2.5 py-1 rounded-full bg-[#25262B] text-[12px] font-medium text-[#C8CAD0]"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Step-by-step cards */}
          <div className="rounded-[18px] bg-[#131417] border border-white/[0.06] divide-y divide-white/[0.06] overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <Target className="w-4 h-4 text-[#E5A3BD] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-[13px] font-semibold text-white">Зачем это упражнение</div>
                <p className="text-[13px] text-[#A1A3AA] leading-relaxed">
                  {exercise.description}
                </p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#8AE5C3] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-[13px] font-semibold text-white">Как выполнять правильно</div>
                <p className="text-[13px] text-[#E2E4E9] leading-relaxed">
                  {exercise.techniqueTip}
                </p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-3">
              <Wind className="w-4 h-4 text-[#A88CE8] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-[13px] font-semibold text-white">Дыхание и темп</div>
                <p className="text-[13px] text-[#A1A3AA] leading-relaxed">
                  {getBreathingCue(exercise)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 px-5 py-4 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-[16px] apple-sunset-cta text-[#111214] text-[15px] font-semibold active:scale-[0.98] transition"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};
