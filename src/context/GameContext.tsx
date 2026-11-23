import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { getContactById } from '../data/contacts';
import { EXERCISES } from '../data/exercises';
import { createInitialMissions, createInitialRewards } from '../data/missions';
import { generateOptimalPlan } from '../engine/planGenerator';
import {
  calculateMuscleReadiness,
  createInitialMuscleRecovery,
  formatDurationMs,
  getNextTrainingRecommendation,
} from '../engine/recoveryEngine';
import {
  playLevelUpSound,
  playMissionPassedSound,
  playRadarBlipSound,
  playSmsSound,
} from '../engine/soundEffects';
import {
  CharacterStatsBars,
  GameContextValue,
  GameState,
  Mission,
  MissionExerciseTask,
  MissionPassedSummary,
  MuscleGroup,
  MuscleRecoveryState,
  PhoneNotification,
  PlanCalibrationInput,
  RewardItem,
  WorkoutLogEntry,
} from '../types/game';

const STORAGE_KEY = 'life_is_game_solis_v2';

function getRankTitle(level: number): string {
  if (level >= 12) return 'Мастер';
  if (level >= 8) return 'Профи';
  if (level >= 5) return 'Атлет';
  if (level >= 3) return 'Уверенный старт';
  return 'Новичок';
}

function getDateKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getYesterdayDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function createUid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialState(): GameState {
  const baseMissions = createInitialMissions();
  const { plan, missions } = generateOptimalPlan(
    {
      playerName: 'Алекс',
      availableEquipment: ['pullup_bar', 'bodyweight', 'mobility_mat'],
      enabledExerciseIds: [],
      maxPullups: 5,
      maxPushups: 15,
      focus: 'pullup_bar',
      greaseMinutes: 90,
      daysPerWeek: 4,
    },
    baseMissions
  );

  const now = Date.now();

  return {
    playerName: 'Алекс',
    rankTitle: getRankTitle(1),
    level: 1,
    respectXp: 0,
    nextLevelXp: 300,
    cash: 150,
    streakDays: 1,
    heatStars: 1,
    lastWorkoutDate: null,
    onboardingCompleted: false,
    activePlan: plan,
    stats: {
      healthLevel: 50,
      maxHp: 100,
      currentHp: 100,
      strength: 22,
      stamina: 20,
      agility: 18,
      discipline: 20,
    },
    muscleRecovery: createInitialMuscleRecovery(),
    missions,
    activeMissionId: null,
    nextGreaseTimestamp: null,
    notifications: [
      {
        id: 'notif_welcome_marcus',
        contactId: 'coach_dre',
        title: 'Программа готова',
        message:
          'Выбери снаряды и упражнения под рукой — система сама составит план и будет сообщать, когда мышцы восстановятся.',
        timestamp: now,
        read: false,
        actionMissionId: missions[0]?.id,
        category: 'mission_passed',
      },
    ],
    rewards: createInitialRewards(),
    history: [],
    soundEnabled: false,
    browserPushEnabled: false,
  };
}

function loadSavedState(): GameState {
  try {
    if (typeof window === 'undefined') return createInitialState();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const fallback = createInitialState();

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.missions) ||
      !parsed.stats ||
      !parsed.muscleRecovery
    ) {
      return fallback;
    }

    const savedEquipment = Array.isArray(parsed.activePlan?.availableEquipment)
      ? parsed.activePlan.availableEquipment
      : fallback.activePlan.availableEquipment;
    const savedEnabledIds = Array.isArray(parsed.activePlan?.enabledExerciseIds)
      ? parsed.activePlan.enabledExerciseIds
      : fallback.activePlan.enabledExerciseIds;
    const savedMaxPullups =
      typeof parsed.activePlan?.maxPullupsBaseline === 'number'
        ? parsed.activePlan.maxPullupsBaseline
        : fallback.activePlan.maxPullupsBaseline;
    const savedMaxPushups =
      typeof parsed.activePlan?.maxPushupsBaseline === 'number'
        ? parsed.activePlan.maxPushupsBaseline
        : fallback.activePlan.maxPushupsBaseline;

    const recalibrated = generateOptimalPlan(
      {
        playerName: parsed.playerName ?? fallback.playerName,
        availableEquipment: savedEquipment,
        enabledExerciseIds: savedEnabledIds,
        maxPullups: savedMaxPullups,
        maxPushups: savedMaxPushups,
        focus: parsed.activePlan?.primaryFocus ?? fallback.activePlan.primaryFocus,
      },
      createInitialMissions()
    );

    const oldMissionMap = new Map(
      (Array.isArray(parsed.missions) ? parsed.missions : []).map((m) => [m.id, m])
    );

    const migratedMissions = recalibrated.missions.map((fresh) => {
      const prev = oldMissionMap.get(fresh.id);
      return prev
        ? {
            ...fresh,
            timesCompleted: prev.timesCompleted ?? 0,
            lastCompletedAt: prev.lastCompletedAt,
            isUnlocked: prev.isUnlocked || fresh.isUnlocked,
          }
        : fresh;
    });

    const cleanLevel = typeof parsed.level === 'number' ? parsed.level : fallback.level;

    return {
      ...fallback,
      ...parsed,
      rankTitle: getRankTitle(cleanLevel),
      missions: migratedMissions,
      stats: { ...fallback.stats, ...parsed.stats },
      activePlan: {
        ...recalibrated.plan,
      },
      muscleRecovery: { ...fallback.muscleRecovery, ...parsed.muscleRecovery },
      notifications: Array.isArray(parsed.notifications)
        ? parsed.notifications
        : fallback.notifications,
      rewards: Array.isArray(parsed.rewards) ? parsed.rewards : fallback.rewards,
      history: Array.isArray(parsed.history) ? parsed.history : fallback.history,
    };
  } catch {
    return createInitialState();
  }
}

function clampStat(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function sendBrowserPush(title: string, body: string, enabled: boolean): void {
  try {
    if (!enabled || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
    if (window.Notification.permission === 'granted') {
      new window.Notification(title, { body });
    }
  } catch {
    // Игнорируем ограничения браузера
  }
}

function applyLevelProgress(
  level: number,
  respectXp: number,
  nextLevelXp: number,
  maxHp: number
): {
  level: number;
  nextLevelXp: number;
  maxHp: number;
  leveledUp: boolean;
  unlockedTitles: string[];
} {
  let currLevel = level;
  let currNextXp = nextLevelXp;
  let currMaxHp = maxHp;
  let leveledUp = false;
  const unlockedTitles: string[] = [];

  while (respectXp >= currNextXp) {
    const prevRank = getRankTitle(currLevel);
    currLevel += 1;
    leveledUp = true;
    currNextXp = currNextXp + 300 + currLevel * 150;
    currMaxHp = Math.min(200, currMaxHp + 8);
    const nextRank = getRankTitle(currLevel);
    if (nextRank !== prevRank) {
      unlockedTitles.push(nextRank);
    }
  }

  return {
    level: currLevel,
    nextLevelXp: currNextXp,
    maxHp: currMaxHp,
    leveledUp,
    unlockedTitles,
  };
}

function applyFatigueToRecovery(
  prevRecovery: Record<MuscleGroup, MuscleRecoveryState>,
  tasks: MissionExerciseTask[],
  now: number,
  intensityMultiplier = 1
): Record<MuscleGroup, MuscleRecoveryState> {
  const next: Record<MuscleGroup, MuscleRecoveryState> = { ...prevRecovery };
  const hoursByMuscle: Partial<Record<MuscleGroup, number>> = {};

  for (const task of tasks) {
    const ex = EXERCISES[task.exerciseId];
    if (!ex || ex.category === 'mobility_hp') continue;

    const setsDone = Math.max(1, task.completedSets.length || task.sets);
    const ratio = Math.min(1.4, (setsDone / Math.max(1, ex.defaultSets)) * intensityMultiplier);

    for (const m of ex.primaryMuscles) {
      const h = ex.recoveryHours * ratio;
      hoursByMuscle[m] = Math.max(hoursByMuscle[m] ?? 0, h);
    }
    for (const m of ex.secondaryMuscles) {
      const h = ex.recoveryHours * 0.45 * ratio;
      hoursByMuscle[m] = Math.max(hoursByMuscle[m] ?? 0, h);
    }
  }

  (Object.keys(hoursByMuscle) as MuscleGroup[]).forEach((group) => {
    const hours = hoursByMuscle[group];
    if (!hours || hours <= 0) return;

    const current = next[group];
    const existingRemaining =
      current.readyAtTimestamp && current.readyAtTimestamp > now
        ? current.readyAtTimestamp - now
        : 0;
    const addedMs = Math.round(hours * 3600 * 1000);
    const totalMs = Math.min(72 * 3600 * 1000, existingRemaining + addedMs);

    const readyAt = now + totalMs;
    const updatedState: MuscleRecoveryState = {
      ...current,
      lastTrainedAt: now,
      readyAtTimestamp: readyAt,
      readinessPercent: 0,
    };
    updatedState.readinessPercent = calculateMuscleReadiness(updatedState, now);
    next[group] = updatedState;
  });

  return next;
}

function accelerateAllRecovery(
  prevRecovery: Record<MuscleGroup, MuscleRecoveryState>,
  now: number,
  speedupFraction = 0.25
): Record<MuscleGroup, MuscleRecoveryState> {
  const next: Record<MuscleGroup, MuscleRecoveryState> = { ...prevRecovery };

  (Object.keys(next) as MuscleGroup[]).forEach((group) => {
    const item = next[group];
    if (item.readyAtTimestamp && item.readyAtTimestamp > now) {
      const remaining = item.readyAtTimestamp - now;
      const newRemaining = Math.round(remaining * (1 - speedupFraction));
      if (newRemaining <= 30_000) {
        next[group] = {
          ...item,
          readinessPercent: 100,
          readyAtTimestamp: now,
        };
      } else {
        const updated: MuscleRecoveryState = {
          ...item,
          readyAtTimestamp: now + newRemaining,
        };
        updated.readinessPercent = calculateMuscleReadiness(updated, now);
        next[group] = updated;
      }
    }
  });

  return next;
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [rawState, setRawState] = useState<GameState>(() => loadSavedState());
  const [now, setNow] = useState<number>(() => Date.now());
  const [missionPassedSummary, setMissionPassedSummary] =
    useState<MissionPassedSummary | null>(null);
  const [activeToast, setActiveToast] = useState<PhoneNotification | null>(null);
  const [isPhoneOpen, setIsPhoneOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(
    () => !loadSavedState().onboardingCompleted
  );

  const notifiedGreaseTsRef = useRef<number | null>(null);
  const notifiedMuscleTrainedAtRef = useRef<Partial<Record<MuscleGroup, number>>>({});
  const isApplyingCloudRef = useRef<boolean>(false);
  const cloudHydratedUidRef = useRef<string | null>(null);
  const lastCloudUpdatedAtRef = useRef<number>(0);

  // Живой расчёт процентов восстановления всех мышц относительно текущего `now`
  const state = useMemo<GameState>(() => {
    const liveRecovery: Record<MuscleGroup, MuscleRecoveryState> = {
      ...rawState.muscleRecovery,
    };
    (Object.keys(liveRecovery) as MuscleGroup[]).forEach((group) => {
      const item = liveRecovery[group];
      liveRecovery[group] = {
        ...item,
        readinessPercent: calculateMuscleReadiness(item, now),
      };
    });

    return {
      ...rawState,
      muscleRecovery: liveRecovery,
    };
  }, [rawState, now]);

  // Автосохранение в localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rawState));
      }
    } catch {
      // Игнорируем ошибку переполнения storage
    }
  }, [rawState]);

  // Подписка на облачное состояние Cloud Firestore при входе в аккаунт
  useEffect(() => {
    if (!db || !user) {
      cloudHydratedUidRef.current = null;
      return;
    }

    const stateRef = doc(db, 'users', user.uid, 'game', 'state');

    const unsub = onSnapshot(
      stateRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<GameState> & { updatedAt?: number };
          const remoteTs = typeof data.updatedAt === 'number' ? data.updatedAt : 0;

          if (remoteTs > lastCloudUpdatedAtRef.current || cloudHydratedUidRef.current !== user.uid) {
            lastCloudUpdatedAtRef.current = remoteTs;
            cloudHydratedUidRef.current = user.uid;
            isApplyingCloudRef.current = true;
            setRawState((prev) => ({
              ...prev,
              ...data,
              stats: { ...prev.stats, ...(data.stats ?? {}) },
              activePlan: { ...prev.activePlan, ...(data.activePlan ?? {}) },
              muscleRecovery: { ...prev.muscleRecovery, ...(data.muscleRecovery ?? {}) },
            }));
            if (data.onboardingCompleted) {
              setIsOnboardingOpen(false);
            }
          }
        } else {
          // Первый вход нового аккаунта: выгружаем локальный прогресс в облако
          cloudHydratedUidRef.current = user.uid;
          const ts = Date.now();
          lastCloudUpdatedAtRef.current = ts;
          const sanitized = JSON.parse(
            JSON.stringify({
              ...rawState,
              playerName:
                rawState.playerName === 'Алекс' && user.displayName
                  ? user.displayName
                  : rawState.playerName,
              updatedAt: ts,
            })
          );
          void setDoc(stateRef, sanitized, { merge: true });
        }
      },
      () => {
        // Оффлайн или правила недоступны — продолжаем работать локально
      }
    );

    return () => unsub();
  }, [user]);

  // Дебаунс-синхронизация локальных изменений в Cloud Firestore
  useEffect(() => {
    if (!db || !user || cloudHydratedUidRef.current !== user.uid) return;
    if (isApplyingCloudRef.current) {
      isApplyingCloudRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      if (!db || !user) return;
      const ts = Date.now();
      lastCloudUpdatedAtRef.current = ts;
      const stateRef = doc(db, 'users', user.uid, 'game', 'state');
      const sanitized = JSON.parse(JSON.stringify({ ...rawState, updatedAt: ts }));
      void setDoc(stateRef, sanitized, { merge: true }).catch(() => {
        // Игнорируем временную потерю сети
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [rawState, user]);

  const pushNotification = useCallback(
    (notif: Omit<PhoneNotification, 'id' | 'timestamp' | 'read'>) => {
      const fullNotif: PhoneNotification = {
        ...notif,
        id: createUid('notif'),
        timestamp: Date.now(),
        read: false,
      };

      setRawState((prev) => {
        if (prev.soundEnabled) {
          playSmsSound();
        }
        const contact = getContactById(fullNotif.contactId);
        sendBrowserPush(
          `${contact.name}: ${fullNotif.title}`,
          fullNotif.message,
          prev.browserPushEnabled
        );

        return {
          ...prev,
          notifications: [fullNotif, ...prev.notifications].slice(0, 40),
        };
      });

      setActiveToast(fullNotif);
    },
    []
  );

  // Секундный тик таймеров и отслеживание готовности
  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);

      const greaseMission = rawState.missions.find(
        (m) => m.type === 'grease_the_groove'
      );

      // Проверка истечения таймера Grease the Groove
      if (
        greaseMission &&
        rawState.nextGreaseTimestamp !== null &&
        currentNow >= rawState.nextGreaseTimestamp &&
        notifiedGreaseTsRef.current !== rawState.nextGreaseTimestamp
      ) {
        notifiedGreaseTsRef.current = rawState.nextGreaseTimestamp;
        pushNotification({
          contactId: 'coach_dre',
          title: 'ЦНС заряжена на 100%!',
          message:
            'Время пришло! Запрыгни на турник и сделай 1 непредельный подход (Grease the Groove). +Respect ждёт!',
          actionMissionId: greaseMission.id,
          category: 'grease_reminder',
        });
      }

      // Автоматическая проверка восстановления ВСЕХ групп мышц до >= 85%
      (Object.keys(rawState.muscleRecovery) as MuscleGroup[]).forEach((group) => {
        const muscleState = rawState.muscleRecovery[group];
        if (
          muscleState.lastTrainedAt !== null &&
          muscleState.readyAtTimestamp !== null &&
          notifiedMuscleTrainedAtRef.current[group] !== muscleState.lastTrainedAt
        ) {
          const readiness = calculateMuscleReadiness(muscleState, currentNow);
          if (readiness >= 85) {
            notifiedMuscleTrainedAtRef.current[group] = muscleState.lastTrainedAt;

            const matchingMission =
              rawState.missions.find(
                (m) =>
                  m.isUnlocked &&
                  m.type !== 'grease_the_groove' &&
                  m.tasks.some((t) => EXERCISES[t.exerciseId]?.primaryMuscles.includes(group))
              ) ??
              rawState.missions.find((m) => m.isUnlocked && m.type === 'main_campaign') ??
              rawState.missions[0];

            pushNotification({
              contactId: group === 'back_biceps' ? 'coach_dre' : 'doc_elena',
              title: `${muscleState.label} готовы`,
              message: `Группа «${muscleState.label}» восстановилась на ${readiness}% — можно снова давать нагрузку.`,
              actionMissionId: matchingMission?.id,
              category: 'recovery_ready',
            });
          }
        }
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    rawState.nextGreaseTimestamp,
    rawState.muscleRecovery,
    rawState.missions,
    pushNotification,
  ]);

  const recommendation = useMemo(
    () => getNextTrainingRecommendation(state, now),
    [state, now]
  );

  const unreadNotificationsCount = useMemo(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications]
  );

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const closeMissionPassedModal = useCallback(() => {
    setMissionPassedSummary(null);
  }, []);

  const startMission = useCallback(
    (missionId: string) => {
      if (rawState.soundEnabled) playRadarBlipSound();
      setRawState((prev) => ({
        ...prev,
        activeMissionId: missionId,
      }));
    },
    [rawState.soundEnabled]
  );

  const cancelActiveMission = useCallback(() => {
    if (rawState.soundEnabled) playRadarBlipSound();
    setRawState((prev) => ({
      ...prev,
      activeMissionId: null,
    }));
  }, [rawState.soundEnabled]);

  const completeMission = useCallback(
    (missionId: string, completedTasks: MissionExerciseTask[]) => {
      const currentNow = Date.now();
      const targetMission = rawState.missions.find((m) => m.id === missionId);
      if (!targetMission) return;

      const isMedkitOrMobility =
        missionId === 'm_side_medkit' || targetMission.category === 'mobility_hp';

      // Расчёт бонусов
      const earnedRespect = targetMission.rewards.respectXp;
      const earnedCash = targetMission.rewards.cash;
      const healthBonus = targetMission.rewards.healthBonus;

      const totalSets = completedTasks.reduce(
        (acc, t) => acc + (t.completedSets.length || t.sets),
        0
      );
      const totalRepsOrSec = completedTasks.reduce((acc, t) => {
        if (t.completedSets.length > 0) {
          return acc + t.completedSets.reduce((s, v) => s + v, 0);
        }
        return acc + t.sets * t.targetPerSet;
      }, 0);

      const newRespectXp = rawState.respectXp + earnedRespect;
      const levelResult = applyLevelProgress(
        rawState.level,
        newRespectXp,
        rawState.nextLevelXp,
        rawState.stats.maxHp
      );

      // Обновление статов
      const boosts = targetMission.rewards.statBoosts;
      const nextStats: CharacterStatsBars = {
        healthLevel: clampStat(
          rawState.stats.healthLevel + (boosts.healthLevel ?? Math.ceil(healthBonus / 3))
        ),
        maxHp: levelResult.maxHp,
        currentHp: isMedkitOrMobility
          ? levelResult.maxHp
          : levelResult.leveledUp
            ? levelResult.maxHp
            : Math.min(levelResult.maxHp, rawState.stats.currentHp + healthBonus),
        strength: clampStat(rawState.stats.strength + (boosts.strength ?? 0)),
        stamina: clampStat(rawState.stats.stamina + (boosts.stamina ?? 0)),
        agility: clampStat(rawState.stats.agility + (boosts.agility ?? 0)),
        discipline: clampStat(rawState.stats.discipline + (boosts.discipline ?? 1)),
      };

      // Стрик и звёзды активности
      const todayKey = getDateKey(currentNow);
      const yesterdayKey = getYesterdayDateKey(currentNow);
      let nextStreak = rawState.streakDays;
      if (rawState.lastWorkoutDate !== todayKey) {
        if (rawState.lastWorkoutDate === yesterdayKey) {
          nextStreak = rawState.streakDays + 1;
        } else {
          nextStreak = 1;
        }
      }

      const todayCount =
        rawState.history.filter((h) => getDateKey(h.completedAt) === todayKey).length + 1;
      const nextHeatStars = Math.min(
        6,
        Math.max(1, 1 + Math.floor(nextStreak / 2) + (todayCount >= 2 ? 1 : 0))
      );

      // Восстановление мышц: если Аптечка/Мобильность — ускоряем реген на 25% и хилим до фулл HP
      let nextRecovery: Record<MuscleGroup, MuscleRecoveryState>;
      if (isMedkitOrMobility) {
        nextRecovery = accelerateAllRecovery(rawState.muscleRecovery, currentNow, 0.25);
      } else {
        const intensity = targetMission.type === 'grease_the_groove' ? 0.35 : 1;
        nextRecovery = applyFatigueToRecovery(
          rawState.muscleRecovery,
          completedTasks,
          currentNow,
          intensity
        );
      }

      // Разблокировка следующих миссий и обновление самой миссии
      const unlockIds = new Set(targetMission.rewards.unlocksMissionIds ?? []);
      const nextMissions: Mission[] = rawState.missions.map((m) => {
        const shouldUnlock = m.isUnlocked || unlockIds.has(m.id);
        if (m.id === missionId) {
          return {
            ...m,
            lastCompletedAt: currentNow,
            timesCompleted: m.timesCompleted + 1,
            isUnlocked: shouldUnlock,
          };
        }
        return {
          ...m,
          isUnlocked: shouldUnlock,
        };
      });

      // Если это Grease the Groove — автоматически переносим следующий таймер
      const nextGreaseTs =
        targetMission.type === 'grease_the_groove'
          ? currentNow + rawState.activePlan.greaseIntervalMinutes * 60 * 1000
          : rawState.nextGreaseTimestamp;

      const logEntry: WorkoutLogEntry = {
        id: createUid('log'),
        missionId: targetMission.id,
        missionTitle: targetMission.title,
        completedAt: currentNow,
        totalSets,
        totalRepsOrSec,
        earnedRespect,
        earnedCash,
      };

      const notifItem: PhoneNotification = {
        id: createUid('notif'),
        contactId: targetMission.giverContactId,
        title: `MISSION PASSED: ${targetMission.title}`,
        message: `Отличная работа! Зачислено +${earnedRespect} Respect и +$${earnedCash}.`,
        timestamp: currentNow,
        read: false,
        actionMissionId: targetMission.rewards.unlocksMissionIds?.[0],
        category: targetMission.rewards.unlocksMissionIds?.some((id) =>
          id.includes('boss')
        )
          ? 'boss_unlocked'
          : 'mission_passed',
      };

      // Определяем следующую рекомендованную миссию для модалки
      const nextStatePreview: GameState = {
        ...rawState,
        level: levelResult.level,
        rankTitle: getRankTitle(levelResult.level),
        respectXp: newRespectXp,
        nextLevelXp: levelResult.nextLevelXp,
        cash: rawState.cash + earnedCash,
        streakDays: nextStreak,
        heatStars: nextHeatStars,
        lastWorkoutDate: todayKey,
        stats: nextStats,
        muscleRecovery: nextRecovery,
        missions: nextMissions,
        activeMissionId: null,
        nextGreaseTimestamp: nextGreaseTs,
      };

      const nextRec = getNextTrainingRecommendation(nextStatePreview, currentNow);
      const suggestedMission = nextMissions.find(
        (m) => m.id === nextRec.recommendedMissionId
      );

      const recoveryNote = isMedkitOrMobility
        ? 'Здоровье полностью восстановлено (100% HP), а регенерация уставших мышц ускорена на 25%!'
        : `Спина и бицепс готовы на ${nextRec.pullupReadinessPercent}%${
            nextRec.msUntilPullupReady > 0
              ? ` (до 100%: ${formatDurationMs(nextRec.msUntilPullupReady)})`
              : ''
          }. ${nextRec.headline}`;

      if (rawState.soundEnabled) {
        if (levelResult.leveledUp) {
          playLevelUpSound();
        } else {
          playMissionPassedSound();
        }
      }

      setRawState((prev) => ({
        ...prev,
        ...nextStatePreview,
        notifications: [notifItem, ...prev.notifications].slice(0, 40),
        history: [logEntry, ...prev.history].slice(0, 100),
      }));

      setMissionPassedSummary({
        missionId: targetMission.id,
        missionTitle: targetMission.title,
        earnedRespect,
        earnedCash,
        healthBonus,
        leveledUp: levelResult.leveledUp,
        newLevel: levelResult.level,
        statBoosts: boosts,
        unlockedTitles: levelResult.unlockedTitles,
        recoveryNote,
        suggestedNextMissionId: suggestedMission?.id,
        suggestedNextMissionTitle: suggestedMission?.title,
      });
    },
    [rawState]
  );

  const quickLogGreaseSet = useCallback(
    (reps: number) => {
      const cleanReps = Math.max(1, Math.round(reps));
      const currentNow = Date.now();
      const greaseMission = rawState.missions.find(
        (m) => m.type === 'grease_the_groove'
      );
      const earnedRespect = 55 + cleanReps * 4;
      const earnedCash = 60 + cleanReps * 5;
      const newRespectXp = rawState.respectXp + earnedRespect;

      const levelResult = applyLevelProgress(
        rawState.level,
        newRespectXp,
        rawState.nextLevelXp,
        rawState.stats.maxHp
      );

      const todayKey = getDateKey(currentNow);
      const yesterdayKey = getYesterdayDateKey(currentNow);
      let nextStreak = rawState.streakDays;
      if (rawState.lastWorkoutDate !== todayKey) {
        nextStreak =
          rawState.lastWorkoutDate === yesterdayKey ? rawState.streakDays + 1 : 1;
      }

      const nextGreaseTs =
        currentNow + rawState.activePlan.greaseIntervalMinutes * 60 * 1000;
      notifiedGreaseTsRef.current = null;

      const targetMissionId = greaseMission?.id ?? 'm_grease_pullup';

      const logEntry: WorkoutLogEntry = {
        id: createUid('log'),
        missionId: targetMissionId,
        missionTitle: `Подход дня: ${cleanReps} повт.`,
        completedAt: currentNow,
        totalSets: 1,
        totalRepsOrSec: cleanReps,
        earnedRespect,
        earnedCash,
      };

      const notif: PhoneNotification = {
        id: createUid('notif'),
        contactId: 'coach_dre',
        title: `Подход засчитан (+${cleanReps} повт.)`,
        message: `Залетел на турник как профи! +${earnedRespect} Respect и +$${earnedCash}. Следующий пинг через ${rawState.activePlan.greaseIntervalMinutes} мин.`,
        timestamp: currentNow,
        read: false,
        actionMissionId: greaseMission?.id,
        category: 'grease_reminder',
      };

      if (rawState.soundEnabled) {
        if (levelResult.leveledUp) playLevelUpSound();
        else playRadarBlipSound();
      }

      setRawState((prev) => ({
        ...prev,
        level: levelResult.level,
        rankTitle: getRankTitle(levelResult.level),
        respectXp: newRespectXp,
        nextLevelXp: levelResult.nextLevelXp,
        cash: prev.cash + earnedCash,
        streakDays: nextStreak,
        lastWorkoutDate: todayKey,
        nextGreaseTimestamp: nextGreaseTs,
        stats: {
          ...prev.stats,
          maxHp: levelResult.maxHp,
          currentHp: levelResult.leveledUp
            ? levelResult.maxHp
            : Math.min(levelResult.maxHp, prev.stats.currentHp + 2),
          strength: clampStat(prev.stats.strength + 1),
          discipline: clampStat(prev.stats.discipline + 2),
        },
        missions: prev.missions.map((m) =>
          m.id === targetMissionId
            ? { ...m, lastCompletedAt: currentNow, timesCompleted: m.timesCompleted + 1 }
            : m
        ),
        notifications: [notif, ...prev.notifications].slice(0, 40),
        history: [logEntry, ...prev.history].slice(0, 100),
      }));

      setActiveToast(notif);
    },
    [rawState]
  );

  const quickLogFreeExercise = useCallback(
    (exerciseId: string, sets: number, repsOrSecPerSet: number) => {
      const ex = EXERCISES[exerciseId];
      if (!ex) return;

      const currentNow = Date.now();
      const safeSets = Math.max(1, Math.round(sets));
      const safeTarget = Math.max(1, Math.round(repsOrSecPerSet));
      const earnedRespect = ex.xpPerSet * safeSets;
      const earnedCash = ex.cashPerSet * safeSets;
      const healthGain = ex.healthBonus;

      const newRespectXp = rawState.respectXp + earnedRespect;
      const levelResult = applyLevelProgress(
        rawState.level,
        newRespectXp,
        rawState.nextLevelXp,
        rawState.stats.maxHp
      );

      const syntheticTasks: MissionExerciseTask[] = [
        {
          exerciseId: ex.id,
          sets: safeSets,
          targetPerSet: safeTarget,
          completedSets: Array.from({ length: safeSets }, () => safeTarget),
        },
      ];

      const isMobility = ex.category === 'mobility_hp';
      const nextRecovery = isMobility
        ? accelerateAllRecovery(rawState.muscleRecovery, currentNow, 0.2)
        : applyFatigueToRecovery(rawState.muscleRecovery, syntheticTasks, currentNow, 0.85);

      const todayKey = getDateKey(currentNow);
      const yesterdayKey = getYesterdayDateKey(currentNow);
      const nextStreak =
        rawState.lastWorkoutDate === todayKey
          ? rawState.streakDays
          : rawState.lastWorkoutDate === yesterdayKey
            ? rawState.streakDays + 1
            : 1;

      const logEntry: WorkoutLogEntry = {
        id: createUid('log'),
        missionId: `free_${ex.id}`,
        missionTitle: `Свободный сет: ${ex.name}`,
        completedAt: currentNow,
        totalSets: safeSets,
        totalRepsOrSec: safeSets * safeTarget,
        earnedRespect,
        earnedCash,
      };

      const notif: PhoneNotification = {
        id: createUid('notif'),
        contactId: isMobility ? 'doc_elena' : 'coach_dre',
        title: `Свободная тренировка: ${ex.name}`,
        message: `${safeSets}×${safeTarget} засчитаны! +${earnedRespect} Respect, +$${earnedCash}.`,
        timestamp: currentNow,
        read: false,
        category: 'mission_passed',
      };

      if (rawState.soundEnabled) {
        if (levelResult.leveledUp) playLevelUpSound();
        else playMissionPassedSound();
      }

      setRawState((prev) => ({
        ...prev,
        level: levelResult.level,
        rankTitle: getRankTitle(levelResult.level),
        respectXp: newRespectXp,
        nextLevelXp: levelResult.nextLevelXp,
        cash: prev.cash + earnedCash,
        streakDays: nextStreak,
        lastWorkoutDate: todayKey,
        muscleRecovery: nextRecovery,
        stats: {
          ...prev.stats,
          maxHp: levelResult.maxHp,
          currentHp: isMobility
            ? levelResult.maxHp
            : Math.min(levelResult.maxHp, prev.stats.currentHp + healthGain),
          healthLevel: clampStat(prev.stats.healthLevel + (isMobility ? 3 : 1)),
          strength: clampStat(
            prev.stats.strength +
              (ex.category === 'pullup_bar' || ex.category === 'gym_iron' ? 2 : 1)
          ),
          stamina: clampStat(
            prev.stats.stamina + (ex.category === 'cardio_street' ? 3 : 1)
          ),
          agility: clampStat(prev.stats.agility + (isMobility ? 2 : 1)),
          discipline: clampStat(prev.stats.discipline + 1),
        },
        notifications: [notif, ...prev.notifications].slice(0, 40),
        history: [logEntry, ...prev.history].slice(0, 100),
      }));

      setActiveToast(notif);
    },
    [rawState]
  );

  const applyCalibrationPlan = useCallback((input: PlanCalibrationInput) => {
    const baseMissions = createInitialMissions();
    const { plan, missions } = generateOptimalPlan(input, baseMissions);
    const currentNow = Date.now();
    const playerName = input.playerName?.trim() || 'Алекс';
    const hasGrease = missions.some((m) => m.type === 'grease_the_groove');

    const firstMain =
      missions.find((m) => m.isUnlocked && m.type === 'main_campaign') ??
      missions[0];

    const notif: PhoneNotification = {
      id: createUid('notif'),
      contactId: 'coach_dre',
      title: `План «${plan.name}» активирован`,
      message: `Калибровка пройдена (${plan.enabledExerciseIds.length} упр. · ${plan.weeklyTargetMissions} дн/нед). Стартовая миссия «${firstMain?.title ?? 'Старт'}» открыта!`,
      timestamp: currentNow,
      read: false,
      actionMissionId: firstMain?.id ?? plan.recommendedMissionIds[0],
      category: 'mission_passed',
    };

    setRawState((prev) => {
      if (prev.soundEnabled) playMissionPassedSound();

      // Сохраняем уже заработанный прогресс для совпадающих миссий
      const mergedMissions = missions.map((newM) => {
        const oldM = prev.missions.find((m) => m.id === newM.id);
        if (!oldM) return newM;
        return {
          ...newM,
          lastCompletedAt: oldM.lastCompletedAt,
          timesCompleted: oldM.timesCompleted,
          isUnlocked: oldM.isUnlocked || newM.isUnlocked,
        };
      });

      const activeStillExists = mergedMissions.some(
        (m) => m.id === prev.activeMissionId
      );

      return {
        ...prev,
        playerName,
        onboardingCompleted: true,
        activePlan: plan,
        missions: mergedMissions,
        activeMissionId: activeStillExists ? prev.activeMissionId : null,
        nextGreaseTimestamp: hasGrease
          ? currentNow + plan.greaseIntervalMinutes * 60 * 1000
          : null,
        notifications: [notif, ...prev.notifications].slice(0, 40),
      };
    });

    notifiedGreaseTsRef.current = null;
    setIsOnboardingOpen(false);
    setActiveToast(notif);
  }, []);

  const scheduleGreaseTimer = useCallback((delaySeconds: number) => {
    const safeDelay = Math.max(3, Math.round(delaySeconds));
    const targetTs = Date.now() + safeDelay * 1000;
    notifiedGreaseTsRef.current = null;

    setRawState((prev) => {
      if (prev.soundEnabled) playRadarBlipSound();
      return {
        ...prev,
        nextGreaseTimestamp: targetTs,
      };
    });
  }, []);

  const requestCoachStatusPing = useCallback(() => {
    const rec = getNextTrainingRecommendation(state, Date.now());
    const contactId =
      rec.status === 'recovery_needed'
        ? 'doc_elena'
        : rec.status === 'parallel_suggested'
          ? 'viktor_iron'
          : 'coach_dre';

    pushNotification({
      contactId,
      title: 'Сводка готовности от штаба',
      message: `${rec.headline}. ${rec.subtext}`,
      actionMissionId: rec.recommendedMissionId || undefined,
      category:
        rec.status === 'grease_ready'
          ? 'grease_reminder'
          : rec.status === 'pullup_ready'
            ? 'recovery_ready'
            : 'streak_alert',
    });
  }, [state, pushNotification]);

  const callContactForChallenge = useCallback(
    (contactId: string) => {
      const findMission = (preferredIds: string[], fallbackCategory?: string) =>
        preferredIds
          .map((id) => rawState.missions.find((m) => m.id === id))
          .find((m): m is Mission => Boolean(m)) ??
        rawState.missions.find((m) => m.category === fallbackCategory && m.isUnlocked) ??
        rawState.missions.find((m) => m.isUnlocked) ??
        rawState.missions[0];

      const dreMission = findMission(['m_freak_2', 'm_grease_pullup', 'm_pull_act1_1'], 'pullup_bar');
      const solisMission = findMission(['m_side_medkit'], 'mobility_hp');
      const viktorMission = findMission(['m_side_push', 'm_side_iron', 'm_side_core'], 'calisthenics');
      const zoeMission = findMission(['m_freak_1', 'm_side_cardio'], 'cardio_street');

      const contactChallenges: Record<
        string,
        { title: string; message: string; actionMissionId?: string }
      > = {
        coach_dre: {
          title: 'Тренировка на турнике',
          message: dreMission
            ? `Подходящий вариант: «${dreMission.title}».`
            : 'Сделай короткий подход на турнике, чтобы поддержать серию.',
          actionMissionId: dreMission?.id,
        },
        doc_elena: {
          title: 'Восстановление и мобильность',
          message: solisMission
            ? `Рекомендуем «${solisMission.title}» — это укрепит здоровье и ускорит восстановление мышц.`
            : 'Удели 5 минут плечам, спине и лёгкой растяжке.',
          actionMissionId: solisMission?.id,
        },
        viktor_iron: {
          title: 'Силовая тренировка',
          message: viktorMission
            ? `Пока основная группа отдыхает, можно сделать «${viktorMission.title}».`
            : 'Добавь пару силовых подходов на свежие группы мышц.',
          actionMissionId: viktorMission?.id,
        },
        zoe_pulse: {
          title: 'Кардио и выносливость',
          message: zoeMission
            ? `Хороший вариант сейчас: «${zoeMission.title}».`
            : 'Сделай короткую кардио-сессию для выносливости.',
          actionMissionId: zoeMission?.id,
        },
      };

      const challenge =
        contactChallenges[contactId] ?? contactChallenges.coach_dre;

      pushNotification({
        contactId,
        title: challenge.title,
        message: challenge.message,
        actionMissionId: challenge.actionMissionId,
        category: 'streak_alert',
      });
    },
    [rawState.missions, pushNotification]
  );

  const markAllNotificationsRead = useCallback(() => {
    setRawState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const toggleSound = useCallback(() => {
    setRawState((prev) => {
      const nextSound = !prev.soundEnabled;
      if (nextSound) playRadarBlipSound();
      return { ...prev, soundEnabled: nextSound };
    });
  }, []);

  const toggleBrowserPush = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (rawState.browserPushEnabled) {
      setRawState((prev) => ({ ...prev, browserPushEnabled: false }));
      return;
    }

    try {
      let permission = window.Notification.permission;
      if (permission === 'default') {
        permission = await window.Notification.requestPermission();
      }
      if (permission === 'granted') {
        setRawState((prev) => ({ ...prev, browserPushEnabled: true }));
        sendBrowserPush(
          'Уведомления включены',
          'Ты получишь сигнал, как только нужная группа мышц восстановится.',
          true
        );
      } else {
        setRawState((prev) => ({ ...prev, browserPushEnabled: false }));
      }
    } catch {
      setRawState((prev) => ({ ...prev, browserPushEnabled: false }));
    }
  }, [rawState.browserPushEnabled]);

  const purchaseReward = useCallback(
    (rewardId: string): boolean => {
      const item = rawState.rewards.find((r) => r.id === rewardId);
      if (!item || rawState.cash < item.costCash) {
        return false;
      }

      if (rawState.soundEnabled) playMissionPassedSound();

      setRawState((prev) => ({
        ...prev,
        cash: prev.cash - item.costCash,
        rewards: prev.rewards.map((r) =>
          r.id === rewardId
            ? { ...r, purchasedCount: r.purchasedCount + 1 }
            : r
        ),
      }));

      pushNotification({
        contactId: 'zoe_pulse',
        title: `Покупка: ${item.title}`,
        message: `Списано $${item.costCash}. Награда активирована — ты это честно заработал в тренировках!`,
        category: 'mission_passed',
      });

      return true;
    },
    [rawState.rewards, rawState.cash, rawState.soundEnabled, pushNotification]
  );

  const addCustomRealReward = useCallback(
    (title: string, description: string, costCash: number, icon = '🎁') => {
      const cleanTitle = title.trim();
      if (!cleanTitle) return;
      const newItem: RewardItem = {
        id: createUid('rew_custom'),
        title: cleanTitle,
        description: description.trim() || 'Личная награда из реальной жизни.',
        costCash: Math.max(50, Math.round(costCash)),
        type: 'real_life_treat',
        icon: icon.trim() || '🎁',
        purchasedCount: 0,
        unlocked: true,
      };

      setRawState((prev) => {
        if (prev.soundEnabled) playRadarBlipSound();
        return {
          ...prev,
          rewards: [newItem, ...prev.rewards],
        };
      });
    },
    []
  );

  const exportSaveJson = useCallback((): string => {
    return JSON.stringify(rawState, null, 2);
  }, [rawState]);

  const importSaveJson = useCallback((rawJson: string): boolean => {
    try {
      const parsed = JSON.parse(rawJson) as Partial<GameState>;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !Array.isArray(parsed.missions) ||
        !parsed.stats ||
        !parsed.muscleRecovery
      ) {
        return false;
      }
      const fallback = createInitialState();
      const restored: GameState = {
        ...fallback,
        ...parsed,
        stats: { ...fallback.stats, ...parsed.stats },
        activePlan: {
          ...fallback.activePlan,
          ...(parsed.activePlan ?? {}),
          availableEquipment: Array.isArray(parsed.activePlan?.availableEquipment)
            ? parsed.activePlan.availableEquipment
            : fallback.activePlan.availableEquipment,
          enabledExerciseIds: Array.isArray(parsed.activePlan?.enabledExerciseIds)
            ? parsed.activePlan.enabledExerciseIds
            : fallback.activePlan.enabledExerciseIds,
          weeklySchedule: Array.isArray(parsed.activePlan?.weeklySchedule)
            ? parsed.activePlan.weeklySchedule
            : fallback.activePlan.weeklySchedule,
        },
        muscleRecovery: { ...fallback.muscleRecovery, ...parsed.muscleRecovery },
      };
      setRawState(restored);
      setIsOnboardingOpen(!restored.onboardingCompleted);
      if (restored.soundEnabled) playLevelUpSound();
      return true;
    } catch {
      return false;
    }
  }, []);

  const resetProgress = useCallback(() => {
    const fresh = createInitialState();
    notifiedGreaseTsRef.current = null;
    notifiedMuscleTrainedAtRef.current = {};
    setRawState(fresh);
    setMissionPassedSummary(null);
    setActiveToast(null);
    setIsOnboardingOpen(true);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      now,
      recommendation,
      missionPassedSummary,
      activeToast,
      isPhoneOpen,
      isOnboardingOpen,
      unreadNotificationsCount,
      setIsPhoneOpen,
      setIsOnboardingOpen,
      dismissToast,
      closeMissionPassedModal,
      startMission,
      cancelActiveMission,
      completeMission,
      quickLogGreaseSet,
      quickLogFreeExercise,
      applyCalibrationPlan,
      scheduleGreaseTimer,
      requestCoachStatusPing,
      callContactForChallenge,
      markAllNotificationsRead,
      toggleSound,
      toggleBrowserPush,
      purchaseReward,
      addCustomRealReward,
      exportSaveJson,
      importSaveJson,
      resetProgress,
    }),
    [
      state,
      now,
      recommendation,
      missionPassedSummary,
      activeToast,
      isPhoneOpen,
      isOnboardingOpen,
      unreadNotificationsCount,
      dismissToast,
      closeMissionPassedModal,
      startMission,
      cancelActiveMission,
      completeMission,
      quickLogGreaseSet,
      quickLogFreeExercise,
      applyCalibrationPlan,
      scheduleGreaseTimer,
      requestCoachStatusPing,
      callContactForChallenge,
      markAllNotificationsRead,
      toggleSound,
      toggleBrowserPush,
      purchaseReward,
      addCustomRealReward,
      exportSaveJson,
      importSaveJson,
      resetProgress,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used inside <GameProvider>');
  }
  return ctx;
}
