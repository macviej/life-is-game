import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Bell,
  BellOff,
  CheckCheck,
  Clock,
  Dumbbell,
  Flame,
  Play,
  Send,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { calculateMuscleReadiness, formatDurationMs } from '../../engine/recoveryEngine';
import { Mission, MuscleGroup, WorkoutCategory } from '../../types/game';

interface MessagesTabViewProps {
  onOpenFitness?: (subTab?: 'overview' | 'plan') => void;
  onOpenPlan?: () => void;
}

interface FitnessRedirectCard {
  subTab: 'overview' | 'plan';
  title: string;
  subtitle: string;
  missionId?: string;
  badge?: string;
}

interface ChatMessage {
  id: string;
  sender: 'coach' | 'user';
  text: string;
  timestamp: number;
  tag?: string;
  fitnessRedirect?: FitnessRedirectCard;
}

const CHAT_STORAGE_KEY = 'solis_coach_chat_v1';

const QUICK_REPLIES = [
  { id: 'status', label: 'Как мои мышцы?' },
  { id: 'pullup', label: 'Дай турник' },
  { id: 'strength', label: 'Хочу силовую' },
  { id: 'cardio', label: 'Кардио' },
  { id: 'recovery', label: 'Восстановление' },
  { id: 'plan', label: 'Покажи план' },
];

function findMissionByCategory(
  missions: Mission[],
  preferredIds: string[],
  category: WorkoutCategory
): Mission | undefined {
  for (const id of preferredIds) {
    const found = missions.find((m) => m.id === id && m.isUnlocked);
    if (found) return found;
  }
  return (
    missions.find((m) => m.category === category && m.isUnlocked) ??
    missions.find((m) => m.isUnlocked) ??
    missions[0]
  );
}

function formatChatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function loadSavedChat(): ChatMessage[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]).slice(-40) : [];
  } catch {
    return [];
  }
}

export const MessagesTabView: React.FC<MessagesTabViewProps> = ({
  onOpenFitness,
  onOpenPlan,
}) => {
  const { state, now, recommendation, toggleBrowserPush, startMission } = useGame();
  const [userChat, setUserChat] = useState<ChatMessage[]>(() => loadSavedChat());
  const [draft, setDraft] = useState('');
  const [isCoachTyping, setIsCoachTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const replyTimeoutRef = useRef<number | null>(null);

  const openFitness = (subTab: 'overview' | 'plan' = 'overview') => {
    if (onOpenFitness) {
      onOpenFitness(subTab);
    } else if (subTab === 'plan' && onOpenPlan) {
      onOpenPlan();
    }
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(userChat.slice(-40)));
    } catch {
      // ignore storage quota errors
    }
  }, [userChat]);

  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current !== null) {
        window.clearTimeout(replyTimeoutRef.current);
      }
    };
  }, []);

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

  const recommendedMission = useMemo(
    () => state.missions.find((m) => m.id === recommendation.recommendedMissionId),
    [state.missions, recommendation.recommendedMissionId]
  );

  // Merge system notifications + live coach brief + interactive chat history
  const threadMessages = useMemo<ChatMessage[]>(() => {
    const fromNotifications: ChatMessage[] = [...state.notifications]
      .slice(0, 12)
      .reverse()
      .map((n) => {
        const linkedMission = n.actionMissionId
          ? state.missions.find((m) => m.id === n.actionMissionId)
          : undefined;
        return {
          id: `sys_${n.id}`,
          sender: 'coach' as const,
          tag: n.title,
          text: n.message,
          timestamp: n.timestamp,
          fitnessRedirect: linkedMission
            ? {
                subTab: 'plan' as const,
                title: linkedMission.title,
                subtitle: `+${linkedMission.rewards.respectXp} XP · +$${linkedMission.rewards.cash}`,
                missionId: linkedMission.id,
                badge: 'Тренировка',
              }
            : {
                subTab: 'overview' as const,
                title: 'Приложение Фитнес',
                subtitle: `Готовность турника: ${recommendation.pullupReadinessPercent}%`,
                badge: 'Форма',
              },
        };
      });

    const liveBrief: ChatMessage = {
      id: 'coach_live_brief',
      sender: 'coach',
      tag: 'Сводка тренера',
      text: `${recommendation.headline}. ${recommendation.subtext}`,
      timestamp:
        fromNotifications.length > 0
          ? fromNotifications[fromNotifications.length - 1].timestamp + 1000
          : now - 60_000,
      fitnessRedirect: recommendedMission
        ? {
            subTab: 'plan',
            title: recommendedMission.title,
            subtitle: `Готовность ${recommendation.pullupReadinessPercent}% · +${recommendedMission.rewards.respectXp} XP`,
            missionId: recommendedMission.id,
            badge: 'Рекомендация',
          }
        : {
            subTab: 'plan',
            title: 'План тренировок',
            subtitle: `Серия ${state.streakDays} дн. · Уровень ${state.level}`,
            badge: 'Фитнес',
          },
    };

    const baseMessages =
      fromNotifications.length > 0 ? [...fromNotifications, liveBrief] : [liveBrief];

    return [...baseMessages, ...userChat].sort((a, b) => a.timestamp - b.timestamp);
  }, [
    state.notifications,
    state.missions,
    state.streakDays,
    state.level,
    recommendation,
    recommendedMission,
    userChat,
    now,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages.length, isCoachTyping]);

  const buildCoachReply = (userText: string): ChatMessage => {
    const q = userText.toLowerCase();
    const replyTs = Date.now();

    if (q.includes('турник') || q.includes('подтяг')) {
      const m = findMissionByCategory(
        state.missions,
        ['m_freak_2', 'm_grease_pullup', 'm_pull_act1_1'],
        'pullup_bar'
      );
      return {
        id: `coach_${replyTs}`,
        sender: 'coach',
        tag: 'Турник',
        text: m
          ? `Отлично! Готовность спины и хвата сейчас ${recommendation.pullupReadinessPercent}%. Забирай «${m.title}» — открывай Фитнес и погнали.`
          : `Готовность к турнику сейчас ${recommendation.pullupReadinessPercent}%. Открой Фитнес и выбери подход в плане.`,
        timestamp: replyTs,
        fitnessRedirect: m
          ? {
              subTab: 'plan',
              title: m.title,
              subtitle: `+${m.rewards.respectXp} XP · +$${m.rewards.cash}`,
              missionId: m.id,
              badge: 'Турник',
            }
          : {
              subTab: 'plan',
              title: 'План тренировок',
              subtitle: `Готовность ${recommendation.pullupReadinessPercent}%`,
              badge: 'Фитнес',
            },
      };
    }

    if (q.includes('силов') || q.includes('отжим') || q.includes('брусь') || q.includes('пресс')) {
      const m = findMissionByCategory(
        state.missions,
        ['m_side_push', 'm_side_iron', 'm_side_core'],
        'calisthenics'
      );
      return {
        id: `coach_${replyTs}`,
        sender: 'coach',
        tag: 'Силовая',
        text: m
          ? `Принял. Подготовил силовую сессию «${m.title}». Жми кнопку ниже — перекину сразу в Фитнес.`
          : 'Отличная идея. Заходи в Фитнес, подберём силовую на свежие мышцы.',
        timestamp: replyTs,
        fitnessRedirect: m
          ? {
              subTab: 'plan',
              title: m.title,
              subtitle: `+${m.rewards.respectXp} XP · +$${m.rewards.cash}`,
              missionId: m.id,
              badge: 'Силовая',
            }
          : {
              subTab: 'plan',
              title: 'Силовой план',
              subtitle: 'Отжимания, брусья и кор',
              badge: 'Фитнес',
            },
      };
    }

    if (q.includes('кардио') || q.includes('бег') || q.includes('выносл')) {
      const m = findMissionByCategory(
        state.missions,
        ['m_freak_1', 'm_side_cardio'],
        'cardio_street'
      );
      return {
        id: `coach_${replyTs}`,
        sender: 'coach',
        tag: 'Кардио',
        text: m
          ? `Разгоним пульс! Запускай «${m.title}» в приложении Фитнес — отлично прокачает выносливость.`
          : 'Хороший выбор для темпа и выносливости. Открой Фитнес и запусти кардио-сессию.',
        timestamp: replyTs,
        fitnessRedirect: m
          ? {
              subTab: 'plan',
              title: m.title,
              subtitle: `+${m.rewards.respectXp} XP · +$${m.rewards.cash}`,
              missionId: m.id,
              badge: 'Кардио',
            }
          : {
              subTab: 'overview',
              title: 'Кардио и форма',
              subtitle: 'Выносливость и пульс',
              badge: 'Фитнес',
            },
      };
    }

    if (q.includes('восстан') || q.includes('устал') || q.includes('отдых') || q.includes('болит')) {
      const m = findMissionByCategory(state.missions, ['m_side_medkit'], 'mobility_hp');
      return {
        id: `coach_${replyTs}`,
        sender: 'coach',
        tag: 'Восстановление',
        text: m
          ? `Услышал тебя. Не форсируем — сделай лёгкую «${m.title}», чтобы поднять HP и ускорить восстановление суставов.`
          : 'Дай мышцам время восстановиться. Проверь матрицу готовности в приложении Фитнес.',
        timestamp: replyTs,
        fitnessRedirect: m
          ? {
              subTab: 'overview',
              title: m.title,
              subtitle: `+${m.rewards.healthBonus} HP · Мобильность`,
              missionId: m.id,
              badge: 'Здоровье',
            }
          : {
              subTab: 'overview',
              title: 'Форма и восстановление',
              subtitle: 'Матрица 6 мышечных групп',
              badge: 'Фитнес',
            },
      };
    }

    if (q.includes('мышц') || q.includes('форм') || q.includes('статус') || q.includes('готов')) {
      const summary =
        recoveringMuscles.length === 0
          ? 'Все 6 мышечных групп полностью восстановлены — можешь нагружать любую зону.'
          : `Сейчас восстанавливаются: ${recoveringMuscles
              .slice(0, 2)
              .map((m) => `${m.label} (${m.percent}%, ещё ${formatDurationMs(m.msLeft)})`)
              .join(', ')}.`;
      return {
        id: `coach_${replyTs}`,
        sender: 'coach',
        tag: 'Статус тела',
        text: `${summary} Подробные кольца активности и готовность смотри в Фитнесе.`,
        timestamp: replyTs,
        fitnessRedirect: {
          subTab: 'overview',
          title: 'Форма и тело',
          subtitle: `Турник ${recommendation.pullupReadinessPercent}% · Серия ${state.streakDays} дн.`,
          badge: 'Открыть Фитнес',
        },
      };
    }

    if (q.includes('план') || q.includes('программ')) {
      return {
        id: `coach_${replyTs}`,
        sender: 'coach',
        tag: 'План тренировок',
        text: `Твоя текущая программа — «${state.activePlan.name}». Открой вкладку плана в Фитнесе, там расписаны все миссии недели.`,
        timestamp: replyTs,
        fitnessRedirect: {
          subTab: 'plan',
          title: state.activePlan.name,
          subtitle: `Цель: ${state.activePlan.weeklyTargetMissions} трен./нед.`,
          missionId: recommendedMission?.id,
          badge: 'План',
        },
      };
    }

    // Default smart reply
    return {
      id: `coach_${replyTs}`,
      sender: 'coach',
      tag: 'Тренер Маркус',
      text: recommendedMission
        ? `На связи! Сейчас лучший шаг — «${recommendedMission.title}». ${recommendation.subtext}`
        : `На связи! ${recommendation.headline}. Загляни в Фитнес, чтобы выбрать тренировку.`,
      timestamp: replyTs,
      fitnessRedirect: recommendedMission
        ? {
            subTab: 'plan',
            title: recommendedMission.title,
            subtitle: `+${recommendedMission.rewards.respectXp} XP · +$${recommendedMission.rewards.cash}`,
            missionId: recommendedMission.id,
            badge: 'Фитнес',
          }
        : {
            subTab: 'overview',
            title: 'Открыть Фитнес',
            subtitle: `Готовность ${recommendation.pullupReadinessPercent}%`,
            badge: 'Фитнес',
          },
    };
  };

  const handleSendMessage = (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    const outgoing: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    setUserChat((prev) => [...prev, outgoing]);
    setDraft('');
    setIsCoachTyping(true);

    if (replyTimeoutRef.current !== null) {
      window.clearTimeout(replyTimeoutRef.current);
    }

    replyTimeoutRef.current = window.setTimeout(() => {
      const reply = buildCoachReply(text);
      setUserChat((prev) => [...prev, reply]);
      setIsCoachTyping(false);
    }, 520);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(draft);
  };

  return (
    <div className="max-w-[780px] mx-auto h-[calc(100vh-146px)] md:h-[calc(100vh-106px)] flex flex-col rounded-[28px] apple-card overflow-hidden">
      {/* Messenger Top Bar */}
      <header className="shrink-0 px-4 sm:px-5 py-3.5 border-b border-white/[0.08] bg-[#16171B]/90 backdrop-blur-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Coach Avatar */}
          <div className="relative shrink-0">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shadow-[0_6px_18px_rgba(255,55,95,0.3)]"
              style={{
                background: 'linear-gradient(145deg, #FF375F 0%, #FF7A45 100%)',
              }}
            >
              <Dumbbell className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#30D158] border-2 border-[#16171B]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-bold tracking-[-0.02em] text-white truncate">
                Тренер Маркус
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFD60A]/12 text-[11px] font-semibold text-[#FFD60A] tabular-nums">
                <Flame className="w-3 h-3" />
                {state.streakDays} дн.
              </span>
            </div>
            <p className="text-[12px] text-[#98989F] truncate">
              {isCoachTyping
                ? 'печатает...'
                : recoveringMuscles.length === 0
                ? 'Личный тренер · Все мышцы готовы'
                : `Личный тренер · Восстановление ${recoveringMuscles[0].label.toLowerCase()}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void toggleBrowserPush()}
            title={
              state.browserPushEnabled
                ? 'Push-уведомления включены'
                : 'Включить Push-уведомления от тренера'
            }
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition active:scale-95 ${
              state.browserPushEnabled
                ? 'bg-[#30D158]/15 border-[#30D158]/35 text-[#30D158]'
                : 'bg-[#25262B] border-white/[0.08] text-[#98989F] hover:text-white'
            }`}
          >
            {state.browserPushEnabled ? (
              <Bell className="w-4 h-4" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => openFitness('overview')}
            className="h-9 px-3.5 rounded-full bg-gradient-to-r from-[#FF375F] to-[#FF7A45] text-white text-[12px] font-semibold inline-flex items-center gap-1.5 shadow-[0_6px_16px_rgba(255,55,95,0.28)] active:scale-95 transition"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Фитнес</span>
          </button>
        </div>
      </header>

      {/* Recovery Status Strip (if any muscles are recovering) */}
      {recoveringMuscles.length > 0 && (
        <div className="shrink-0 px-4 py-2 bg-black/35 border-b border-white/[0.06] flex items-center justify-between gap-2 text-[12px]">
          <span className="text-[#98989F] truncate">
            Восстановление:{' '}
            <strong className="text-white font-medium">{recoveringMuscles[0].label}</strong>
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-[#FFD60A] shrink-0 tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            {formatDurationMs(recoveringMuscles[0].msLeft)}
          </span>
        </div>
      )}

      {/* Scrollable Chat History */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3.5 bg-[#0F1014]/70">
        <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-white/[0.05] text-[11px] font-medium text-[#8E8E93]">
            Чат с тренером · переходы в Фитнес активны
          </span>
        </div>

        {threadMessages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[86%] sm:max-w-[76%] rounded-[22px] px-4 py-3 space-y-2.5 ${
                  isUser
                    ? 'bg-gradient-to-br from-[#FF375F] to-[#FF6B57] text-white rounded-br-[6px] shadow-[0_8px_22px_-8px_rgba(255,55,95,0.5)]'
                    : 'bg-[#202127] border border-white/[0.08] text-white/95 rounded-bl-[6px]'
                }`}
              >
                {!isUser && msg.tag && (
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#FF85AE]">
                    {msg.tag}
                  </div>
                )}

                <p className="text-[14px] leading-[1.45] whitespace-pre-line">{msg.text}</p>

                {/* Interactive Redirect Card → Fitness App */}
                {!isUser && msg.fitnessRedirect && (
                  <div className="rounded-[16px] bg-black/45 border border-white/[0.1] p-3 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0"
                        style={{
                          background: 'linear-gradient(145deg, #FF375F 0%, #FF7A45 100%)',
                        }}
                      >
                        <Activity className="w-[18px] h-[18px] text-white stroke-[2.2]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-white truncate">
                            {msg.fitnessRedirect.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#98989F] truncate tabular-nums">
                          {msg.fitnessRedirect.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openFitness(msg.fitnessRedirect!.subTab)}
                        className="flex-1 min-w-[130px] h-9 px-3 rounded-[11px] bg-white/[0.1] hover:bg-white/[0.16] border border-white/[0.12] text-white text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
                      >
                        <span>Открыть Фитнес</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#FF85AE]" />
                      </button>

                      {msg.fitnessRedirect.missionId && (
                        <button
                          type="button"
                          onClick={() => startMission(msg.fitnessRedirect!.missionId!)}
                          className="h-9 px-3.5 rounded-[11px] bg-gradient-to-r from-[#FF375F] to-[#FF7A45] text-white text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(255,55,95,0.35)] active:scale-[0.98] transition"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Начать</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div
                  className={`flex items-center justify-end gap-1 text-[10px] tabular-nums ${
                    isUser ? 'text-white/75' : 'text-[#8E8E93]'
                  }`}
                >
                  <span>{formatChatTime(msg.timestamp)}</span>
                  {isUser && <CheckCheck className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>
          );
        })}

        {isCoachTyping && (
          <div className="flex justify-start">
            <div className="rounded-[20px] rounded-bl-[6px] bg-[#202127] border border-white/[0.08] px-4 py-3 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#98989F] animate-bounce [animation-delay:-0.2s]" />
              <span className="w-2 h-2 rounded-full bg-[#98989F] animate-bounce [animation-delay:-0.1s]" />
              <span className="w-2 h-2 rounded-full bg-[#98989F] animate-bounce" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Replies + Composer */}
      <div className="shrink-0 border-t border-white/[0.08] bg-[#16171B]/95 px-3.5 sm:px-4 pt-2.5 pb-3 space-y-2.5">
        {/* Quick Reply Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {QUICK_REPLIES.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleSendMessage(chip.label)}
              className="shrink-0 px-3 py-1.5 rounded-full bg-[#24252B] hover:bg-[#2E3038] border border-white/[0.08] text-[12px] font-medium text-white/90 active:scale-95 transition"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input Row */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Написать тренеру..."
            className="flex-1 h-11 px-4 rounded-full bg-[#24252B] border border-white/[0.1] text-[14px] text-white placeholder:text-[#8E8E93] focus:outline-none focus:border-[#FF6B9D]/55 transition"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Отправить сообщение"
            className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF375F] to-[#FF7A45] text-white flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(255,55,95,0.3)] disabled:opacity-40 active:scale-95 transition"
          >
            <Send className="w-[18px] h-[18px]" />
          </button>
        </form>
      </div>
    </div>
  );
};
