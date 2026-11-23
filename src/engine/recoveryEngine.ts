import { EXERCISES } from '../data/exercises';
import {
  GameState,
  Mission,
  MuscleGroup,
  MuscleRecoveryState,
  NextTrainingRecommendation,
} from '../types/game';

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  back_biceps: 'Спина, Бицепс и Хват',
  chest_triceps: 'Грудь и Трицепс',
  shoulders: 'Плечи и Ротаторы',
  core: 'Пресс и Кор',
  legs: 'Ноги и Ягодицы',
  cns_cardio: 'ЦНС и Выносливость',
};

export function createInitialMuscleRecovery(): Record<MuscleGroup, MuscleRecoveryState> {
  const groups: MuscleGroup[] = [
    'back_biceps',
    'chest_triceps',
    'shoulders',
    'core',
    'legs',
    'cns_cardio',
  ];

  return groups.reduce(
    (acc, group) => {
      acc[group] = {
        group,
        label: MUSCLE_LABELS[group],
        readinessPercent: 100,
        lastTrainedAt: null,
        readyAtTimestamp: null,
      };
      return acc;
    },
    {} as Record<MuscleGroup, MuscleRecoveryState>
  );
}

export function calculateMuscleReadiness(
  muscleState: MuscleRecoveryState,
  now: number
): number {
  if (!muscleState.lastTrainedAt || !muscleState.readyAtTimestamp) {
    return 100;
  }

  const totalDuration = muscleState.readyAtTimestamp - muscleState.lastTrainedAt;
  if (totalDuration <= 0 || now >= muscleState.readyAtTimestamp) {
    return 100;
  }

  const elapsed = Math.max(0, now - muscleState.lastTrainedAt);
  const progress = Math.min(1, Math.max(0, elapsed / totalDuration));
  return Math.round(progress * 100);
}

export function getMissionMuscleReadiness(
  mission: Mission,
  recovery: Record<MuscleGroup, MuscleRecoveryState>,
  now: number
): { percent: number; primaryMuscles: MuscleGroup[]; msRemaining: number } {
  const muscleSet = new Set<MuscleGroup>();

  for (const task of mission.tasks) {
    const exercise = EXERCISES[task.exerciseId];
    if (exercise) {
      exercise.primaryMuscles.forEach((m) => muscleSet.add(m));
    }
  }

  const primaryMuscles = Array.from(muscleSet);
  if (primaryMuscles.length === 0) {
    return { percent: 100, primaryMuscles: ['cns_cardio'], msRemaining: 0 };
  }

  // Для восстановительных миссий всегда доступность 100%
  if (mission.category === 'mobility_hp') {
    return { percent: 100, primaryMuscles, msRemaining: 0 };
  }

  let minPercent = 100;
  let maxMsRemaining = 0;

  for (const group of primaryMuscles) {
    const state = recovery[group];
    if (!state) continue;
    const pct = calculateMuscleReadiness(state, now);
    if (pct < minPercent) {
      minPercent = pct;
    }
    if (state.readyAtTimestamp && state.readyAtTimestamp > now) {
      const remaining = state.readyAtTimestamp - now;
      if (remaining > maxMsRemaining) {
        maxMsRemaining = remaining;
      }
    }
  }

  return {
    percent: minPercent,
    primaryMuscles,
    msRemaining: maxMsRemaining,
  };
}

export function formatDurationMs(ms: number): string {
  if (ms <= 0) {
    return 'ГОТОВО';
  }

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}ч ${String(minutes).padStart(2, '0')}м`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getNextTrainingRecommendation(
  state: GameState,
  now: number
): NextTrainingRecommendation {
  const backState = state.muscleRecovery.back_biceps;
  const pullupReadinessPercent = calculateMuscleReadiness(backState, now);
  const msUntilPullupReady =
    backState.readyAtTimestamp && backState.readyAtTimestamp > now
      ? backState.readyAtTimestamp - now
      : 0;

  const msUntilNextGrease =
    state.nextGreaseTimestamp && state.nextGreaseTimestamp > now
      ? state.nextGreaseTimestamp - now
      : 0;

  const greaseMission = state.missions.find((m) => m.type === 'grease_the_groove');
  const medkitMission =
    state.missions.find((m) => m.id === 'm_side_medkit') ??
    state.missions.find((m) => m.category === 'mobility_hp');

  const unlockedMain = state.missions.filter(
    (m) => m.isUnlocked && (m.type === 'main_campaign' || m.type === 'boss_fight')
  );
  const focusMain = unlockedMain.filter(
    (m) => m.category === state.activePlan.primaryFocus
  );
  const mainPool = focusMain.length > 0 ? focusMain : unlockedMain;
  const nextStoryMission =
    mainPool.find((m) => m.timesCompleted === 0) ??
    mainPool[0] ??
    state.missions[0];

  // 1. Если таймер Grease the Groove активен и соответствующая миссия доступна
  if (
    greaseMission &&
    state.nextGreaseTimestamp !== null &&
    state.nextGreaseTimestamp <= now
  ) {
    return {
      status: 'grease_ready',
      headline: 'Турник готов! Сделай 1 непредельный подход (Grease the Groove)',
      subtext:
        'ЦНС свежая. Запрыгни на перекладину, выполни 50–60% от максимума без отказа и забери +Respect.',
      recommendedMissionId: greaseMission.id,
      pullupReadinessPercent,
      msUntilPullupReady,
      msUntilNextGrease: 0,
    };
  }

  // 2. Если целевая главная миссия готова >= 85%
  if (nextStoryMission) {
    const mainReadiness = getMissionMuscleReadiness(
      nextStoryMission,
      state.muscleRecovery,
      now
    );
    if (mainReadiness.percent >= 85) {
      const isPullup = nextStoryMission.category === 'pullup_bar';
      return {
        status: 'pullup_ready',
        headline: isPullup
          ? `Спина и бицепс восстановились на ${mainReadiness.percent}%! Можно запускать сюжетную миссию на турнике`
          : `Мышцы готовы на ${mainReadiness.percent}%! Доступна главная миссия «${nextStoryMission.title}»`,
        subtext: `Рекомендуемая цель: «${nextStoryMission.title}». Мышцы и нервная система готовы к нагрузке.`,
        recommendedMissionId: nextStoryMission.id,
        pullupReadinessPercent,
        msUntilPullupReady,
        msUntilNextGrease,
      };
    }
  }

  // 3. Если здоровье низкое или ЦНС утомлена — рекомендуем Аптечку Д-ра Солис (если доступна)
  const cnsReady = calculateMuscleReadiness(state.muscleRecovery.cns_cardio, now);

  if (
    medkitMission &&
    (state.stats.currentHp < state.stats.maxHp * 0.65 || cnsReady < 55)
  ) {
    return {
      status: 'recovery_needed',
      headline: `Основная группа на регене (${formatDurationMs(msUntilPullupReady)} до 100%). Возьми Аптечку Д-ра Солис!`,
      subtext:
        'Мобильность и декомпрессия восстановят HP и ускорят регенерацию всех мышц на 25%.',
      recommendedMissionId: medkitMission.id,
      pullupReadinessPercent,
      msUntilPullupReady,
      msUntilNextGrease,
    };
  }

  // 4. Иначе предлагаем лучшую доступную параллельную миссию из state.missions
  const parallelCandidates = state.missions
    .filter(
      (m) =>
        m.isUnlocked &&
        m.id !== nextStoryMission?.id &&
        m.category !== 'mobility_hp' &&
        m.type !== 'grease_the_groove'
    )
    .map((mission) => ({
      mission,
      readiness: getMissionMuscleReadiness(mission, state.muscleRecovery, now).percent,
    }))
    .sort((a, b) => b.readiness - a.readiness);

  const bestParallel = parallelCandidates[0];

  if (bestParallel && bestParallel.readiness >= 70) {
    return {
      status: 'parallel_suggested',
      headline: `До восстановления основы ${formatDurationMs(msUntilPullupReady)} — пока запускай «${bestParallel.mission.title}»`,
      subtext: `Параллельная ветка готова на ${bestParallel.readiness}%. ${
        medkitMission
          ? 'Также доступна Аптечка Д-ра Солис для ускорения регена на 25%.'
          : 'Отличный вариант без перегруза уставших мышц.'
      }`,
      recommendedMissionId: bestParallel.mission.id,
      pullupReadinessPercent,
      msUntilPullupReady,
      msUntilNextGrease,
    };
  }

  // 5. Фолбэк на Аптечку или самую свежую миссию из реально существующих
  const fallbackMission =
    medkitMission ?? bestParallel?.mission ?? nextStoryMission ?? state.missions[0];

  return {
    status: 'recovery_needed',
    headline: medkitMission
      ? `Мышцы на восстановлении (${formatDurationMs(msUntilPullupReady)}) — активируй Аптечку!`
      : `Мышцы восстанавливаются (${formatDurationMs(msUntilPullupReady)}) — выбери лёгкий ритм`,
    subtext: medkitMission
      ? 'Основные мышечные группы восстанавливаются. Закрой миссию мобильности, чтобы ускорить реген на 25%.'
      : 'Сделай лёгкую разминку или дай телу немного времени на восстановление.',
    recommendedMissionId: fallbackMission?.id ?? '',
    pullupReadinessPercent,
    msUntilPullupReady,
    msUntilNextGrease,
  };
}
