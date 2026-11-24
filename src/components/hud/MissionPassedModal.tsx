import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { CharacterStatsBars } from '../../types/game';

const STAT_LABELS: Partial<Record<keyof CharacterStatsBars, string>> = {
  strength: 'Сила',
  stamina: 'Выносливость',
  agility: 'Мобильность',
  discipline: 'Дисциплина',
  healthLevel: 'Здоровье',
};

export const MissionPassedModal: React.FC = () => {
  const { missionPassedSummary, closeMissionPassedModal, startMission } = useGame();

  if (!missionPassedSummary) return null;

  const statEntries = Object.entries(missionPassedSummary.statBoosts).filter(
    ([, val]) => typeof val === 'number' && val > 0
  ) as [keyof CharacterStatsBars, number][];

  return (
    <div className="fixed inset-0 z-50 bg-[#0E0F11]/88 backdrop-blur-3xl flex items-center justify-center md:p-6 overflow-y-auto animate-modal-in">
      <div className="w-full min-h-full md:min-h-0 md:max-w-[460px] md:rounded-[32px] md:apple-card flex flex-col justify-between px-6 py-8 md:p-7">
      <div />

      <div className="space-y-6 text-center">
        {/* Luminous Apple Fitness+ Completion Emblem */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#E5A3BD]/20 blur-xl" />
          <div className="relative w-[72px] h-[72px] rounded-full apple-sunset-cta flex items-center justify-center text-[#111214]">
            <Check className="w-9 h-9 stroke-[2.8]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#E5A3BD]">
            {missionPassedSummary.leveledUp
              ? `Новый уровень · Ур. ${missionPassedSummary.newLevel}`
              : 'Тренировка выполнена'}
          </p>
          <h2 className="text-[30px] font-bold tracking-[-0.03em] text-white leading-[1.08]">
            {missionPassedSummary.missionTitle}
          </h2>
        </div>

        {/* Clean 2-Column Summary Card: XP + Health */}
        <div className="rounded-[24px] apple-card grid grid-cols-2 divide-x divide-white/[0.07] overflow-hidden">
          <div className="py-4 px-3">
            <div className="text-[22px] font-bold tracking-[-0.02em] text-[#8AE5C3] tabular-nums">
              +{missionPassedSummary.earnedRespect}
            </div>
            <div className="mt-1 text-[12px] text-[#98989F]">Опыт XP</div>
          </div>

          <div className="py-4 px-3">
            <div className="text-[22px] font-bold tracking-[-0.02em] text-[#E5A3BD] tabular-nums">
              +{missionPassedSummary.healthBonus}
            </div>
            <div className="mt-1 text-[12px] text-[#98989F]">Здоровье</div>
          </div>
        </div>

        {statEntries.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {statEntries.map(([key, val]) => (
              <span
                key={key}
                className="px-3.5 py-1.5 rounded-full apple-card text-[13px] font-medium text-white"
              >
                {STAT_LABELS[key] ?? key}{' '}
                <span className="text-[#30D158] font-semibold tabular-nums">+{val}</span>
              </span>
            ))}
          </div>
        )}

        <p className="text-[14px] text-[#98989F] leading-relaxed max-w-[300px] mx-auto">
          {missionPassedSummary.recoveryNote}
        </p>

        {missionPassedSummary.progressionNote && (
          <div className="rounded-[16px] bg-[#8AE5C3]/10 border border-[#8AE5C3]/25 px-4 py-2.5 text-[13px] font-medium text-[#8AE5C3] leading-snug max-w-[340px] mx-auto">
            {missionPassedSummary.progressionNote}
          </div>
        )}
      </div>

      <div className="space-y-2.5 pt-6">
        <button
          type="button"
          onClick={closeMissionPassedModal}
          className="w-full h-[54px] rounded-[18px] apple-sunset-cta text-[#111214] text-[16px] font-semibold active:scale-[0.97] transition"
        >
          Готово
        </button>

        {missionPassedSummary.suggestedNextMissionId && (
          <button
            type="button"
            onClick={() => {
              const nextId = missionPassedSummary.suggestedNextMissionId!;
              closeMissionPassedModal();
              startMission(nextId);
            }}
            className="w-full h-12 rounded-[16px] apple-card-elevated text-white hover:bg-[#3A3A3C] text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.97] transition"
          >
            <span className="truncate">Далее: {missionPassedSummary.suggestedNextMissionTitle}</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        )}
      </div>
      </div>
    </div>
  );
};
