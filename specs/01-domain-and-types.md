# Спецификация 01: Контракты данных и типы (`src/types/game.ts`)

> **Назначение:** Базовый контракт типов для воркеров (`Gemini 4 Hydrogen`). Актуальные расширения (жизненные миссии, авторизация, карта Solis) см. напрямую в `src/types/game.ts`.

## Полный код `src/types/game.ts`

```typescript
export type WorkoutCategory =
  | 'pullup_bar'   // Турник и перекладина (главный фокус)
  | 'calisthenics' // Воркаут: брусья, отжимания, пресс, элементы
  | 'gym_iron'     // Тренажерный зал, гантели, гири, штанга
  | 'cardio_street'// Кардио, бег, скакалка, бой с тенью, HIIT
  | 'mobility_hp'; // Разминка, растяжка, декомпрессия (Аптечка / +Health)

export type MuscleGroup =
  | 'back_biceps'  // Спина, широчайшие, бицепс и хват (основная нагрузка на турнике)
  | 'chest_triceps'// Грудь и трицепс (брусья, отжимания, жимы)
  | 'shoulders'    // Плечи и ротаторы
  | 'core'         // Пресс и стабилизаторы кора
  | 'legs'         // Ноги и ягодицы
  | 'cns_cardio';  // ЦНС и дыхательная система

export type MissionType =
  | 'main_campaign'       // Сюжетная кампания (Турник: от базы к элементам)
  | 'parallel_side'       // Параллельные ветки (Отжимания, Кор, Кардио, Мобильность)
  | 'grease_the_groove'   // Фоновая миссия «Подходы в течение дня» (каждые 1-3 часа)
  | 'strangers_and_freaks'// Случайный мини-вызов на 2-3 минуты
  | 'boss_fight';         // Босс-миссия (экзамен для перехода на новый ранг/акт)

export type DifficultyTier = 'rookie' | 'street' | 'pro' | 'legend';

export interface Exercise {
  id: string;
  name: string;
  category: WorkoutCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  unit: 'reps' | 'seconds' | 'meters';
  defaultTarget: number;
  defaultSets: number;
  restSeconds: number;
  recoveryHours: number; // Сколько часов нужно мышцам до 100% готовности после полной сессии
  description: string;
  techniqueTip: string;
  xpPerSet: number;
  cashPerSet: number;
  healthBonus: number;
}

export interface MissionExerciseTask {
  exerciseId: string;
  sets: number;
  targetPerSet: number; // Повторения или секунды
  completedSets: number[]; // Фактически выполненные повторения в каждом подходе
}

export interface Mission {
  id: string;
  code: string; // Иконка на радаре GTA: 'P' (Pull-up), 'S' (Street), 'C' (Cardio), '?' (Freaks), '♥' (Medkit), '★' (Boss)
  title: string;
  subtitle: string;
  giverContactId: string; // Кто выдаёт миссию в смартфоне iFruit
  briefingQuote: string;  // Реплика персонажа в стиле GTA 6
  type: MissionType;
  category: WorkoutCategory;
  act: number;            // Глава кампании (1, 2, 3...)
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
  cooldownMinutes: number; // Через сколько минут миссию или следующий подход можно продолжить
  lastCompletedAt?: number;
  timesCompleted: number;
  isUnlocked: boolean;
}

export interface CharacterStatsBars {
  healthLevel: number; // Уровень здоровья и жизненного тонуса (0-100)
  maxHp: number;       // Максимальный запас ХП (100 - 200, растёт с уровнем здоровья)
  currentHp: number;   // Текущее ХП (падает от перетрена/прогулов, растёт от тренировок и мобильности)
  strength: number;    // Сила (0-100) — турник, брусья, железо
  stamina: number;     // Выносливость (0-100) — кардио, многоповторка
  agility: number;     // Контроль тела и мобильность (0-100) — висы, кор, растяжка
  discipline: number;  // Дисциплина / Множитель Respect (0-100)
}

export interface MuscleRecoveryState {
  group: MuscleGroup;
  label: string;
  readinessPercent: number; // 0% (истощена) - 100% (свежая, можно бомбить)
  lastTrainedAt: number | null;
  readyAtTimestamp: number | null; // Точное время, когда можно продолжить тренировку этой группы
}

export interface WorkoutPlanConfig {
  id: string;
  name: string;
  description: string;
  tier: DifficultyTier;
  primaryFocus: WorkoutCategory;
  maxPullupsBaseline: number;
  maxPushupsBaseline: number;
  greaseIntervalMinutes: number; // Интервал напоминаний «Подход на турнике в течение дня» (например, 90 мин)
  weeklyTargetMissions: number;
  recommendedMissionIds: string[];
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
  heatStars: number; // 1-6 звёзд GTA за интенсивность дня/недели
  lastWorkoutDate: string | null;
  onboardingCompleted: boolean;
  activePlan: WorkoutPlanConfig;
  stats: CharacterStatsBars;
  muscleRecovery: Record<MuscleGroup, MuscleRecoveryState>;
  missions: Mission[];
  activeMissionId: string | null;
  nextGreaseTimestamp: number | null; // Таймер «Когда следующий подход на турнике»
  notifications: PhoneNotification[];
  rewards: RewardItem[];
  history: WorkoutLogEntry[];
  soundEnabled: boolean;
  browserPushEnabled: boolean;
}
```
