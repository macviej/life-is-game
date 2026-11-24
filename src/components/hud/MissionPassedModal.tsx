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

  const headerEyebrow = missionPassedSummary.leveledUp
    ? `Новый уровень · Ур. ${missionPassedSummary.newLevel}`
    : 'Тренировка выполнена';

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0C10]/90 backdrop-blur-3xl flex items-center justify-center md:p-6 overflow-y-auto animate-modal-in">
      <div className="relative w-full min-h-full md:min-h-0 md:max-w-[470px] md:rounded-[32px] md:apple-card overflow-hidden flex flex-col justify-between px-6 py-8 md:p-7">
        {/* Subtle Solis Sunset Ambient Halo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[320px] h-[200px] rounded-full bg-gradient-to-r from-[#FF6B9D]/20 via-[#FFB36B]/18 to-[#5CE1E6]/18 blur-3xl"
        />

        <div />

        <div className="relative space-y-5 text-center">
          {/* Luminous Solis Sunset Completion Emblem */}
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FF6B9D]/30 via-[#FFB36B]/25 to-[#5CE1E6]/25 blur-xl" />
            <div className="relative w-[72px] h-[72px] rounded-full apple-sunset-cta flex items-center justify-center text-[#111214]">
              <Check className="w-9 h-9 stroke-[2.8]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] bg-gradient-to-r from-[#FF6B9D] via-[#FFB36B] to-[#5CE1E6] bg-clip-text text-transparent">
              {headerEyebrow}
            </p>
            <h2 className="text-[30px] font-bold tracking-[-0.03em] text-white leading-[1.08]">
              {missionPassedSummary.missionTitle}
            </h2>
          </div>

          {/* 3-Column Reward Summary: +XP / +$ / +HP */}
          <div className="rounded-[24px] apple-card grid grid-cols-3 divide-x divide-white/[0.07] overflow-hidden">
            <div className="py-4 px-2.5">
              <div className="text-[20px] font-bold tracking-[-0.02em] text-[#5CE1E6] tabular-nums">
                +{missionPassedSummary.earnedRespect}
              </div>
              <div className="mt-1 text-[11px] font-medium text-[#98989F]">Опыт XP</div>
            </div>

            <div className="py-4 px-2.5">
              <div className="text-[20px] font-bold tracking-[-0.02em] text-[#FFB36B] tabular-nums">
                +${missionPassedSummary.earnedCash}
              </div>
              <div className="mt-1 text-[11px] font-medium text-[#98989F]">Наличные</div>
            </div>

            <div className="py-4 px-2.5">
              <div className="text-[20px] font-bold tracking-[-0.02em] text-[#7ED484] tabular-nums">
                +{missionPassedSummary.healthBonus}
              </div>
              <div className="mt-1 text-[11px] font-medium text-[#98989F]">Здоровье</div>
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

          {missionPassedSummary.recoveryNote && (
            <p className="text-[14px] text-[#98989F] leading-relaxed max-w-[320px] mx-auto">
              {missionPassedSummary.recoveryNote}
            </p>
          )}

          {missionPassedSummary.progressionNote && (
            <div className="rounded-[16px] bg-[#5CE1E6]/10 border border-[#5CE1E6]/25 px-4 py-2.5 text-[13px] font-medium text-[#8AE5E8] leading-snug max-w-[360px] mx-auto">
              {missionPassedSummary.progressionNote}
            </div>
          )}
        </div>

        <div className="relative space-y-2.5 pt-6">
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
              <span className="truncate">
                Далее: {missionPassedSummary.suggestedNextMissionTitle}
              </span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
