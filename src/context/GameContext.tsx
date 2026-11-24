import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { getContactById } from '../data/contacts';
import { EXERCISES } from '../data/exercises';
import {
  DEFAULT_MISSION_GROUPS,
  INITIAL_LIFE_MISSIONS,
  MISSION_TEMPLATES,
} from '../data/lifeMissions';
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
  CloudSyncStatus,
  GameContextValue,
  GameState,
  LifeMission,
  LifeSubMission,
  Mission,
  MissionExerciseTask,
  MissionGroup,
  MissionMapPin,
  MissionPassedSummary,
  MuscleGroup,
  MuscleRecoveryState,
  PhoneNotification,
  PlanCalibrationInput,
  RewardItem,
  WorkoutLogEntry,
} from '../types/game';

const LEGACY_STORAGE_KEY = 'life_is_game_solis_v2';

const SEEDED_LIFE_MISSION_IDS = new Set([
  'life_init_shopping',
  'life_init_porch',
  'life_init_work',
  'life_init_street',
]);

function storageKeyFor(uid: string | null): string {
  return uid ? `${LEGACY_STORAGE_KEY}:user:${uid}` : `${LEGACY_STORAGE_KEY}:guest`;
}

function statCeiling(level: number): number {
  return Math.min(220, 100 + Math.max(0, level - 1) * 5);
}

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

function normalizeUserLocation(
  loc: unknown
): { lat: number; lng: number } | null {
  if (
    loc &&
    typeof loc === 'object' &&
    typeof (loc as { lat?: unknown }).lat === 'number' &&
    typeof (loc as { lng?: unknown }).lng === 'number'
  ) {
    return {
      lat: (loc as { lat: number }).lat,
      lng: (loc as { lng: number }).lng,
    };
  }
  return null;
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
    missionGroups: DEFAULT_MISSION_GROUPS,
    lifeMissions: INITIAL_LIFE_MISSIONS,
    mapMode: 'real',
    userLocation: null,
    nextGreaseTimestamp: null,
    recoveryNotifiedAt: {},
    greaseNotifiedAt: null,
    stateUpdatedAt: 0,
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

function readStoredUid(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem('life_is_game_auth_user_v1');
    if (!raw) return null;
    const user = JSON.parse(raw) as { uid?: unknown };
    return typeof user?.uid === 'string' ? user.uid : null;
  } catch {
    return null;
  }
}

function cleanLifeLayer(groups: MissionGroup[], missions: LifeMission[]): {
  missionGroups: MissionGroup[];
  lifeMissions: LifeMission[];
} {
  const lifeMissions = missions.filter((mission) => !SEEDED_LIFE_MISSION_IDS.has(mission.id));
  const used = new Set(lifeMissions.map((mission) => mission.groupId));
  const missionGroups = groups.filter((group) => group.isCustom || used.has(group.id));
  return { missionGroups, lifeMissions };
}

function hydrateSavedState(parsed: Partial<GameState> | null): GameState {
  const fallback = createInitialState();
  try {
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
      if (!prev) return fresh;
      const savedTasks =
        Array.isArray(prev.tasks) && prev.tasks.length > 0
          ? prev.tasks.map((task) => ({
              exerciseId: task.exerciseId,
              sets: task.sets,
              targetPerSet: task.targetPerSet,
              completedSets: [],
            }))
          : fresh.tasks;
      return {
        ...fresh,
        tasks: savedTasks,
        timesCompleted: prev.timesCompleted ?? 0,
        lastCompletedAt: prev.lastCompletedAt,
        isUnlocked: prev.isUnlocked || fresh.isUnlocked,
      };
    });

    const cleanLevel = typeof parsed.level === 'number' ? parsed.level : fallback.level;
    const lifeLayer = cleanLifeLayer(
      Array.isArray(parsed.missionGroups) ? parsed.missionGroups : fallback.missionGroups,
      Array.isArray(parsed.lifeMissions) ? parsed.lifeMissions : fallback.lifeMissions
    );

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
      missionGroups: lifeLayer.missionGroups,
      lifeMissions: lifeLayer.lifeMissions,
      recoveryNotifiedAt: parsed.recoveryNotifiedAt ?? {},
      greaseNotifiedAt: parsed.greaseNotifiedAt ?? null,
      stateUpdatedAt: typeof parsed.stateUpdatedAt === 'number' ? parsed.stateUpdatedAt : 0,
      mapMode:
        parsed.mapMode === 'solis' || parsed.mapMode === 'real'
          ? parsed.mapMode
          : fallback.mapMode,
      userLocation: normalizeUserLocation(parsed.userLocation),
      notifications: Array.isArray(parsed.notifications)
        ? parsed.notifications
        : fallback.notifications,
      rewards: Array.isArray(parsed.rewards) ? parsed.rewards : fallback.rewards,
      history: Array.isArray(parsed.history) ? parsed.history : fallback.history,
    };
  } catch {
    return fallback;
  }
}

function readRawState(key: string): GameState | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return hydrateSavedState(JSON.parse(raw) as Partial<GameState>);
  } catch {
    return null;
  }
}

function loadStateForUid(uid: string | null): GameState {
  if (typeof window === 'undefined') return createInitialState();
  const guestKey = storageKeyFor(null);
  if (!window.localStorage.getItem(guestKey)) {
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) window.localStorage.setItem(guestKey, legacy);
  }
  if (uid) {
    return readRawState(storageKeyFor(uid)) ?? createInitialState();
  }
  return readRawState(guestKey) ?? readRawState(LEGACY_STORAGE_KEY) ?? createInitialState();
}

function loadSavedState(): GameState {
  return loadStateForUid(readStoredUid());
}

function clampStat(val: number, min = 0, max = 220): number {
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

function checklistComplete(mission: LifeMission): boolean {
  return mission.subMissions.length > 0 && mission.subMissions.every((item) => item.completed);
}

function settleLifeMission(
  prev: GameState,
  missionId: string
): { state: GameState; toast: PhoneNotification } | null {
  const target = prev.lifeMissions.find((mission) => mission.id === missionId);
  if (!target || target.status === 'completed' || !checklistComplete(target)) return null;

  const currentNow = Date.now();
  const earnedRespect = target.rewardRespect;
  const earnedCash = target.rewardCash;
  const healthBonus = target.rewardHealth;
  const newRespectXp = prev.respectXp + earnedRespect;
  const levelResult = applyLevelProgress(
    prev.level,
    newRespectXp,
    prev.nextLevelXp,
    prev.stats.maxHp
  );
  const todayKey = getDateKey(currentNow);
  const yesterdayKey = getYesterdayDateKey(currentNow);
  const nextStreak =
    prev.lastWorkoutDate === todayKey
      ? prev.streakDays
      : prev.lastWorkoutDate === yesterdayKey
        ? prev.streakDays + 1
        : 1;
  const todayCount =
    prev.history.filter((entry) => getDateKey(entry.completedAt) === todayKey).length + 1;

  const toast: PhoneNotification = {
    id: createUid('notif'),
    contactId: 'doc_elena',
    title: 'Люсии это понравится',
    message: `«${target.title}» закрыта: отмечены все пункты.`,
    timestamp: currentNow,
    read: false,
    category: 'lucia_praise',
  };

  return {
    toast,
    state: {
      ...prev,
      level: levelResult.level,
      rankTitle: getRankTitle(levelResult.level),
      respectXp: newRespectXp,
      nextLevelXp: levelResult.nextLevelXp,
      cash: prev.cash + earnedCash,
      streakDays: nextStreak,
      heatStars: Math.min(6, Math.max(1, 1 + Math.floor(nextStreak / 2) + (todayCount >= 2 ? 1 : 0))),
      lastWorkoutDate: todayKey,
      stats: {
        ...prev.stats,
        healthLevel: clampStat(prev.stats.healthLevel + Math.ceil(healthBonus / 2)),
        maxHp: levelResult.maxHp,
        currentHp: levelResult.leveledUp
          ? levelResult.maxHp
          : Math.min(levelResult.maxHp, prev.stats.currentHp + healthBonus),
        discipline: clampStat(prev.stats.discipline + 2),
      },
      lifeMissions: prev.lifeMissions.map((mission) =>
        mission.id === missionId
          ? {
              ...mission,
              status: 'completed',
              completedAt: currentNow,
              timesCompleted: mission.timesCompleted + 1,
            }
          : mission
      ),
      notifications: [toast, ...prev.notifications].slice(0, 40),
      history: [
        {
          id: createUid('log'),
          missionId: target.id,
          missionTitle: target.title,
          completedAt: currentNow,
          totalSets: target.subMissions.length,
          totalRepsOrSec: target.subMissions.length,
          earnedRespect,
          earnedCash,
        },
        ...prev.history,
      ].slice(0, 100),
    },
  };
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [rawState, setRawState] = useState<GameState>(() => loadSavedState());
  const [now, setNow] = useState<number>(() => Date.now());
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(() => (user ? 'syncing' : 'local'));
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [missionPassedSummary, setMissionPassedSummary] =
    useState<MissionPassedSummary | null>(null);
  const [activeToast, setActiveToast] = useState<PhoneNotification | null>(null);
  const [isPhoneOpen, setIsPhoneOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(
    () => !loadSavedState().onboardingCompleted
  );

  const scopeUidRef = useRef<string | null>(user?.uid ?? readStoredUid());
  const revisionRef = useRef<number>(0);
  const rawStateRef = useRef<GameState>(rawState);
  rawStateRef.current = rawState;
  const isApplyingCloudRef = useRef<boolean>(false);
  const skipRevisionBumpRef = useRef<boolean>(true);
  const cloudHydratedUidRef = useRef<string | null>(null);
  if (revisionRef.current === 0 && rawState.stateUpdatedAt > 0) {
    revisionRef.current = rawState.stateUpdatedAt;
  }

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

  useEffect(() => {
    const nextUid = user?.uid ?? null;
    if (scopeUidRef.current === nextUid) return;
    scopeUidRef.current = nextUid;
    const next = loadStateForUid(nextUid);
    isApplyingCloudRef.current = true;
    skipRevisionBumpRef.current = true;
    revisionRef.current = next.stateUpdatedAt || 0;
    cloudHydratedUidRef.current = null;
    setRawState(next);
    setIsOnboardingOpen(!next.onboardingCompleted);
  }, [user?.uid, setIsOnboardingOpen]);

  // Автосохранение в localStorage аккаунта или гостя
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const key = storageKeyFor(scopeUidRef.current);
      if (isApplyingCloudRef.current || skipRevisionBumpRef.current) {
        isApplyingCloudRef.current = false;
        skipRevisionBumpRef.current = false;
        revisionRef.current = rawState.stateUpdatedAt || revisionRef.current;
        window.localStorage.setItem(key, JSON.stringify(rawState));
        return;
      }
      const ts = Date.now();
      revisionRef.current = ts;
      window.localStorage.setItem(
        key,
        JSON.stringify({ ...rawState, stateUpdatedAt: ts })
      );
    } catch {
      // Игнорируем ошибку переполнения storage
    }
  }, [rawState]);

  const applyRemoteState = useCallback(
    (data: Partial<GameState>, remoteTs: number) => {
      const next = hydrateSavedState({ ...data, stateUpdatedAt: remoteTs });
      isApplyingCloudRef.current = true;
      skipRevisionBumpRef.current = true;
      revisionRef.current = remoteTs;
      setRawState(next);
      if (next.onboardingCompleted) setIsOnboardingOpen(false);
    },
    [setIsOnboardingOpen]
  );

  // Загрузка облачного сейва. Более старая копия не затирает новую.
  useEffect(() => {
    if (!user || !token) {
      cloudHydratedUidRef.current = null;
      setSyncStatus('local');
      return;
    }

    let cancelled = false;

    const pullCloudState = async () => {
      setSyncStatus('syncing');
      try {
        const res = await fetch('/api/sync', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) {
          if (!cancelled) {
            cloudHydratedUidRef.current = user.uid;
            setSyncStatus('offline');
          }
          return;
        }
        const payload = (await res.json()) as {
          gameState?: Partial<GameState> | null;
          updatedAt?: number;
        };
        if (cancelled) return;

        const data = payload.gameState;
        const remoteTs = typeof payload.updatedAt === 'number' ? payload.updatedAt : 0;
        cloudHydratedUidRef.current = user.uid;

        if (data && typeof data === 'object' && Array.isArray(data.missions)) {
          if (remoteTs > revisionRef.current) {
            applyRemoteState(data, remoteTs);
          }
          setSyncStatus('synced');
          setLastSyncedAt(remoteTs || Date.now());
          return;
        }

        const local = loadStateForUid(user.uid);
        const ts = Math.max(local.stateUpdatedAt, revisionRef.current, Date.now());
        const saveRes = await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            gameState: { ...local, stateUpdatedAt: ts },
            updatedAt: ts,
          }),
        });
        if (!cancelled) {
          setSyncStatus(saveRes.ok ? 'synced' : 'offline');
          if (saveRes.ok) {
            revisionRef.current = ts;
            setLastSyncedAt(ts);
          }
        }
      } catch {
        if (!cancelled) {
          cloudHydratedUidRef.current = user.uid;
          setSyncStatus('offline');
        }
      }
    };

    void pullCloudState();
    const onFocus = () => {
      void pullCloudState();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [user, token, applyRemoteState]);

  // Локальные правки уходят в облако только с более новой меткой времени
  useEffect(() => {
    if (!user || !token || cloudHydratedUidRef.current !== user.uid) return;
    if (isApplyingCloudRef.current || skipRevisionBumpRef.current) return;

    setSyncStatus('syncing');
    const timer = window.setTimeout(() => {
      const ts = revisionRef.current;
      const gameState = { ...rawStateRef.current, stateUpdatedAt: ts };
      void fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gameState, updatedAt: ts }),
      })
        .then(async (res) => {
          if (res.ok) {
            setSyncStatus('synced');
            setLastSyncedAt(ts);
            return;
          }
          if (res.status === 409) {
            const body = (await res.json()) as {
              gameState?: Partial<GameState> | null;
              updatedAt?: number;
            };
            const remoteTs = typeof body.updatedAt === 'number' ? body.updatedAt : 0;
            if (body.gameState && remoteTs > revisionRef.current) {
              applyRemoteState(body.gameState, remoteTs);
            }
            setSyncStatus('synced');
            setLastSyncedAt(remoteTs || Date.now());
            return;
          }
          setSyncStatus('offline');
        })
        .catch(() => {
          setSyncStatus('offline');
        });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [rawState, user, token, applyRemoteState]);

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

  // Готовность мышц и таймер подхода проверяются раз в минуту и запоминаются в сейве
  useEffect(() => {
    const check = () => {
      const currentNow = Date.now();
      setNow(currentNow);
      let toast: PhoneNotification | null = null;

      setRawState((prev) => {
        const notes: PhoneNotification[] = [];
        const recoveryNotifiedAt = { ...(prev.recoveryNotifiedAt ?? {}) };
        let greaseNotifiedAt = prev.greaseNotifiedAt ?? null;
        let changed = false;

        const greaseMission = prev.missions.find((m) => m.type === 'grease_the_groove');
        if (
          greaseMission &&
          prev.nextGreaseTimestamp !== null &&
          currentNow >= prev.nextGreaseTimestamp &&
          greaseNotifiedAt !== prev.nextGreaseTimestamp
        ) {
          greaseNotifiedAt = prev.nextGreaseTimestamp;
          changed = true;
          notes.push({
            id: createUid('notif'),
            contactId: 'coach_dre',
            title: 'Можно сделать подход',
            message: 'Пауза прошла. Один спокойный подход на турнике.',
            timestamp: currentNow,
            read: false,
            actionMissionId: greaseMission.id,
            category: 'grease_reminder',
          });
        }

        (Object.keys(prev.muscleRecovery) as MuscleGroup[]).forEach((group) => {
          const muscleState = prev.muscleRecovery[group];
          if (muscleState.lastTrainedAt === null || muscleState.readyAtTimestamp === null) return;
          if (recoveryNotifiedAt[group] === muscleState.lastTrainedAt) return;
          const readiness = calculateMuscleReadiness(muscleState, currentNow);
          if (readiness < 85) return;
          recoveryNotifiedAt[group] = muscleState.lastTrainedAt;
          changed = true;
          const matchingMission =
            prev.missions.find(
              (m) =>
                m.isUnlocked &&
                m.type !== 'grease_the_groove' &&
                m.tasks.some((t) => EXERCISES[t.exerciseId]?.primaryMuscles.includes(group))
            ) ?? prev.missions.find((m) => m.isUnlocked && m.type === 'main_campaign');
          notes.push({
            id: createUid('notif'),
            contactId: group === 'back_biceps' ? 'coach_dre' : 'doc_elena',
            title: `${muscleState.label} готовы`,
            message: `«${muscleState.label}» восстановились на ${readiness}%.`,
            timestamp: currentNow,
            read: false,
            actionMissionId: matchingMission?.id,
            category: 'recovery_ready',
          });
        });

        if (!changed) return prev;
        toast = notes[0] ?? null;
        if (prev.soundEnabled && notes[0]) playSmsSound();
        if (notes[0]) {
          const contact = getContactById(notes[0].contactId);
          sendBrowserPush(
            `${contact.name}: ${notes[0].title}`,
            notes[0].message,
            prev.browserPushEnabled
          );
        }
        return {
          ...prev,
          recoveryNotifiedAt,
          greaseNotifiedAt,
          notifications: [...notes, ...prev.notifications].slice(0, 40),
        };
      });

      if (toast) setActiveToast(toast);
    };

    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, []);

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

      // Умная прогрессия нагрузок:
      // Если пользователь чисто выполнил ВСЕ подходы не ниже целевого плана,
      // автоматически повышаем рабочий ориентир для следующего раза
      // (+1 повторение или +5 сек для статики, не выше разумного потолка)
      const allSetsHitTarget =
        !isMedkitOrMobility &&
        completedTasks.length > 0 &&
        completedTasks.every((task) => {
          const doneSets = task.completedSets;
          if (doneSets.length < task.sets) return false;
          return doneSets.every((val) => val >= task.targetPerSet);
        });

      const upgradedLabels: string[] = [];
      const progressedTasksByExercise = new Map<string, number>();

      if (allSetsHitTarget) {
        for (const task of completedTasks) {
          const ex = EXERCISES[task.exerciseId];
          if (!ex) continue;
          const step = ex.unit === 'seconds' ? 5 : ex.unit === 'meters' ? 50 : 1;
          const cap = ex.unit === 'seconds' ? 120 : ex.unit === 'meters' ? 5000 : 40;
          const nextTarget = Math.min(cap, task.targetPerSet + step);
          if (nextTarget > task.targetPerSet) {
            progressedTasksByExercise.set(task.exerciseId, nextTarget);
            const unitShort = ex.unit === 'seconds' ? 'сек' : ex.unit === 'meters' ? 'м' : 'повт.';
            upgradedLabels.push(`${ex.name}: ${task.targetPerSet} → ${nextTarget} ${unitShort}`);
          }
        }
      }

      // Разблокировка следующих миссий, обновление самой миссии и прогрессия задач
      const unlockIds = new Set(targetMission.rewards.unlocksMissionIds ?? []);
      const nextMissions: Mission[] = rawState.missions.map((m) => {
        const shouldUnlock = m.isUnlocked || unlockIds.has(m.id);
        if (m.id === missionId) {
          const updatedTasks =
            progressedTasksByExercise.size > 0
              ? m.tasks.map((t) => {
                  const bumped = progressedTasksByExercise.get(t.exerciseId);
                  return bumped ? { ...t, targetPerSet: bumped } : t;
                })
              : m.tasks;

          return {
            ...m,
            tasks: updatedTasks,
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

      const progressionNote =
        upgradedLabels.length > 0
          ? `Прогрессия нагрузки: в следующий раз план повышен (${upgradedLabels.slice(0, 2).join(', ')}).`
          : undefined;

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
        title: `Тренировка выполнена: ${targetMission.title}`,
        message: progressionNote
          ? `+${earnedRespect} XP. ${progressionNote}`
          : `Отличная работа! Зачислено +${earnedRespect} XP.`,
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
        ? 'Здоровье восстановлено, регенерация мышц ускорена.'
        : nextRec.headline;

      if (rawState.soundEnabled) {
        if (levelResult.leveledUp) {
          playLevelUpSound();
        } else {
          playMissionPassedSound();
        }
      }

      sendBrowserPush(notifItem.title, notifItem.message, rawState.browserPushEnabled);

      setRawState((prev) => ({
        ...prev,
        ...nextStatePreview,
        greaseNotifiedAt:
          targetMission.type === 'grease_the_groove' ? null : prev.greaseNotifiedAt,
        notifications: [notifItem, ...prev.notifications].slice(0, 40),
        history: [logEntry, ...prev.history].slice(0, 100),
      }));

      setActiveToast(notifItem);

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
        progressionNote,
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
      // следующий подход сможет прислать новое напоминание

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

    setIsOnboardingOpen(false);
    setActiveToast(notif);
  }, []);

  const scheduleGreaseTimer = useCallback((delaySeconds: number) => {
    const safeDelay = Math.max(3, Math.round(delaySeconds));
    const targetTs = Date.now() + safeDelay * 1000;

    setRawState((prev) => {
      if (prev.soundEnabled) playRadarBlipSound();
      return {
        ...prev,
        nextGreaseTimestamp: targetTs,
        greaseNotifiedAt: null,
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
        missionGroups:
          Array.isArray(parsed.missionGroups) && parsed.missionGroups.length > 0
            ? parsed.missionGroups
            : fallback.missionGroups,
        lifeMissions: Array.isArray(parsed.lifeMissions)
          ? parsed.lifeMissions
          : fallback.lifeMissions,
        mapMode:
          parsed.mapMode === 'solis' || parsed.mapMode === 'real'
            ? parsed.mapMode
            : fallback.mapMode,
        userLocation: normalizeUserLocation(parsed.userLocation),
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
    skipRevisionBumpRef.current = true;
    revisionRef.current = 0;
    setRawState(fresh);
    setMissionPassedSummary(null);
    setActiveToast(null);
    setIsOnboardingOpen(true);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(storageKeyFor(scopeUidRef.current));
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  // ==========================================
  // Life is Game 2.0: Universal Mission Actions
  // ==========================================

  const createMissionGroup = useCallback(
    (input: {
      name: string;
      description: string;
      icon: string;
      color: string;
      mapMarkerCode: string;
    }): MissionGroup => {
      const newGroup: MissionGroup = {
        id: createUid('grp'),
        name: input.name.trim() || 'Новая ветка',
        description: input.description.trim() || 'Пользовательская категория миссий',
        icon: input.icon.trim() || 'Flag',
        color: input.color.trim() || '#5CE1E6',
        mapMarkerCode: (input.mapMarkerCode.trim() || 'M').slice(0, 2).toUpperCase(),
        isCustom: true,
        isSystem: false,
      };

      setRawState((prev) => {
        if (prev.soundEnabled) playRadarBlipSound();
        return {
          ...prev,
          missionGroups: [...prev.missionGroups, newGroup],
        };
      });

      return newGroup;
    },
    []
  );

  const deleteMissionGroup = useCallback((groupId: string) => {
    setRawState((prev) => {
      const target = prev.missionGroups.find((g) => g.id === groupId);
      if (!target || target.isSystem) return prev;
      if (prev.soundEnabled) playRadarBlipSound();
      return {
        ...prev,
        missionGroups: prev.missionGroups.filter((g) => g.id !== groupId),
        lifeMissions: prev.lifeMissions.filter((m) => m.groupId !== groupId),
      };
    });
  }, []);

  const createLifeMission = useCallback(
    (
      input: Omit<LifeMission, 'id' | 'status' | 'createdAt' | 'timesCompleted'>
    ): LifeMission => {
      const nowTs = Date.now();
      const normalizedSubMissions: LifeSubMission[] = (input.subMissions ?? []).map(
        (sub, idx) => ({
          ...sub,
          id: sub.id || createUid(`sub_${idx}`),
          completed: Boolean(sub.completed),
        })
      );

      const newMission: LifeMission = {
        ...input,
        id: createUid('life'),
        subMissions: normalizedSubMissions,
        status: 'active',
        createdAt: nowTs,
        timesCompleted: 0,
      };

      setRawState((prev) => {
        if (prev.soundEnabled) playRadarBlipSound();
        const groupId = newMission.groupId || 'tasks';
        const hasGroup = prev.missionGroups.some((group) => group.id === groupId);
        const missionGroups = hasGroup
          ? prev.missionGroups
          : [
              ...prev.missionGroups,
              {
                id: groupId,
                name: 'Дела',
                description: 'Свои списки',
                icon: 'Sparkles',
                color: '#E5A3BD',
                mapMarkerCode: 'M',
                isCustom: true,
              },
            ];
        return {
          ...prev,
          missionGroups,
          lifeMissions: [{ ...newMission, groupId }, ...prev.lifeMissions],
        };
      });

      return newMission;
    },
    []
  );

  const addLifeMissionFromTemplate = useCallback(
    (
      templateId: string,
      overrides?: Partial<LifeMission>
    ): LifeMission | null => {
      const tpl = MISSION_TEMPLATES.find((t) => t.id === templateId);
      if (!tpl) return null;

      const nowTs = Date.now();
      const defaultSubs: LifeSubMission[] = tpl.defaultSubMissions.map((s, idx) => ({
        id: createUid(`sub_${idx}`),
        title: s.title,
        completed: false,
        quantity: s.quantity,
        categoryTag: s.categoryTag,
        note: s.note,
      }));

      const newMission: LifeMission = {
        id: createUid('life'),
        groupId: tpl.groupId,
        title: tpl.title,
        subtitle: tpl.subtitle,
        kind: tpl.kind,
        isBigMission: tpl.isBigMission,
        isFromTemplateId: tpl.id,
        jokeQuote: tpl.jokeQuote,
        subMissions: defaultSubs,
        mapPin: tpl.defaultMapPin ? { ...tpl.defaultMapPin } : undefined,
        rewardRespect: tpl.rewardRespect,
        rewardCash: tpl.rewardCash,
        rewardHealth: tpl.rewardHealth,
        repeatable: tpl.repeatable,
        ...overrides,
        status: 'active',
        createdAt: nowTs,
        timesCompleted: 0,
      };

      setRawState((prev) => {
        if (prev.soundEnabled) playRadarBlipSound();
        return {
          ...prev,
          lifeMissions: [newMission, ...prev.lifeMissions],
        };
      });

      return newMission;
    },
    []
  );

  const updateLifeMission = useCallback(
    (missionId: string, patch: Partial<LifeMission>) => {
      setRawState((prev) => ({
        ...prev,
        lifeMissions: prev.lifeMissions.map((m) =>
          m.id === missionId ? { ...m, ...patch, id: m.id } : m
        ),
      }));
    },
    []
  );

  const deleteLifeMission = useCallback((missionId: string) => {
    setRawState((prev) => {
      if (prev.soundEnabled) playRadarBlipSound();
      return {
        ...prev,
        lifeMissions: prev.lifeMissions.filter((m) => m.id !== missionId),
      };
    });
  }, []);

  const toggleLifeSubMission = useCallback(
    (missionId: string, subMissionId: string) => {
      let toast: PhoneNotification | null = null;
      setRawState((prev) => {
        const toggled: GameState = {
          ...prev,
          lifeMissions: prev.lifeMissions.map((mission) => {
            if (mission.id !== missionId || mission.status === 'completed') return mission;
            return {
              ...mission,
              subMissions: mission.subMissions.map((sub) =>
                sub.id === subMissionId ? { ...sub, completed: !sub.completed } : sub
              ),
            };
          }),
        };
        const settled = settleLifeMission(toggled, missionId);
        if (!settled) return toggled;
        toast = settled.toast;
        if (prev.soundEnabled) playMissionPassedSound();
        sendBrowserPush(settled.toast.title, settled.toast.message, prev.browserPushEnabled);
        return settled.state;
      });
      if (toast) setActiveToast(toast);
    },
    []
  );

  const addLifeSubMission = useCallback(
    (
      missionId: string,
      title: string,
      quantity?: string,
      categoryTag?: string
    ) => {
      const cleanTitle = title.trim();
      if (!cleanTitle) return;

      const newSub: LifeSubMission = {
        id: createUid('sub'),
        title: cleanTitle,
        completed: false,
        quantity: quantity?.trim() || undefined,
        categoryTag: categoryTag?.trim() || undefined,
      };

      setRawState((prev) => {
        if (prev.soundEnabled) playRadarBlipSound();
        return {
          ...prev,
          lifeMissions: prev.lifeMissions.map((m) =>
            m.id === missionId
              ? { ...m, subMissions: [...m.subMissions, newSub] }
              : m
          ),
        };
      });
    },
    []
  );

  const removeLifeSubMission = useCallback(
    (missionId: string, subMissionId: string) => {
      setRawState((prev) => ({
        ...prev,
        lifeMissions: prev.lifeMissions.map((m) =>
          m.id === missionId
            ? {
                ...m,
                subMissions: m.subMissions.filter((s) => s.id !== subMissionId),
              }
            : m
        ),
      }));
    },
    []
  );

  const completeLifeMission = useCallback((missionId: string) => {
      let toast: PhoneNotification | null = null;
      setRawState((prev) => {
        const target = prev.lifeMissions.find((mission) => mission.id === missionId);
        if (!target || target.status === 'completed' || !checklistComplete(target)) return prev;
        const settled = settleLifeMission(prev, missionId);
        if (!settled) return prev;
        toast = settled.toast;
        if (prev.soundEnabled) playMissionPassedSound();
        sendBrowserPush(settled.toast.title, settled.toast.message, prev.browserPushEnabled);
        return settled.state;
      });
      if (toast) setActiveToast(toast);
    }, []);

  const reopenLifeMission = useCallback((missionId: string) => {
    setRawState((prev) => {
      if (prev.soundEnabled) playRadarBlipSound();
      return {
        ...prev,
        lifeMissions: prev.lifeMissions.map((m) =>
          m.id === missionId
            ? {
                ...m,
                status: 'active',
                completedAt: undefined,
                subMissions: m.subMissions.map((sub) => ({
                  ...sub,
                  completed: false,
                })),
              }
            : m
        ),
      };
    });
  }, []);

  const setLifeMissionMapPin = useCallback(
    (missionId: string, pin: MissionMapPin | undefined) => {
      setRawState((prev) => ({
        ...prev,
        lifeMissions: prev.lifeMissions.map((m) =>
          m.id === missionId ? { ...m, mapPin: pin } : m
        ),
      }));
    },
    []
  );

  const setMapMode = useCallback((mode: 'real' | 'solis') => {
    setRawState((prev) => ({
      ...prev,
      mapMode: mode,
    }));
  }, []);

  const setUserLocation = useCallback(
    (coords: { lat: number; lng: number } | null) => {
      setRawState((prev) => ({
        ...prev,
        userLocation: coords,
      }));
    },
    []
  );

  const updateFitnessMissionTasks = useCallback(
    (missionId: string, tasks: MissionExerciseTask[]) => {
      setRawState((prev) => ({
        ...prev,
        missions: prev.missions.map((m) =>
          m.id === missionId ? { ...m, tasks } : m
        ),
      }));
    },
    []
  );

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      now,
      syncStatus,
      lastSyncedAt,
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
      createMissionGroup,
      deleteMissionGroup,
      createLifeMission,
      addLifeMissionFromTemplate,
      updateLifeMission,
      deleteLifeMission,
      toggleLifeSubMission,
      addLifeSubMission,
      removeLifeSubMission,
      completeLifeMission,
      reopenLifeMission,
      setLifeMissionMapPin,
      setMapMode,
      setUserLocation,
      updateFitnessMissionTasks,
    }),
    [
      state,
      now,
      syncStatus,
      lastSyncedAt,
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
      createMissionGroup,
      deleteMissionGroup,
      createLifeMission,
      addLifeMissionFromTemplate,
      updateLifeMission,
      deleteLifeMission,
      toggleLifeSubMission,
      addLifeSubMission,
      removeLifeSubMission,
      completeLifeMission,
      reopenLifeMission,
      setLifeMissionMapPin,
      setMapMode,
      setUserLocation,
      updateFitnessMissionTasks,
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
