import { CATEGORY_META, EXERCISES, EXERCISE_LIST } from '../data/exercises';
import {
  DifficultyTier,
  EquipmentId,
  Mission,
  MissionExerciseTask,
  MuscleGroup,
  PlanCalibrationInput,
  WeeklyPlanDay,
  WorkoutCategory,
  WorkoutPlanConfig,
} from '../types/game';

function resolveTier(maxPullups: number, maxPushups: number): DifficultyTier {
  if (maxPullups >= 20 || maxPushups >= 55) return 'legend';
  if (maxPullups >= 12 || maxPushups >= 35) return 'pro';
  if (maxPullups >= 5 || maxPushups >= 18) return 'street';
  return 'rookie';
}

/**
 * Автоматически рассчитывает оптимальную частоту тренировок в неделю
 * на основе разнообразия мышечных групп выбранных упражнений и уровня атлета:
 * чем больше разных групп мышц задействовано, тем чаще можно тренироваться
 * без перегрузки одной и той же зоны.
 */
export function calculateAutoWeeklyFrequency(
  enabledExerciseIds: string[],
  maxPullups: number,
  maxPushups: number
): { daysPerWeek: number; distinctGroupsCount: number; reason: string } {
  const tier = resolveTier(maxPullups, maxPushups);
  const activeExercises = enabledExerciseIds
    .map((id) => EXERCISES[id])
    .filter((ex): ex is NonNullable<typeof ex> => Boolean(ex));

  const nonMobility = activeExercises.filter((ex) => ex.category !== 'mobility_hp');
  const muscleGroups = new Set<MuscleGroup>();

  for (const ex of nonMobility) {
    for (const m of ex.primaryMuscles) {
      muscleGroups.add(m);
    }
  }

  const distinctGroupsCount = muscleGroups.size;

  // Если выбрана только мобильность/разминка — лёгкая ежедневная практика
  if (nonMobility.length === 0 && activeExercises.length > 0) {
    return {
      daysPerWeek: 5,
      distinctGroupsCount: 1,
      reason: 'Лёгкая мобильность и восстановление — можно заниматься почти каждый день',
    };
  }

  if (distinctGroupsCount <= 1) {
    const days = tier === 'pro' || tier === 'legend' ? 4 : 3;
    return {
      daysPerWeek: days,
      distinctGroupsCount: 1,
      reason: 'Фокус на одну группу мышц — делаем паузы между днями для полного восстановления',
    };
  }

  if (distinctGroupsCount === 2) {
    const days = tier === 'rookie' ? 4 : 5;
    return {
      daysPerWeek: days,
      distinctGroupsCount,
      reason: 'Чередуем разные группы мышц — пока одна восстанавливается, работает другая',
    };
  }

  if (distinctGroupsCount === 3) {
    const days = tier === 'pro' || tier === 'legend' ? 6 : 5;
    return {
      daysPerWeek: days,
      distinctGroupsCount,
      reason: 'Сплит по разным группам мышц — можно тренироваться чаще без перетрена',
    };
  }

  const days = tier === 'rookie' ? 5 : 6;
  return {
    daysPerWeek: days,
    distinctGroupsCount,
    reason: 'Разные группы мышц и кардио — каждый день работает полностью свежая зона',
  };
}

function getMissionPrimaryMuscle(mission: Mission): MuscleGroup | null {
  const counts = new Map<MuscleGroup, number>();
  for (const task of mission.tasks) {
    const ex = EXERCISES[task.exerciseId];
    if (!ex) continue;
    for (const m of ex.primaryMuscles) {
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
  }
  let top: MuscleGroup | null = null;
  let topScore = 0;
  for (const [group, count] of counts.entries()) {
    if (count > topScore) {
      top = group;
      topScore = count;
    }
  }
  return top;
}

const PLAN_TEMPLATES: Record<
  DifficultyTier,
  { name: string; description: string }
> = {
  rookie: {
    name: 'Базовый план',
    description:
      'Укрепление базовой силы, хвата и суставов с комфортным ритмом восстановления.',
  },
  street: {
    name: 'Сбалансированный план',
    description:
      'Чередование основной нагрузки с параллельными тренировками на свежие группы мышц.',
  },
  pro: {
    name: 'Продвинутый план',
    description:
      'Повышенный рабочий объём, взрывная техника и чёткий сплит по мышечным группам.',
  },
  legend: {
    name: 'Интенсивный план',
    description:
      'Сложные элементы, высокий силовой объём и контроль восстановления.',
  },
};

const TRAINING_DAY_INDICES: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

const DAY_SHORTS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function getContactForCategory(category: WorkoutCategory): string {
  switch (category) {
    case 'pullup_bar':
      return 'coach_dre';
    case 'mobility_hp':
      return 'doc_elena';
    case 'cardio_street':
      return 'zoe_pulse';
    case 'calisthenics':
    case 'gym_iron':
    default:
      return 'viktor_iron';
  }
}

function scaleTargetPerSet(
  exerciseId: string,
  missionId: string,
  baseTarget: number,
  maxPullups: number,
  maxPushups: number,
  tier: DifficultyTier
): number {
  // Рабочий подход всегда строится с запасом (55–70% от максимума),
  // чтобы атлет мог выполнить ВСЕ 3–4 подхода чисто без отказа.
  const strictWorkTarget =
    maxPullups <= 1
      ? 1
      : clamp(Math.floor(maxPullups * 0.65), 1, Math.max(1, maxPullups - 1));

  const chinWorkTarget =
    maxPullups <= 1
      ? 1
      : clamp(Math.floor(maxPullups * 0.7), 1, Math.max(1, maxPullups - 1));

  const wideWorkTarget =
    maxPullups <= 2
      ? 1
      : clamp(Math.floor(maxPullups * 0.5), 1, Math.max(1, maxPullups - 2));

  const chestToBarTarget =
    maxPullups <= 2
      ? 1
      : clamp(Math.floor(maxPullups * 0.45), 1, Math.max(1, maxPullups - 2));

  const negativeTarget =
    maxPullups === 0
      ? 3
      : clamp(Math.round(maxPullups * 0.7), 3, Math.max(3, maxPullups));

  const greasePullTarget =
    maxPullups <= 1
      ? 1
      : clamp(Math.floor(maxPullups * 0.55), 1, Math.max(1, maxPullups - 1));

  const pushupTarget =
    maxPushups <= 4
      ? Math.max(2, maxPushups)
      : clamp(Math.floor(maxPushups * 0.62), 3, Math.max(3, maxPushups - 2));

  const dipsTarget =
    maxPushups <= 6
      ? 3
      : clamp(Math.floor(maxPushups * 0.35), 3, Math.max(3, Math.floor(maxPushups * 0.5)));

  const diamondTarget =
    maxPushups <= 6
      ? 3
      : clamp(Math.floor(maxPushups * 0.38), 3, Math.max(3, Math.floor(maxPushups * 0.55)));

  switch (exerciseId) {
    case 'strict_pullups':
      if (missionId === 'm_grease_pullup') {
        return greasePullTarget;
      }
      if (missionId === 'm_freak_2') {
        return clamp(Math.floor(maxPullups * 0.45), 1, Math.max(1, maxPullups - 1));
      }
      return strictWorkTarget;
    case 'negative_pullups':
      return negativeTarget;
    case 'australian_pullups':
      return clamp(6 + Math.floor(maxPullups * 0.5), 6, 16);
    case 'chin_ups':
      return chinWorkTarget;
    case 'wide_pullups':
      return wideWorkTarget;
    case 'chest_to_bar':
      return chestToBarTarget;
    case 'muscle_up_prog':
      return tier === 'legend' ? 3 : tier === 'pro' ? 2 : 1;
    case 'dead_hang':
      return missionId === 'm_freak_1'
        ? clamp(20 + maxPullups * 2, 20, 50)
        : clamp(25 + maxPullups * 2, 25, 65);
    case 'scapular_pulls':
      return clamp(6 + Math.floor(maxPullups * 0.5), 6, 14);
    case 'hanging_knee_raises':
      return clamp(6 + Math.floor(maxPullups * 0.6), 6, 16);
    case 'pushups_classic':
      return missionId === 'm_freak_1'
        ? clamp(Math.floor(maxPushups * 0.5), 3, Math.max(3, maxPushups - 2))
        : pushupTarget;
    case 'parallel_dips':
      return dipsTarget;
    case 'diamond_pushups':
      return diamondTarget;
    case 'plank_hold':
      return clamp(30 + Math.floor(maxPushups * 0.9), 30, 90);
    case 'pistol_squat_prog':
      return clamp(12 + Math.floor(maxPushups * 0.35), 12, 30);
    case 'burpee_blaster':
      return clamp(6 + Math.floor(maxPushups * 0.15), 6, 15);
    default:
      return baseTarget;
  }
}

function buildTasksFromExercises(
  exerciseIds: string[],
  missionId: string,
  maxPullups: number,
  maxPushups: number,
  tier: DifficultyTier,
  setMultiplier = 1
): MissionExerciseTask[] {
  return exerciseIds
    .map((id) => EXERCISES[id])
    .filter((ex): ex is NonNullable<typeof ex> => Boolean(ex))
    .map((ex) => ({
      exerciseId: ex.id,
      sets: clamp(ex.defaultSets * setMultiplier, 2, 5),
      targetPerSet: scaleTargetPerSet(
        ex.id,
        missionId,
        ex.defaultTarget,
        maxPullups,
        maxPushups,
        tier
      ),
      completedSets: [],
    }));
}

function buildWeeklySchedule(
  missions: Mission[],
  focus: WorkoutCategory,
  daysPerWeek: number
): WeeklyPlanDay[] {
  const safeDays = clamp(daysPerWeek, 1, 7);
  const activeIndices = new Set(TRAINING_DAY_INDICES[safeDays] ?? TRAINING_DAY_INDICES[4]);

  const unlockedMain = missions.filter(
    (m) => m.isUnlocked && (m.type === 'main_campaign' || m.type === 'boss_fight')
  );
  const allMain = unlockedMain.length > 0
    ? unlockedMain
    : missions.filter((m) => m.type === 'main_campaign' || m.type === 'boss_fight');

  const sideMissions = missions.filter((m) => m.type === 'parallel_side');
  const nonMobilitySide = sideMissions.filter((m) => m.category !== 'mobility_hp');
  const mobilityMission =
    missions.find((m) => m.id === 'm_side_medkit') ??
    missions.find((m) => m.category === 'mobility_hp') ??
    null;
  const greaseMission = missions.find((m) => m.type === 'grease_the_groove') ?? null;
  const quickChallenges = missions.filter((m) => m.type === 'strangers_and_freaks');

  // Сортируем стартовые миссии так, чтобы фокусная категория шла первой
  const sortedMain = [...allMain].sort((a, b) => {
    const aScore = a.category === focus ? 0 : 1;
    const bScore = b.category === focus ? 0 : 1;
    return aScore - bScore;
  });

  const primaryPool: Mission[] = [];
  const maxPool = Math.max(sortedMain.length, nonMobilitySide.length);
  for (let i = 0; i < Math.max(1, maxPool); i += 1) {
    if (sortedMain[i % Math.max(1, sortedMain.length)]) {
      primaryPool.push(sortedMain[i % sortedMain.length]);
    }
    if (nonMobilitySide[i % Math.max(1, nonMobilitySide.length)]) {
      primaryPool.push(nonMobilitySide[i % nonMobilitySide.length]);
    }
  }
  const cleanPool = primaryPool.length > 0 ? primaryPool : missions;
  const uniquePool = Array.from(new Map(cleanPool.map((m) => [m.id, m])).values());

  let lastPrimaryMuscle: MuscleGroup | null = null;
  let lastMissionId: string | null = null;
  const usageCounts = new Map<string, number>();

  return DAY_SHORTS.map((dayShort, idx) => {
    const dayNumber = idx + 1;
    const isTraining = activeIndices.has(idx);

    if (!isTraining || uniquePool.length === 0) {
      lastPrimaryMuscle = null;
      return {
        dayNumber,
        dayShort,
        title: 'Активное восстановление',
        focusLabel: mobilityMission ? 'Мобильность и +HP' : 'Отдых и регенерация',
        primaryMissionId: mobilityMission?.id ?? null,
        parallelMissionIds: greaseMission ? [greaseMission.id] : [],
        isRecoveryDay: true,
      };
    }

    // Умный выбор миссии на день: приоритет тем миссиям, которые нагружают ДРУГУЮ группу мышц
    // по сравнению со вчерашним днём, и использовались реже на этой неделе.
    const ranked = [...uniquePool].sort((a, b) => {
      const aMuscle = getMissionPrimaryMuscle(a);
      const bMuscle = getMissionPrimaryMuscle(b);
      const aConflict = lastPrimaryMuscle && aMuscle === lastPrimaryMuscle ? 1 : 0;
      const bConflict = lastPrimaryMuscle && bMuscle === lastPrimaryMuscle ? 1 : 0;
      if (aConflict !== bConflict) return aConflict - bConflict;

      const aSameAsPrev = a.id === lastMissionId ? 1 : 0;
      const bSameAsPrev = b.id === lastMissionId ? 1 : 0;
      if (aSameAsPrev !== bSameAsPrev) return aSameAsPrev - bSameAsPrev;

      const aUsed = usageCounts.get(a.id) ?? 0;
      const bUsed = usageCounts.get(b.id) ?? 0;
      if (aUsed !== bUsed) return aUsed - bUsed;

      const aFocus = a.category === focus ? 0 : 1;
      const bFocus = b.category === focus ? 0 : 1;
      return aFocus - bFocus;
    });

    const primary = ranked[0];
    usageCounts.set(primary.id, (usageCounts.get(primary.id) ?? 0) + 1);
    lastPrimaryMuscle = getMissionPrimaryMuscle(primary);
    lastMissionId = primary.id;

    const parallelCandidates = [
      ...nonMobilitySide.filter((m) => m.id !== primary.id),
      ...quickChallenges.filter((m) => m.id !== primary.id),
      ...(mobilityMission && mobilityMission.id !== primary.id ? [mobilityMission] : []),
      ...(greaseMission && greaseMission.id !== primary.id ? [greaseMission] : []),
    ];

    const parallelIds = Array.from(new Set(parallelCandidates.map((m) => m.id))).slice(0, 2);
    const meta = CATEGORY_META[primary.category];

    return {
      dayNumber,
      dayShort,
      title: primary.title,
      focusLabel: `${meta.label} · ${primary.type === 'main_campaign' ? 'Главная ветка' : 'Параллель'}`,
      primaryMissionId: primary.id,
      parallelMissionIds: parallelIds,
      isRecoveryDay: false,
    };
  });
}

export function generateOptimalPlan(
  input: PlanCalibrationInput,
  baseMissions: Mission[]
): { plan: WorkoutPlanConfig; missions: Mission[] } {
  const maxPullups = Math.max(0, Math.floor(input.maxPullups));
  const maxPushups = Math.max(0, Math.floor(input.maxPushups));
  const greaseMinutes = clamp(input.greaseMinutes || 90, 30, 360);

  // 1. Определяем разрешённые упражнения
  const explicitEnabled = (input.enabledExerciseIds ?? []).filter((id) => Boolean(EXERCISES[id]));
  const equipmentSet = new Set<EquipmentId>(input.availableEquipment ?? []);

  let enabledExerciseIds: string[] =
    explicitEnabled.length > 0
      ? Array.from(new Set(explicitEnabled))
      : EXERCISE_LIST.filter((ex) => equipmentSet.has(ex.requiredEquipment)).map((ex) => ex.id);

  // Страховочный фолбэк, если ничего не выбрано
  if (enabledExerciseIds.length === 0) {
    enabledExerciseIds = EXERCISE_LIST.filter((ex) => ex.requiredEquipment === 'bodyweight').map(
      (ex) => ex.id
    );
  }

  // Автоматически вычисляем оптимальное число тренировок в неделю по разным группам мышц
  const autoFreq = calculateAutoWeeklyFrequency(enabledExerciseIds, maxPullups, maxPushups);
  const daysPerWeek = clamp(autoFreq.daysPerWeek, 3, 6);

  const enabledSet = new Set(enabledExerciseIds);

  const effectiveEquipment: EquipmentId[] =
    equipmentSet.size > 0
      ? Array.from(equipmentSet)
      : Array.from(
          new Set(
            enabledExerciseIds
              .map((id) => EXERCISES[id]?.requiredEquipment)
              .filter((eq): eq is EquipmentId => Boolean(eq))
          )
        );

  // Определяем реальный фокус с учётом выбранных упражнений
  const availableCategories = new Set(
    enabledExerciseIds
      .map((id) => EXERCISES[id]?.category)
      .filter((c): c is WorkoutCategory => Boolean(c))
  );
  const resolvedFocus: WorkoutCategory = availableCategories.has(input.focus)
    ? input.focus
    : availableCategories.has('pullup_bar')
      ? 'pullup_bar'
      : availableCategories.has('calisthenics')
        ? 'calisthenics'
        : availableCategories.has('gym_iron')
          ? 'gym_iron'
          : availableCategories.has('cardio_street')
            ? 'cardio_street'
            : 'mobility_hp';

  const tier = resolveTier(maxPullups, maxPushups);
  const template = PLAN_TEMPLATES[tier];

  // 2. Фильтруем задачи базовых миссий строго по enabledSet и масштабируем объём
  const filteredBaseMissions: Mission[] = [];

  for (const mission of baseMissions) {
    const mappedTasks: MissionExerciseTask[] = [];

    for (const task of mission.tasks) {
      let exerciseId = task.exerciseId;

      // Умная замена для фоновой миссии на турник при 0 подтягиваний или отсутствии строгих
      if (mission.id === 'm_grease_pullup' && exerciseId === 'strict_pullups') {
        if (maxPullups === 0 || !enabledSet.has('strict_pullups')) {
          if (enabledSet.has('negative_pullups')) {
            exerciseId = 'negative_pullups';
          } else if (enabledSet.has('australian_pullups')) {
            exerciseId = 'australian_pullups';
          } else if (enabledSet.has('dead_hang')) {
            exerciseId = 'dead_hang';
          } else if (enabledSet.has('scapular_pulls')) {
            exerciseId = 'scapular_pulls';
          }
        }
      }

      if (!enabledSet.has(exerciseId)) {
        continue;
      }

      const targetPerSet = scaleTargetPerSet(
        exerciseId,
        mission.id,
        task.targetPerSet,
        maxPullups,
        maxPushups,
        tier
      );

      mappedTasks.push({
        ...task,
        exerciseId,
        targetPerSet,
        completedSets: [],
      });
    }

    // Если в миссии не осталось ни одного доступного упражнения — пропускаем
    if (mappedTasks.length === 0) {
      continue;
    }

    // Не оставляем сюжетную миссию турника с одной лишь разминкой коврика
    if (
      mission.type === 'main_campaign' &&
      mission.category === 'pullup_bar' &&
      !mappedTasks.some((t) => EXERCISES[t.exerciseId]?.category === 'pullup_bar')
    ) {
      continue;
    }

    const isGrease = mission.id === 'm_grease_pullup';
    const shouldUnlockProMissions =
      (tier === 'pro' || tier === 'legend') && mission.id === 'm_pull_act2_1';

    filteredBaseMissions.push({
      ...mission,
      cooldownMinutes: isGrease ? greaseMinutes : mission.cooldownMinutes,
      isUnlocked: mission.isUnlocked || shouldUnlockProMissions,
      tasks: mappedTasks,
    });
  }

  // 3. Гарантируем, что открыта хотя бы 1-2 главная миссия, и при нехватке синтезируем под выбранные упражнения
  const missions: Mission[] = [...filteredBaseMissions];

  // Если сюжетные миссии есть, но все они закрыты (например, пользователь снял галочки со стартовых) — разблокируем первые 2
  const existingMain = missions.filter((m) => m.type === 'main_campaign');
  let unlockedMainCount = existingMain.filter((m) => m.isUnlocked).length;
  if (existingMain.length > 0 && unlockedMainCount < 2) {
    for (const m of existingMain) {
      if (!m.isUnlocked && unlockedMainCount < 2) {
        m.isUnlocked = true;
        unlockedMainCount += 1;
      }
    }
  }

  const prioritizedPool = [
    ...enabledExerciseIds.filter((id) => EXERCISES[id]?.category === resolvedFocus),
    ...enabledExerciseIds.filter(
      (id) => EXERCISES[id]?.category !== resolvedFocus && EXERCISES[id]?.category !== 'mobility_hp'
    ),
    ...enabledExerciseIds.filter((id) => EXERCISES[id]?.category === 'mobility_hp'),
  ];
  const uniquePrioritized = Array.from(new Set(prioritizedPool));

  const mainCountAfterUnlock = missions.filter(
    (m) => m.type === 'main_campaign' && m.isUnlocked
  ).length;

  if (mainCountAfterUnlock < 2) {
    const needed = 2 - mainCountAfterUnlock;
    for (let i = 0; i < needed; i += 1) {
      const startIdx = (i * 2) % uniquePrioritized.length;
      const pickedIds = Array.from(
        new Set([
          uniquePrioritized[startIdx],
          uniquePrioritized[(startIdx + 1) % uniquePrioritized.length],
          uniquePrioritized[(startIdx + 2) % uniquePrioritized.length],
        ])
      ).slice(0, 3);

      const primaryCat = EXERCISES[pickedIds[0]]?.category ?? resolvedFocus;
      const meta = CATEGORY_META[primaryCat];
      const customId = `m_custom_main_${i + 1}`;

      missions.unshift({
        id: customId,
        code: meta.shortCode,
        title:
          i === 0
            ? `${meta.label}: базовая тренировка`
            : `${meta.label}: силовой объём`,
        subtitle: `Акт ${i + 1} · Персональная программа под твой инвентарь`,
        giverContactId: getContactForCategory(primaryCat),
        briefingQuote:
          i === 0
            ? 'Маршрут собран ровно под те упражнения, которые у тебя под рукой. Закрывай подходы чисто и забирай Respect!'
            : 'Вторая волна персональной кампании: повышаем плотность работы и закрепляем результат на набережной.',
        type: 'main_campaign',
        category: primaryCat,
        act: i + 1,
        requiredRespect: 0,
        recommendedTier: tier,
        tasks: buildTasksFromExercises(
          pickedIds,
          customId,
          maxPullups,
          maxPushups,
          tier,
          i === 0 ? 1 : 1.1
        ),
        rewards: {
          respectXp: 210 + i * 70,
          cash: 250 + i * 90,
          healthBonus: 5,
          statBoosts: { strength: 5, stamina: 4, discipline: 4, healthLevel: 2 },
        },
        cooldownMinutes: 720,
        timesCompleted: 0,
        isUnlocked: true,
      });
    }
  }

  // Гарантируем минимум 2 параллельные миссии на основе выбранных упражнений
  const existingSide = missions.filter((m) => m.type === 'parallel_side');
  if (existingSide.length < 2) {
    const neededSide = 2 - existingSide.length;
    const reversedPool = [...uniquePrioritized].reverse();

    for (let i = 0; i < neededSide; i += 1) {
      const offset = i * 2;
      const pickedIds = Array.from(
        new Set([
          reversedPool[offset % reversedPool.length],
          reversedPool[(offset + 1) % reversedPool.length],
        ])
      ).slice(0, 3);

      const sideCat = EXERCISES[pickedIds[0]]?.category ?? resolvedFocus;
      const meta = CATEGORY_META[sideCat];
      const customSideId = `m_custom_side_${i + 1}`;

      missions.push({
        id: customSideId,
        code: meta.shortCode,
        title:
          i === 0
            ? `Параллельный блок: ${meta.label}`
            : `Дополнительная смена: Тонус и Контроль`,
        subtitle: 'Адаптированная параллельная миссия под твои упражнения',
        giverContactId: getContactForCategory(sideCat),
        briefingQuote:
          'Отличная связка для параллельной прокачки в свободный слот дня. Держи темп и береги технику!',
        type: 'parallel_side',
        category: sideCat,
        act: 1,
        requiredRespect: 0,
        recommendedTier: tier,
        tasks: buildTasksFromExercises(
          pickedIds,
          customSideId,
          maxPullups,
          maxPushups,
          tier
        ),
        rewards: {
          respectXp: 175 + i * 35,
          cash: 210 + i * 45,
          healthBonus: 4,
          statBoosts: { stamina: 4, agility: 3, discipline: 3 },
        },
        cooldownMinutes: 480,
        timesCompleted: 0,
        isUnlocked: true,
      });
    }
  }

  // Очищаем ссылки unlocksMissionIds от несуществующих миссий
  const validMissionIds = new Set(missions.map((m) => m.id));
  for (const m of missions) {
    if (m.rewards.unlocksMissionIds) {
      m.rewards.unlocksMissionIds = m.rewards.unlocksMissionIds.filter((id) =>
        validMissionIds.has(id)
      );
    }
  }

  // 4. Рекомендованные миссии и недельное расписание
  const recommendedMissionIds = Array.from(
    new Set(
      [
        ...missions
          .filter((m) => m.isUnlocked && m.type === 'main_campaign')
          .slice(0, 2)
          .map((m) => m.id),
        ...missions.filter((m) => m.type === 'grease_the_groove').map((m) => m.id),
        ...missions
          .filter((m) => m.type === 'parallel_side')
          .slice(0, 3)
          .map((m) => m.id),
      ].filter((id) => validMissionIds.has(id))
    )
  ).slice(0, 5);

  const weeklySchedule = buildWeeklySchedule(missions, resolvedFocus, daysPerWeek);

  const plan: WorkoutPlanConfig = {
    id: `plan_${tier}_${resolvedFocus}`,
    name: template.name,
    description: template.description,
    tier,
    primaryFocus: resolvedFocus,
    availableEquipment: effectiveEquipment,
    enabledExerciseIds,
    maxPullupsBaseline: maxPullups,
    maxPushupsBaseline: maxPushups,
    greaseIntervalMinutes: greaseMinutes,
    weeklyTargetMissions: daysPerWeek,
    recommendedMissionIds,
    weeklySchedule,
  };

  return { plan, missions };
}
