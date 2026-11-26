import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  MapPin,
  MessageCircle,
  Play,
  Send,
  Target,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { calculateMuscleReadiness, formatDurationMs } from '../../engine/recoveryEngine';
import { LifeMission, Mission, MuscleGroup, WorkoutCategory } from '../../types/game';

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
const MISSION_CHATS_STORAGE_KEY = 'solis_mission_chats_v1';

interface MissionChatEntry {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: number;
}

function loadSavedMissionChats(): Record<string, MissionChatEntry[]> {
  try {
    if (typeof window === 'undefined') return {};
    const raw = window.localStorage.getItem(MISSION_CHATS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, MissionChatEntry[]>) : {};
  } catch {
    return {};
  }
}

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
  const { state, now, recommendation, toggleBrowserPush, startMission, toggleLifeSubMission } =
    useGame();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [userChat, setUserChat] = useState<ChatMessage[]>(() => loadSavedChat());
  const [missionChats, setMissionChats] = useState<Record<string, MissionChatEntry[]>>(() =>
    loadSavedMissionChats()
  );
  const [draft, setDraft] = useState('');
  const [missionDraft, setMissionDraft] = useState('');
  const [isCoachTyping, setIsCoachTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const missionBottomRef = useRef<HTMLDivElement | null>(null);
  const replyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(MISSION_CHATS_STORAGE_KEY, JSON.stringify(missionChats));
    } catch {
      // ignore storage quota errors
    }
  }, [missionChats]);

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
                subtitle: `${linkedMission.tasks.length} упр.`,
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
            subtitle: `Готовность ${recommendation.pullupReadinessPercent}% · ${recommendedMission.tasks.length} упр.`,
            missionId: recommendedMission.id,
            badge: 'Рекомендация',
          }
        : {
            subTab: 'plan',
            title: 'План тренировок',
            subtitle: `Серия ${state.streakDays} дн.`,
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
              subtitle: `${m.tasks.length} упр.`,
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
              subtitle: `${m.tasks.length} упр.`,
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
              subtitle: `${m.tasks.length} упр.`,
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
      tag: 'Тренер',
      text: recommendedMission
        ? `На связи! Сейчас лучший шаг — «${recommendedMission.title}». ${recommendation.subtext}`
        : `На связи! ${recommendation.headline}. Загляни в Фитнес, чтобы выбрать тренировку.`,
      timestamp: replyTs,
      fitnessRedirect: recommendedMission
        ? {
            subTab: 'plan',
            title: recommendedMission.title,
            subtitle: `${recommendedMission.tasks.length} упр.`,
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

  const orderedMissions = useMemo<LifeMission[]>(() => {
    const active = state.lifeMissions.filter((m) => m.status === 'active');
    const completed = state.lifeMissions.filter((m) => m.status === 'completed');
    return [...active, ...completed];
  }, [state.lifeMissions]);

  const selectedMission = useMemo(
    () =>
      selectedChatId && selectedChatId !== 'coach'
        ? state.lifeMissions.find((m) => m.id === selectedChatId) ?? null
        : null,
    [selectedChatId, state.lifeMissions]
  );

  const selectedMissionGroup = useMemo(
    () =>
      selectedMission
        ? state.missionGroups.find((g) => g.id === selectedMission.groupId)
        : undefined,
    [selectedMission, state.missionGroups]
  );

  const activeMissionMessages = selectedMission ? missionChats[selectedMission.id] ?? [] : [];

  useEffect(() => {
    if (selectedMission) {
      missionBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedMission?.id, activeMissionMessages.length]);

  const handleSendMissionMessage = (rawText: string) => {
    if (!selectedMission) return;
    const text = rawText.trim();
    if (!text) return;

    const ts = Date.now();
    const userMsg: MissionChatEntry = {
      id: `m_user_${ts}`,
      sender: 'user',
      text,
      timestamp: ts,
    };

    const remaining = selectedMission.subMissions.filter((s) => !s.completed);
    const q = text.toLowerCase();
    let replyText = '';
    if (remaining.length === 0) {
      replyText = `Все шаги миссии «${selectedMission.title}» выполнены! Отличная работа.`;
    } else if (q.includes('шаг') || q.includes('напомн') || q.includes('остал')) {
      replyText = `Осталось ${remaining.length} из ${selectedMission.subMissions.length}:\n${remaining
        .map((s, idx) => `${idx + 1}. ${s.title}${s.quantity ? ` (${s.quantity})` : ''}`)
        .join('\n')}`;
    } else if (q.includes('готов')) {
      replyText = `Отмечай выполненные пункты прямо в списке выше — осталось ${remaining.length} шаг(а).`;
    } else {
      replyText = `Записал заметку по миссии «${selectedMission.title}». Следующий шаг: ${remaining[0].title}.`;
    }

    const assistantMsg: MissionChatEntry = {
      id: `m_bot_${ts + 1}`,
      sender: 'assistant',
      text: replyText,
      timestamp: ts + 300,
    };

    setMissionChats((prev) => ({
      ...prev,
      [selectedMission.id]: [...(prev[selectedMission.id] ?? []), userMsg, assistantMsg].slice(
        -40
      ),
    }));
    setMissionDraft('');
  };

  // 1. CHATS LIST VIEW (default — nothing auto-opened)
  if (!selectedChatId) {
    const lastCoachMsg = threadMessages[threadMessages.length - 1];
    return (
      <div className="max-w-[780px] mx-auto min-h-[calc(100vh-146px)] md:min-h-[calc(100vh-106px)] flex flex-col rounded-[28px] apple-card overflow-hidden">
        <header className="shrink-0 px-5 py-4 border-b border-white/[0.08] bg-[#1C1C1E]/90 backdrop-blur-xl flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-bold tracking-[-0.02em] text-white">Сообщения</h1>
            <p className="text-[12px] text-[#98989F]">
              Выбери чат с тренером или по любой миссии
            </p>
          </div>
          <button
            type="button"
            onClick={() => void toggleBrowserPush()}
            title={
              state.browserPushEnabled
                ? 'Push-уведомления включены'
                : 'Включить Push-уведомления'
            }
            className={`w-11 h-11 rounded-full flex items-center justify-center border transition active:scale-95 ${
              state.browserPushEnabled
                ? 'bg-[#30D158]/15 border-[#30D158]/35 text-[#30D158]'
                : 'bg-[#2C2C2E] border-transparent text-[#98989F] hover:text-white'
            }`}
          >
            {state.browserPushEnabled ? (
              <Bell className="w-4 h-4" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06] bg-black/60">
          {/* Coach Chat Row */}
          <button
            type="button"
            onClick={() => setSelectedChatId('coach')}
            className="w-full px-4 sm:px-5 py-3.5 flex items-center gap-3.5 text-left hover:bg-white/[0.04] active:bg-white/[0.06] transition"
          >
            <div className="relative shrink-0">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, #FF375F 0%, #FF7A45 100%)',
                }}
              >
                <Dumbbell className="w-5 h-5 text-white stroke-[2.2]" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#30D158] border-2 border-[#000000]" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[15px] font-semibold text-white truncate">Тренер</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.08] text-[12px] font-semibold text-[#98989F] tabular-nums shrink-0">
                    <Flame className="w-2.5 h-2.5" />
                    {state.streakDays} дн.
                  </span>
                </div>
                {lastCoachMsg && (
                  <span className="text-[12px] text-[#98989F] tabular-nums shrink-0">
                    {formatChatTime(lastCoachMsg.timestamp)}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[13px] text-[#98989F] truncate">
                {lastCoachMsg?.text ?? recommendation.headline}
              </p>
            </div>

            <ChevronRight className="w-4 h-4 text-[#636366] shrink-0" />
          </button>

          {/* Section label for Mission Chats */}
          <div className="px-4 sm:px-5 py-2 bg-white/[0.02] text-[12px] font-semibold text-[#98989F] flex items-center justify-between">
            <span>Чаты миссий</span>
            <span className="tabular-nums">{orderedMissions.length}</span>
          </div>

          {orderedMissions.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-[#98989F]">
              Пока нет миссий. Создай миссию в разделе «Миссии» — и здесь появится её чат.
            </div>
          ) : (
            orderedMissions.map((mission) => {
              const group = state.missionGroups.find((g) => g.id === mission.groupId);
              const doneCount = mission.subMissions.filter((s) => s.completed).length;
              const totalCount = mission.subMissions.length;
              const history = missionChats[mission.id] ?? [];
              const lastMsg = history[history.length - 1];
              const isDone = mission.status === 'completed';

              return (
                <button
                  key={mission.id}
                  type="button"
                  onClick={() => setSelectedChatId(mission.id)}
                  className="w-full px-4 sm:px-5 py-3.5 flex items-center gap-3.5 text-left hover:bg-white/[0.04] active:bg-white/[0.06] transition"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-white/10"
                    style={{
                      backgroundColor: `${group?.color ?? '#FF6B8B'}22`,
                      color: group?.color ?? '#FF6B8B',
                    }}
                  >
                    <Target className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[15px] font-semibold truncate ${
                          isDone ? 'text-[#98989F] line-through' : 'text-white'
                        }`}
                      >
                        {mission.title}
                      </span>
                      <span className="text-[12px] text-[#98989F] tabular-nums shrink-0">
                        {lastMsg ? formatChatTime(lastMsg.timestamp) : `${doneCount}/${totalCount}`}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-[#98989F] truncate">
                      {lastMsg
                        ? lastMsg.text
                        : mission.subtitle ||
                          (isDone
                            ? 'Миссия выполнена'
                            : `Прогресс: ${doneCount} из ${totalCount}`)}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#636366] shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // 2. MISSION CHAT VIEW
  if (selectedMission) {
    const doneCount = selectedMission.subMissions.filter((s) => s.completed).length;
    const totalCount = selectedMission.subMissions.length;
    const accentColor = selectedMissionGroup?.color ?? '#FF6B8B';

    return (
      <div className="max-w-[780px] mx-auto h-[calc(100vh-146px)] md:h-[calc(100vh-106px)] flex flex-col rounded-[28px] apple-card overflow-hidden">
        <header className="shrink-0 px-3 sm:px-5 py-3.5 border-b border-white/[0.08] bg-[#1C1C1E]/90 backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedChatId(null)}
              className="w-11 h-11 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] flex items-center justify-center text-white shrink-0 active:scale-95 transition"
              aria-label="Назад к чатам"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-white/10"
              style={{
                backgroundColor: `${accentColor}22`,
                color: accentColor,
              }}
            >
              <Target className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <h1 className="text-[15px] font-bold tracking-[-0.02em] text-white truncate">
                {selectedMission.title}
              </h1>
              <p className="text-[12px] text-[#98989F] truncate tabular-nums">
                {selectedMissionGroup?.name ?? 'Миссия'} · {doneCount}/{totalCount} выполнено
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3.5 bg-black/60">
          {/* Mission Briefing + Interactive Checklist */}
          <div className="flex justify-start">
            <div className="max-w-[92%] sm:max-w-[82%] rounded-[22px] rounded-bl-[6px] bg-[#2C2C2E] px-4 py-3.5 space-y-3">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: accentColor }}>
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Брифинг миссии</span>
              </div>

              {selectedMission.subtitle && (
                <p className="text-[14px] text-white/90 leading-[1.45]">
                  {selectedMission.subtitle}
                </p>
              )}

              {selectedMission.mapPin && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] text-[12px] text-[#98989F]">
                  <MapPin className="w-3.5 h-3.5 text-[#FF6B8B]" />
                  <span>{selectedMission.mapPin.placeName}</span>
                </div>
              )}

              {selectedMission.subMissions.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {selectedMission.subMissions.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => toggleLifeSubMission(selectedMission.id, sub.id)}
                      className="w-full px-3 py-2 rounded-[12px] bg-black/35 hover:bg-black/50 flex items-center gap-2.5 text-left transition"
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition ${
                          sub.completed
                            ? 'bg-[#30D158] border-[#30D158] text-black'
                            : 'border-white/25 text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                      <span
                        className={`text-[13px] flex-1 ${
                          sub.completed ? 'line-through text-[#98989F]' : 'text-white/95'
                        }`}
                      >
                        {sub.title}
                      </span>
                      {sub.quantity && (
                        <span className="text-[12px] text-[#98989F] shrink-0">{sub.quantity}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mission Chat Messages */}
          {activeMissionMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[86%] sm:max-w-[76%] rounded-[22px] px-4 py-3 space-y-1.5 ${
                    isUser
                      ? 'bg-gradient-to-br from-[#FF375F] to-[#FF6B57] text-white rounded-br-[6px]'
                      : 'bg-[#2C2C2E] text-white/95 rounded-bl-[6px]'
                  }`}
                >
                  <p className="text-[14px] leading-[1.45] whitespace-pre-line">{msg.text}</p>
                  <div
                    className={`flex items-center justify-end gap-1 text-[11px] tabular-nums ${
                      isUser ? 'text-white/75' : 'text-[#98989F]'
                    }`}
                  >
                    <span>{formatChatTime(msg.timestamp)}</span>
                    {isUser && <CheckCheck className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={missionBottomRef} />
        </div>

        <div className="shrink-0 border-t border-white/[0.08] bg-[#1C1C1E]/95 px-3.5 sm:px-4 pt-2.5 pb-3 space-y-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {['Напомни шаги', 'Сколько осталось?', 'Готово!'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSendMissionMessage(chip)}
                className="shrink-0 px-4 py-2.5 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[13px] font-medium text-white/90 active:scale-95 transition"
              >
                {chip}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMissionMessage(missionDraft);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={missionDraft}
              onChange={(e) => setMissionDraft(e.target.value)}
              placeholder="Заметка или вопрос по миссии..."
              className="flex-1 h-11 px-4 rounded-full bg-[#2C2C2E] text-[14px] text-white placeholder:text-[#98989F] focus:outline-none focus:border-[#FF375F]/60 transition"
            />
            <button
              type="submit"
              disabled={!missionDraft.trim()}
              aria-label="Отправить"
              className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF375F] to-[#FF7A45] text-white flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition"
            >
              <Send className="w-[18px] h-[18px]" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. COACH CHAT VIEW
  return (
    <div className="max-w-[780px] mx-auto h-[calc(100vh-146px)] md:h-[calc(100vh-106px)] flex flex-col rounded-[28px] apple-card overflow-hidden">
      {/* Messenger Top Bar */}
      <header className="shrink-0 px-3 sm:px-5 py-3.5 border-b border-white/[0.08] bg-[#1C1C1E]/90 backdrop-blur-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setSelectedChatId(null)}
            className="w-11 h-11 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] flex items-center justify-center text-white shrink-0 active:scale-95 transition"
            aria-label="Назад к чатам"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Coach Avatar */}
          <div className="relative shrink-0">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, #FF375F 0%, #FF7A45 100%)',
              }}
            >
              <Dumbbell className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#30D158] border-2 border-[#1C1C1E]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-bold tracking-[-0.02em] text-white truncate">
                Тренер
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.08] text-[12px] font-semibold text-[#98989F] tabular-nums">
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
            className={`w-11 h-11 rounded-full flex items-center justify-center border transition active:scale-95 ${
              state.browserPushEnabled
                ? 'bg-[#30D158]/15 border-[#30D158]/35 text-[#30D158]'
                : 'bg-[#2C2C2E] border-transparent text-[#98989F] hover:text-white'
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
            className="h-11 px-4 rounded-full bg-gradient-to-r from-[#FF375F] to-[#FF7A45] text-white text-[12px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition"
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
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3.5 bg-black/60">

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
                    ? 'bg-gradient-to-br from-[#FF375F] to-[#FF6B57] text-white rounded-br-[6px]'
                    : 'bg-[#2C2C2E] text-white/95 rounded-bl-[6px]'
                }`}
              >
                {!isUser && msg.tag && (
                  <div className="text-[12px] font-semibold text-[#FF6B8B]">
                    {msg.tag}
                  </div>
                )}

                <p className="text-[14px] leading-[1.45] whitespace-pre-line">{msg.text}</p>

                {/* Interactive Redirect Card → Fitness App */}
                {!isUser && msg.fitnessRedirect && (
                  <div className="rounded-[16px] bg-black/45 p-3 space-y-2.5">
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
                        <div className="text-[12px] text-[#98989F] truncate tabular-nums">
                          {msg.fitnessRedirect.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openFitness(msg.fitnessRedirect!.subTab)}
                        className="flex-1 min-w-[130px] h-11 px-3.5 rounded-[11px] bg-white/[0.1] hover:bg-white/[0.16] text-white text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
                      >
                        <span>Открыть Фитнес</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#FF6B8B]" />
                      </button>

                      {msg.fitnessRedirect.missionId && (
                        <button
                          type="button"
                          onClick={() => startMission(msg.fitnessRedirect!.missionId!)}
                          className="h-11 px-4 rounded-[11px] bg-gradient-to-r from-[#FF375F] to-[#FF7A45] text-white text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Начать</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div
                  className={`flex items-center justify-end gap-1 text-[11px] tabular-nums ${
                    isUser ? 'text-white/75' : 'text-[#98989F]'
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
            <div className="rounded-[20px] rounded-bl-[6px] bg-[#2C2C2E] px-4 py-3 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#98989F] animate-bounce [animation-delay:-0.2s]" />
              <span className="w-2 h-2 rounded-full bg-[#98989F] animate-bounce [animation-delay:-0.1s]" />
              <span className="w-2 h-2 rounded-full bg-[#98989F] animate-bounce" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Replies + Composer */}
      <div className="shrink-0 border-t border-white/[0.08] bg-[#1C1C1E]/95 px-3.5 sm:px-4 pt-2.5 pb-3 space-y-2.5">
        {/* Quick Reply Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {QUICK_REPLIES.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleSendMessage(chip.label)}
              className="shrink-0 px-4 py-2.5 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[13px] font-medium text-white/90 active:scale-95 transition"
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
            className="flex-1 h-11 px-4 rounded-full bg-[#2C2C2E] text-[14px] text-white placeholder:text-[#98989F] focus:outline-none focus:border-[#FF375F]/60 transition"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Отправить сообщение"
            className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF375F] to-[#FF7A45] text-white flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition"
          >
            <Send className="w-[18px] h-[18px]" />
          </button>
        </form>
      </div>
    </div>
  );
};
