import { LifeMission, MissionGroup, MissionTemplate } from '../types/game';

export interface SolisDistrict {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  color: string;
}

export const SOLIS_DISTRICTS: SolisDistrict[] = [
  {
    id: 'solis_keys',
    name: 'Ключи Солиса',
    subtitle: 'Тихая часть побережья',
    x: 22,
    y: 74,
    color: '#FFB36B',
  },
  {
    id: 'bayfront_market',
    name: 'Бэйфронт Плаза',
    subtitle: 'Город и магазины',
    x: 38,
    y: 44,
    color: '#7ED484',
  },
  {
    id: 'sunset_strip',
    name: 'Бульвар Заката',
    subtitle: 'Набережная и площадки',
    x: 68,
    y: 36,
    color: '#E5A3BD',
  },
  {
    id: 'downtown_spire',
    name: 'Деловой Порт',
    subtitle: 'Работа и дела',
    x: 54,
    y: 24,
    color: '#B79CED',
  },
  {
    id: 'coral_bridge',
    name: 'Коралловый Мост',
    subtitle: 'Дороги и маршруты',
    x: 78,
    y: 66,
    color: '#F97316',
  },
  {
    id: 'palm_heights',
    name: 'Пальмовые Холмы',
    subtitle: 'Парки и прогулки',
    x: 24,
    y: 26,
    color: '#5CE1E6',
  },
];

/** Группы и миссии создаёт сам человек. Стартовый набор не подставляется. */
export const DEFAULT_MISSION_GROUPS: MissionGroup[] = [];

export const MISSION_TEMPLATES: MissionTemplate[] = [];

export const INITIAL_LIFE_MISSIONS: LifeMission[] = [];
