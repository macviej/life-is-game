import React, { useMemo } from 'react';
import {
  Activity,
  MessageCircle,
  MapPin,
  Crosshair,
  CalendarDays,
  Trophy,
  SlidersHorizontal,
  Cloud,
  Wifi,
  Signal,
  Flame,
  ChevronRight,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';

export type PhoneAppTarget =
  | 'fitness'
  | 'fitness_plan'
  | 'messages'
  | 'map'
  | 'missions'
  | 'profile'
  | 'onboarding'
  | 'auth';

interface PhoneHomeScreenProps {
  onLaunchApp: (app: PhoneAppTarget) => void;
}

interface AppTile {
  id: PhoneAppTarget;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  gradient: string;
  iconColor?: string;
  badge?: number;
  dotColor?: string;
}

const MiniActivityRings: React.FC<{
  hpRatio: number;
  xpRatio: number;
  readinessRatio: number;
}> = ({ hpRatio, xpRatio, readinessRatio }) => {
  const clamp = (v: number) => Math.max(0.06, Math.min(1, v));
  const rings = [
    { r: 22, color: '#30D158', track: 'rgba(48,209,88,0.2)', ratio: clamp(hpRatio) },
    { r: 16, color: '#FF375F', track: 'rgba(255,55,95,0.2)', ratio: clamp(xpRatio) },
    { r: 10, color: '#32ADE6', track: 'rgba(50,173,230,0.2)', ratio: clamp(readinessRatio) },
  ];

  return (
    <svg viewBox="0 0 56 56" className="w-12 h-12 shrink-0 -rotate-90" aria-hidden="true">
      {rings.map((ring) => {
        const c = 2 * Math.PI * ring.r;
        const offset = c * (1 - ring.ratio);
        return (
          <g key={ring.r}>
            <circle
              cx="28"
              cy="28"
              r={ring.r}
              fill="none"
              stroke={ring.track}
              strokeWidth="4.2"
            />
            <circle
              cx="28"
              cy="28"
              r={ring.r}
              fill="none"
              stroke={ring.color}
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
            />
          </g>
        );
      })}
    </svg>
  );
};

export const PhoneHomeScreen: React.FC<PhoneHomeScreenProps> = ({ onLaunchApp }) => {
  const { state, now, recommendation, unreadNotificationsCount } = useGame();
  const { user } = useAuth();

  const timeString = useMemo(() => {
    return new Date(now).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [now]);

  const dateString = useMemo(() => {
    const raw = new Date(now).toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [now]);

  const hpPercent = Math.round(
    (state.stats.currentHp / Math.max(1, state.stats.maxHp)) * 100
  );
  const xpRatio = state.respectXp / Math.max(1, state.nextLevelXp);
  const readinessPercent = recommendation.pullupReadinessPercent;
  const activeLifeMissionsCount = state.lifeMissions.filter((m) => m.status === 'active').length;

  const latestMessage = state.notifications[0];
  const coachPreviewText =
    latestMessage?.message ??
    `${recommendation.headline}. ${recommendation.subtext}`;

  const appGrid: AppTile[] = [
    {
      id: 'fitness',
      label: 'Фитнес',
      icon: Activity,
      gradient: 'linear-gradient(145deg, #FF375F 0%, #FF6B57 52%, #FF9F0A 100%)',
    },
    {
      id: 'messages',
      label: 'Сообщения',
      icon: MessageCircle,
      gradient: 'linear-gradient(145deg, #34E86A 0%, #24C45A 55%, #169848 100%)',
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    {
      id: 'map',
      label: 'Карта',
      icon: MapPin,
      gradient: 'linear-gradient(145deg, #5CE1E6 0%, #32ADE6 52%, #0A84FF 100%)',
    },
    {
      id: 'missions',
      label: 'Миссии',
      icon: Crosshair,
      gradient: 'linear-gradient(145deg, #FFD60A 0%, #FF9F0A 60%, #FF6B35 100%)',
      iconColor: '#16120B',
      badge: activeLifeMissionsCount > 0 ? activeLifeMissionsCount : undefined,
    },
    {
      id: 'fitness_plan',
      label: 'План',
      icon: CalendarDays,
      gradient: 'linear-gradient(145deg, #FF6B9D 0%, #D95BFF 55%, #8E54E9 100%)',
    },
    {
      id: 'profile',
      label: 'Награды',
      icon: Trophy,
      gradient: 'linear-gradient(145deg, #6E6CE8 0%, #4E4BD6 58%, #322FA8 100%)',
    },
    {
      id: 'onboarding',
      label: 'Настройка',
      icon: SlidersHorizontal,
      gradient: 'linear-gradient(145deg, #54555E 0%, #34353C 55%, #202127 100%)',
    },
    {
      id: 'auth',
      label: user ? 'Синхр.' : 'Облако',
      icon: Cloud,
      gradient: 'linear-gradient(145deg, #38BDF8 0%, #0EA5E9 55%, #0369A1 100%)',
      dotColor: user ? '#30D158' : undefined,
    },
  ];

  const dockApps: AppTile[] = [
    appGrid[0], // Фитнес
    appGrid[1], // Сообщения
    appGrid[2], // Карта
    appGrid[3], // Миссии
  ];

  return (
    <div className="min-h-screen w-full bg-[#090A0E] relative flex items-center justify-center md:py-6 md:px-6 overflow-hidden">
      {/* Ambient Desktop Miami Sunset Backdrop Glow */}
      <div
        aria-hidden="true"
        className="hidden md:block pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[420px] rounded-full bg-[#FF375F]/14 blur-[130px]" />
        <div className="absolute bottom-[-120px] right-[14%] w-[520px] h-[360px] rounded-full bg-[#32ADE6]/12 blur-[120px]" />
        <div className="absolute bottom-[-80px] left-[12%] w-[460px] h-[320px] rounded-full bg-[#FF9F0A]/10 blur-[120px]" />
      </div>

      {/* Smartphone Chassis (Full-bleed on Mobile, Sleek Flagship Phone on Desktop/Tablet) */}
      <div className="relative w-full min-h-screen md:min-h-0 md:w-[412px] md:h-[min(850px,calc(100vh-48px))] md:rounded-[50px] solis-phone-wallpaper md:solis-phone-frame flex flex-col justify-between overflow-hidden select-none">
        {/* Stylized Solis Coast / Vice Sunset Wallpaper Art */}
        <svg
          viewBox="0 0 420 840"
          preserveAspectRatio="xMidYMax slice"
          className="pointer-events-none absolute inset-0 w-full h-full opacity-55"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="home-sun-disc" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF9F5A" stopOpacity="0.88" />
              <stop offset="52%" stopColor="#FF375F" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#BF5AF2" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="home-ocean" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#32ADE6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#090B12" stopOpacity="0.92" />
            </linearGradient>
          </defs>

          {/* Sunset Disc */}
          <circle cx="210" cy="495" r="126" fill="url(#home-sun-disc)" />
          {/* Retro Cut Lines on Sun */}
          <rect x="70" y="518" width="280" height="5" fill="#13101F" fillOpacity="0.52" />
          <rect x="70" y="534" width="280" height="7" fill="#13101F" fillOpacity="0.6" />
          <rect x="70" y="554" width="280" height="10" fill="#13101F" fillOpacity="0.7" />
          <rect x="70" y="578" width="280" height="14" fill="#13101F" fillOpacity="0.82" />

          {/* Horizon & Ocean */}
          <rect x="0" y="596" width="420" height="244" fill="url(#home-ocean)" />
          <line
            x1="0"
            y1="596"
            x2="420"
            y2="596"
            stroke="#5CE1E6"
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />

          {/* Subtle Palm Silhouettes (Right & Left Edge) */}
          <g fill="none" stroke="#0A0B12" strokeLinecap="round" opacity="0.72">
            <path d="M398 760 C382 670 364 600 332 532" strokeWidth="14" />
            <path d="M332 532 C300 515 268 518 240 538" strokeWidth="8" />
            <path d="M332 530 C308 492 278 478 248 486" strokeWidth="8" />
            <path d="M334 530 C354 486 384 472 414 480" strokeWidth="8" />
            <path d="M335 536 C368 518 396 526 420 550" strokeWidth="8" />

            <path d="M24 780 C38 700 54 640 78 584" strokeWidth="11" />
            <path d="M78 584 C52 568 24 570 0 586" strokeWidth="6.5" />
            <path d="M78 582 C98 552 126 544 152 556" strokeWidth="6.5" />
            <path d="M80 588 C108 576 134 584 154 606" strokeWidth="6.5" />
          </g>
        </svg>

        {/* TOP: iOS / Solis OS Status Bar + Dynamic Island */}
        <div className="relative z-10 px-6 pt-3.5 pb-1">
          <div className="flex items-center justify-between text-[13px] font-semibold text-white">
            <span className="tabular-nums tracking-[-0.01em]">{timeString}</span>

            {/* Dynamic Island Pill with Player Cash & Level */}
            <button
              type="button"
              onClick={() => onLaunchApp('profile')}
              className="px-3 py-1 rounded-full bg-black/85 border border-white/[0.12] flex items-center gap-2 text-[11px] font-semibold shadow-md active:scale-95 transition"
              title="Открыть профиль и награды"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] shadow-[0_0_8px_#30D158]" />
              <span className="text-[#FFD60A] tabular-nums">
                ${state.cash.toLocaleString('ru-RU')}
              </span>
              <span className="text-white/35">·</span>
              <span className="text-[#5CE1E6] tabular-nums">Ур.{state.level}</span>
            </button>

            <div className="flex items-center gap-1.5 text-white/90">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              {/* Battery indicator linked to HP% */}
              <div className="flex items-center gap-0.5" title={`Здоровье: ${hpPercent}%`}>
                <div className="w-[22px] h-[11px] rounded-[3.5px] border border-white/60 p-[1.5px] flex items-center">
                  <div
                    className="h-full rounded-[1.5px] transition-all"
                    style={{
                      width: `${Math.max(12, Math.min(100, hpPercent))}%`,
                      backgroundColor:
                        hpPercent >= 70 ? '#30D158' : hpPercent >= 40 ? '#FFD60A' : '#FF375F',
                    }}
                  />
                </div>
                <div className="w-[1.5px] h-[4px] rounded-r-sm bg-white/55" />
              </div>
            </div>
          </div>

          {/* Subtle Lock/Home Date & Solis OS Header */}
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF85AE]/90">
                LIFE · {dateString}
              </div>
              <div className="mt-0.5 text-[22px] font-bold tracking-[-0.03em] text-white leading-tight">
                {state.playerName}
              </div>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/[0.12] backdrop-blur-md text-[12px] font-semibold text-[#FFD60A] tabular-nums">
              <Flame className="w-3.5 h-3.5" />
              <span>{state.streakDays} дн.</span>
            </div>
          </div>
        </div>

        {/* MIDDLE: Interactive Glass Widgets + App Icon Grid */}
        <div className="relative z-10 flex-1 flex flex-col justify-start px-5 pt-4 pb-3 space-y-5 overflow-y-auto">
          {/* 2-Column Home Widgets */}
          <div className="grid grid-cols-2 gap-3">
            {/* Widget 1: Fitness Activity Rings */}
            <button
              type="button"
              onClick={() => onLaunchApp('fitness')}
              className="ios-widget-glass rounded-[24px] p-3.5 text-left flex flex-col justify-between min-h-[132px] active:scale-[0.97] transition"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#FF7A45]">
                  Фитнес
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-white/40" />
              </div>

              <div className="flex items-center gap-2.5 my-1">
                <MiniActivityRings
                  hpRatio={hpPercent / 100}
                  xpRatio={xpRatio}
                  readinessRatio={readinessPercent / 100}
                />
                <div className="min-w-0 space-y-0.5 tabular-nums">
                  <div className="text-[11px] font-semibold text-[#30D158] truncate">
                    HP {hpPercent}%
                  </div>
                  <div className="text-[11px] font-semibold text-[#32ADE6] truncate">
                    Турник {readinessPercent}%
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-white/65 truncate">
                {readinessPercent >= 85 ? 'Готов к подходу' : 'Восстановление'}
              </div>
            </button>

            {/* Widget 2: Coach Messages Preview */}
            <button
              type="button"
              onClick={() => onLaunchApp('messages')}
              className="ios-widget-glass rounded-[24px] p-3.5 text-left flex flex-col justify-between min-h-[132px] active:scale-[0.97] transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-[#30D158] shrink-0" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#30D158] truncate">
                    Тренер
                  </span>
                </div>
                {unreadNotificationsCount > 0 ? (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF375F] text-[10px] font-bold text-white flex items-center justify-center tabular-nums">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                )}
              </div>

              <p className="text-[12px] text-white/90 leading-[1.35] line-clamp-3 my-1">
                {coachPreviewText}
              </p>

              <div className="text-[11px] font-medium text-[#5CE1E6] truncate">
                Открыть чат →
              </div>
            </button>
          </div>

          {/* 4×2 App Icon Grid */}
          <div className="grid grid-cols-4 gap-x-3 gap-y-4 pt-1">
            {appGrid.map((app) => {
              const Icon = app.icon;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => onLaunchApp(app.id)}
                  className="group flex flex-col items-center gap-1.5 focus:outline-none"
                >
                  <div className="relative">
                    <div
                      className="ios-app-icon w-[60px] h-[60px] rounded-[16px] flex items-center justify-center transition-transform duration-150 group-hover:scale-[1.05] group-active:scale-[0.92]"
                      style={{ background: app.gradient }}
                    >
                      <Icon
                        className="w-[28px] h-[28px] stroke-[2] relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.28)]"
                        style={{ color: app.iconColor ?? '#FFFFFF' }}
                      />
                    </div>

                    {typeof app.badge === 'number' && app.badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-[#FF375F] border-2 border-[#161321] text-[11px] font-bold text-white flex items-center justify-center tabular-nums shadow-md">
                        {app.badge > 9 ? '9+' : app.badge}
                      </span>
                    )}

                    {app.dotColor && (
                      <span
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#161321]"
                        style={{ backgroundColor: app.dotColor }}
                      />
                    )}
                  </div>

                  <span className="text-[11px] font-medium text-white/92 tracking-[-0.01em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] truncate max-w-[72px]">
                    {app.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM: Floating Liquid Glass Phone Dock + Home Indicator */}
        <div className="relative z-10 px-4 pb-3 pt-2">
          <div className="ios-dock-glass rounded-[30px] px-3.5 py-3 grid grid-cols-4 gap-2">
            {dockApps.map((app) => {
              const Icon = app.icon;
              return (
                <button
                  key={`dock-${app.id}`}
                  type="button"
                  onClick={() => onLaunchApp(app.id)}
                  aria-label={app.label}
                  className="group relative flex items-center justify-center focus:outline-none"
                >
                  <div className="relative">
                    <div
                      className="ios-app-icon w-[54px] h-[54px] rounded-[15px] flex items-center justify-center transition-transform duration-150 group-hover:scale-[1.06] group-active:scale-[0.91]"
                      style={{ background: app.gradient }}
                    >
                      <Icon
                        className="w-[26px] h-[26px] stroke-[2] relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.28)]"
                        style={{ color: app.iconColor ?? '#FFFFFF' }}
                      />
                    </div>
                    {typeof app.badge === 'number' && app.badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 rounded-full bg-[#FF375F] border-2 border-[#1b1c24] text-[10px] font-bold text-white flex items-center justify-center tabular-nums">
                        {app.badge > 9 ? '9+' : app.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* iOS Home Indicator */}
          <div className="mt-3 flex justify-center">
            <div className="w-32 h-[4px] rounded-full bg-white/35" />
          </div>
        </div>
      </div>
    </div>
  );
};
