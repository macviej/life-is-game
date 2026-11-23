import React, { useMemo } from 'react';
import {
  Clock,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  GripHorizontal,
  Heart,
  Dumbbell,
  Zap,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { PHONE_CONTACTS, getContactById } from '../../data/contacts';
import { calculateMuscleReadiness, formatDurationMs } from '../../engine/recoveryEngine';
import { MuscleGroup } from '../../types/game';

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function getChannelVisual(contactId: string): {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
} {
  switch (contactId) {
    case 'coach_dre':
      return { icon: GripHorizontal, color: '#E5A3BD', bg: 'rgba(255, 55, 95, 0.14)' };
    case 'doc_elena':
      return { icon: Heart, color: '#30D158', bg: 'rgba(48, 209, 88, 0.14)' };
    case 'viktor_iron':
      return { icon: Dumbbell, color: '#A88CE8', bg: 'rgba(255, 122, 69, 0.14)' };
    case 'zoe_pulse':
    default:
      return { icon: Zap, color: '#32ADE6', bg: 'rgba(50, 173, 230, 0.14)' };
  }
}

export const MessagesTabView: React.FC = () => {
  const {
    state,
    now,
    requestCoachStatusPing,
    callContactForChallenge,
    toggleBrowserPush,
    startMission,
  } = useGame();

  const sortedMessages = [...state.notifications].sort((a, b) => b.timestamp - a.timestamp);

  const recoveringMuscles = useMemo(() => {
    return (Object.keys(state.muscleRecovery) as MuscleGroup[])
      .map((group) => {
        const rec = state.muscleRecovery[group];
        const percent = calculateMuscleReadiness(rec, now);
        const msLeft =
          rec.readyAtTimestamp && rec.readyAtTimestamp > now ? rec.readyAtTimestamp - now : 0;
        return { group, label: rec.label, percent, msLeft };
      })
      .filter((m) => m.percent < 85 && m.msLeft > 0)
      .sort((a, b) => a.msLeft - b.msLeft);
  }, [state.muscleRecovery, now]);

  return (
    <div className="px-5 md:px-0 pt-4 pb-4 space-y-5 lg:space-y-6">
      {/* Apple Health Summary Large Title Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[32px] md:text-[36px] font-bold tracking-[-0.03em] text-white leading-[1.08]">
            Сводка
          </h1>
          <p className="mt-1 text-[14px] text-[#98989F]">Авто-сигналы восстановления</p>
        </div>

        <button
          type="button"
          onClick={requestCoachStatusPing}
          className="shrink-0 mt-1 h-9 px-3.5 rounded-full bg-white text-black text-[13px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Статус</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
      <div className="lg:col-span-5 space-y-5">
      {/* Automatic Muscle Recovery Monitor with Native iOS Switch */}
      <section className="rounded-[24px] apple-card divide-y divide-white/[0.07] overflow-hidden">
        <div className="px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-white">Авто-уведомления мышц</div>
            <div className="text-[12px] text-[#98989F]">
              {state.browserPushEnabled ? 'Системные Push включены' : 'Включить Push в браузере'}
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={state.browserPushEnabled}
            aria-label="Переключить Push-уведомления"
            onClick={() => void toggleBrowserPush()}
            className={`relative shrink-0 w-[51px] h-[31px] rounded-full p-[2px] transition-colors duration-200 ${
              state.browserPushEnabled ? 'bg-[#30D158]' : 'bg-[#39393D]'
            }`}
          >
            <span
              className={`block w-[27px] h-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-transform duration-200 ${
                state.browserPushEnabled ? 'translate-x-[20px]' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="px-4 py-3.5">
          {recoveringMuscles.length === 0 ? (
            <div className="flex items-center gap-2.5 text-[13px] text-[#30D158] font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Все группы мышц восстановлены — можно нагружать любую зону.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[12px] text-[#98989F]">
                Сигнал придёт автоматически, как только группа восстановится до 85%+:
              </p>
              <div className="rounded-[16px] bg-black/40 border border-white/[0.05] divide-y divide-white/[0.06] overflow-hidden">
                {recoveringMuscles.slice(0, 3).map((m) => (
                  <div
                    key={m.group}
                    className="flex items-center justify-between px-3.5 py-2.5 text-[13px]"
                  >
                    <span className="text-white/95 font-medium truncate pr-2">{m.label}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#E5A3BD] shrink-0 tabular-nums">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDurationMs(m.msLeft)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Clean Quick Category Triggers (Zero fake coach avatars!) */}
      <section>
        <div className="text-[13px] font-semibold text-[#98989F] mb-2.5 px-1">
          Быстрая тренировка на выбор
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {PHONE_CONTACTS.map((ch) => {
            const visual = getChannelVisual(ch.id);
            const Icon = visual.icon;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => callContactForChallenge(ch.id)}
                className="rounded-[20px] apple-card p-3.5 flex items-center gap-3 hover:bg-[#242426] active:scale-[0.98] transition text-left"
              >
                <div
                  className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: visual.bg, color: visual.color }}
                >
                  <Icon className="w-[18px] h-[18px] stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-white truncate">{ch.name}</div>
                  <div className="text-[11px] text-[#8E8E93] truncate">{ch.role}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
      </div>

      {/* Clean Apple Health Notifications Feed */}
      <section className="lg:col-span-7">
        <div className="text-[13px] font-semibold text-[#98989F] mb-2.5 px-1">
          Последние уведомления
        </div>

        {sortedMessages.length === 0 ? (
          <div className="rounded-[24px] apple-card p-6 text-center text-[14px] text-[#98989F] leading-relaxed">
            Пока пусто. После тренировки здесь появятся подсказки о восстановлении мышц.
          </div>
        ) : (
          <div className="rounded-[24px] apple-card divide-y divide-white/[0.07] overflow-hidden">
            {sortedMessages.map((msg) => {
              const channel = getContactById(msg.contactId);
              const visual = getChannelVisual(msg.contactId);
              const Icon = visual.icon;
              return (
                <div key={msg.id} className="px-4 py-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0"
                        style={{ backgroundColor: visual.bg, color: visual.color }}
                      >
                        <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                      </span>
                      <span className="text-[14px] font-semibold text-white truncate">
                        {channel.name}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#8E8E93] shrink-0 tabular-nums">
                      {formatMessageTime(msg.timestamp)}
                    </span>
                  </div>

                  <p className="text-[14px] text-[#D1D1D6] leading-relaxed">{msg.message}</p>

                  {msg.actionMissionId && (
                    <button
                      type="button"
                      onClick={() => startMission(msg.actionMissionId!)}
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#E5A3BD] hover:text-[#A88CE8] pt-0.5 transition"
                    >
                      <span>Начать тренировку</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      </div>
    </div>
  );
};
