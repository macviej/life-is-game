export type EquipmentId =
  | 'pullup_bar'   // Турник / перекладина
  | 'dip_bars'     // Брусья
  | 'bodyweight'   // Свой вес (пол, дом, двор)
  | 'dumbbells'    // Гантели и гири
  | 'gym'          // Тренажёрный зал / штанга
  | 'cardio_gear'  // Бег, улица, скакалка, бокс
  | 'mobility_mat';// Растяжка, здоровая спина, мобильность

export type WorkoutCategory =
  | 'pullup_bar'   // Турник и перекладина
  | 'calisthenics' // Воркаут: брусья, отжимания, пресс, элементы
  | 'gym_iron'     // Свободные веса и тренажёрный зал
  | 'cardio_street'// Кардио, бег, скакалка, бой с тенью, HIIT
  | 'mobility_hp'; // Разминка, растяжка, декомпрессия (+Здоровье)

export type MuscleGroup =
  | 'back_biceps'  // Спина, широчайшие, бицепс и хват
  | 'chest_triceps'// Грудь и трицепс
  | 'shoulders'    // Плечи и ротаторы
  | 'core'         // Пресс и стабилизаторы кора
  | 'legs'         // Ноги и ягодицы
  | 'cns_cardio';  // ЦНС и дыхательная система

export type MissionType =
  | 'main_campaign'       // Основная сюжетная ветка плана
  | 'parallel_side'       // Параллельные тренировочные ветки
  | 'grease_the_groove'   // Фоновые подходы в течение дня
  | 'strangers_and_freaks'// Быстрый уличный мини-вызов
  | 'boss_fight';         // Контрольный зачёт / Босс этапа

export type DifficultyTier = 'rookie' | 'street' | 'pro' | 'legend';

export interface Exercise {
  id: string;
  name: string;
  category: WorkoutCategory;
  requiredEquipment: EquipmentId;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  unit: 'reps' | 'seconds' | 'meters';
  defaultTarget: number;
  defaultSets: number;
  restSeconds: number;
  recoveryHours: number;
  description: string;
  techniqueTip: string;
  xpPerSet: number;
  cashPerSet: number;
  healthBonus: number;
}

export interface MissionExerciseTask {
  exerciseId: string;
  sets: number;
  targetPerSet: number;
  completedSets: number[];
}

export interface Mission {
  id: string;
  code: string; // Маркер ветки: 'P' (Турник), 'S' (Воркаут/Сила), 'C' (Кардио), '?' (Вызов), '♥' (Здоровье), '★' (Босс), 'G' (Подходы дня)
  title: string;
  subtitle: string;
  giverContactId: string;
  briefingQuote: string;
  type: MissionType;
  category: WorkoutCategory;
  act: number;
  requiredRespect: number;
  recommendedTier: DifficultyTier;
  tasks: MissionExerciseTask[];
  rewards: {
    respectXp: number;
    cash: number;
    healthBonus: number;
    statBoosts: Partial<Record<keyof CharacterStatsBars, number>>;
    unlocksMissionIds?: string[];
  };
  cooldownMinutes: number;
  lastCompletedAt?: number;
  timesCompleted: number;
  isUnlocked: boolean;
}

export interface CharacterStatsBars {
  healthLevel: number; // Уровень здоровья и жизненного тонуса (0-100)
  maxHp: number;       // Максимальный запас ХП (100-200)
  currentHp: number;   // Текущее ХП
  strength: number;    // Сила (0-100)
  stamina: number;     // Выносливость (0-100)
  agility: number;     // Контроль тела и мобильность (0-100)
  discipline: number;  // Дисциплина (0-100)
}

export interface MuscleRecoveryState {
  group: MuscleGroup;
  label: string;
  readinessPercent: number;
  lastTrainedAt: number | null;
  readyAtTimestamp: number | null;
}

export interface WeeklyPlanDay {
  dayNumber: number; // 1..7
  dayShort: string;  // 'Пн', 'Вт', ...
  title: string;
  focusLabel: string;
  primaryMissionId: string | null;
  parallelMissionIds: string[];
  isRecoveryDay: boolean;
}

export interface WorkoutPlanConfig {
  id: string;
  name: string;
  description: string;
  tier: DifficultyTier;
  primaryFocus: WorkoutCategory;
  availableEquipment: EquipmentId[];
  enabledExerciseIds: string[];
  maxPullupsBaseline: number;
  maxPushupsBaseline: number;
  greaseIntervalMinutes: number;
  weeklyTargetMissions: number;
  recommendedMissionIds: string[];
  weeklySchedule: WeeklyPlanDay[];
}

export interface PhoneContact {
  id: string;
  name: string;
  role: string;
  avatarEmoji: string;
  accentColor: string;
  bio: string;
}

export interface PhoneNotification {
  id: string;
  contactId: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionMissionId?: string;
  category: 'recovery_ready' | 'grease_reminder' | 'mission_passed' | 'streak_alert' | 'boss_unlocked';
}

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  costCash: number;
  type: 'virtual_upgrade' | 'real_life_treat';
  icon: string;
  purchasedCount: number;
  unlocked: boolean;
}

export interface WorkoutLogEntry {
  id: string;
  missionId: string;
  missionTitle: string;
  completedAt: number;
  totalSets: number;
  totalRepsOrSec: number;
  earnedRespect: number;
  earnedCash: number;
}

export interface GameState {
  playerName: string;
  rankTitle: string;
  level: number;
  respectXp: number;
  nextLevelXp: number;
  cash: number;
  streakDays: number;
  heatStars: number; // 1-6 звёзд активности/стрика
  lastWorkoutDate: string | null;
  onboardingCompleted: boolean;
  activePlan: WorkoutPlanConfig;
  stats: CharacterStatsBars;
  muscleRecovery: Record<MuscleGroup, MuscleRecoveryState>;
  missions: Mission[];
  activeMissionId: string | null;
  nextGreaseTimestamp: number | null;
  notifications: PhoneNotification[];
  rewards: RewardItem[];
  history: WorkoutLogEntry[];
  soundEnabled: boolean;
  browserPushEnabled: boolean;
}

export interface MissionPassedSummary {
  missionId: string;
  missionTitle: string;
  earnedRespect: number;
  earnedCash: number;
  healthBonus: number;
  leveledUp: boolean;
  newLevel: number;
  statBoosts: Partial<Record<keyof CharacterStatsBars, number>>;
  unlockedTitles: string[];
  recoveryNote: string;
  suggestedNextMissionId?: string;
  suggestedNextMissionTitle?: string;
}

export interface NextTrainingRecommendation {
  status: 'grease_ready' | 'pullup_ready' | 'parallel_suggested' | 'recovery_needed';
  headline: string;
  subtext: string;
  recommendedMissionId: string;
  pullupReadinessPercent: number;
  msUntilPullupReady: number;
  msUntilNextGrease: number;
}

export interface PlanCalibrationInput {
  playerName?: string;
  availableEquipment: EquipmentId[];
  enabledExerciseIds: string[];
  maxPullups: number;
  maxPushups: number;
  focus: WorkoutCategory;
  greaseMinutes?: number;
  daysPerWeek?: number;
}

export interface GameContextValue {
  state: GameState;
  now: number;
  recommendation: NextTrainingRecommendation;
  missionPassedSummary: MissionPassedSummary | null;
  activeToast: PhoneNotification | null;
  isPhoneOpen: boolean;
  isOnboardingOpen: boolean;
  unreadNotificationsCount: number;
  setIsPhoneOpen: (open: boolean) => void;
  setIsOnboardingOpen: (open: boolean) => void;
  dismissToast: () => void;
  closeMissionPassedModal: () => void;
  startMission: (missionId: string) => void;
  cancelActiveMission: () => void;
  completeMission: (missionId: string, completedTasks: MissionExerciseTask[]) => void;
  quickLogGreaseSet: (reps: number) => void;
  quickLogFreeExercise: (exerciseId: string, sets: number, repsOrSecPerSet: number) => void;
  applyCalibrationPlan: (input: PlanCalibrationInput) => void;
  scheduleGreaseTimer: (delaySeconds: number) => void;
  requestCoachStatusPing: () => void;
  callContactForChallenge: (contactId: string) => void;
  markAllNotificationsRead: () => void;
  toggleSound: () => void;
  toggleBrowserPush: () => Promise<void>;
  purchaseReward: (rewardId: string) => boolean;
  addCustomRealReward: (title: string, description: string, costCash: number, icon?: string) => void;
  exportSaveJson: () => string;
  importSaveJson: (rawJson: string) => boolean;
  resetProgress: () => void;
}
