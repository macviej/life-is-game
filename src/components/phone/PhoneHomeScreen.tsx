import React, { useMemo } from 'react';
import {
  Activity,
  MessageCircle,
  MapPin,
  Crosshair,
  CalendarDays,
  SlidersHorizontal,
  Cloud,
  Settings,
  Flame,
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

interface AppIconItem {
  id: PhoneAppTarget;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  gradient: string;
  glow: string;
  iconColor?: string;
  badge?: number;
  statusDot?: string;
}

export const PhoneHomeScreen: React.FC<PhoneHomeScreenProps> = ({ onLaunchApp }) => {
  const { state, now, unreadNotificationsCount } = useGame();
  const { user } = useAuth();

  const timeString = useMemo(() => {
    return new Date(now).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [now]);

  const dateString = useMemo(() => {
    const raw = new Date(now).toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [now]);

  const activeLifeMissionsCount = state.lifeMissions.filter((m) => m.status === 'active').length;

  const apps: AppIconItem[] = [
    {
      id: 'fitness',
      label: 'Фитнес',
      icon: Activity,
      gradient: 'linear-gradient(145deg, #FF375F 0%, #FF6B57 52%, #FF9F0A 100%)',
      glow: 'rgba(255, 55, 95, 0.36)',
    },
    {
      id: 'messages',
      label: 'Сообщения',
      icon: MessageCircle,
      gradient: 'linear-gradient(145deg, #48484A 0%, #2C2C2E 100%)',
      glow: 'rgba(0, 0, 0, 0.3)',
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    {
      id: 'map',
      label: 'Карта',
      icon: MapPin,
      gradient: 'linear-gradient(145deg, #48484A 0%, #2C2C2E 100%)',
      glow: 'rgba(0, 0, 0, 0.3)',
    },
    {
      id: 'missions',
      label: 'Миссии',
      icon: Crosshair,
      gradient: 'linear-gradient(145deg, #48484A 0%, #2C2C2E 100%)',
      glow: 'rgba(0, 0, 0, 0.3)',
      badge: activeLifeMissionsCount > 0 ? activeLifeMissionsCount : undefined,
    },
    {
      id: 'fitness_plan',
      label: 'План',
      icon: CalendarDays,
      gradient: 'linear-gradient(145deg, #48484A 0%, #2C2C2E 100%)',
      glow: 'rgba(0, 0, 0, 0.3)',
    },
    {
      id: 'onboarding',
      label: 'Настройка',
      icon: SlidersHorizontal,
      gradient: 'linear-gradient(145deg, #48484A 0%, #2C2C2E 100%)',
      glow: 'rgba(0, 0, 0, 0.3)',
    },
    {
      id: 'auth',
      label: user ? 'Синхр.' : 'Облако',
      icon: Cloud,
      gradient: 'linear-gradient(145deg, #48484A 0%, #2C2C2E 100%)',
      glow: 'rgba(0, 0, 0, 0.3)',
      statusDot: user ? '#30D158' : undefined,
    },
    {
      id: 'profile',
      label: 'Профиль',
      icon: Settings,
      gradient: 'linear-gradient(145deg, #48484A 0%, #2C2C2E 100%)',
      glow: 'rgba(0, 0, 0, 0.3)',
    },
  ];

  const dockApps = apps.slice(0, 4);

  return (
    <div className="min-h-screen w-full solis-phone-wallpaper relative flex flex-col justify-between overflow-hidden select-none">
      {/* Atmospheric Sunset Horizon Wallpaper Art */}
      <svg
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMidYMax slice"
        className="pointer-events-none fixed inset-0 w-full h-full opacity-45"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="life-home-sun" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF9F5A" stopOpacity="0.82" />
            <stop offset="52%" stopColor="#FF375F" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#BF5AF2" stopOpacity="0.16" />
          </linearGradient>
          <linearGradient id="life-home-sea" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#32ADE6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#090B12" stopOpacity="0.94" />
          </linearGradient>
        </defs>

        <circle cx="600" cy="560" r="190" fill="url(#life-home-sun)" />
        <rect x="380" y="590" width="440" height="7" fill="#13101F" fillOpacity="0.52" />
        <rect x="380" y="614" width="440" height="10" fill="#13101F" fillOpacity="0.62" />
        <rect x="380" y="644" width="440" height="14" fill="#13101F" fillOpacity="0.72" />
        <rect x="380" y="680" width="440" height="18" fill="#13101F" fillOpacity="0.84" />

        <rect x="0" y="704" width="1200" height="196" fill="url(#life-home-sea)" />
        <line
          x1="0"
          y1="704"
          x2="1200"
          y2="704"
          stroke="#5CE1E6"
          strokeOpacity="0.32"
          strokeWidth="1.5"
        />
      </svg>

      {/* Top Minimal Status Strip */}
      <header className="relative z-10 w-full max-w-[680px] mx-auto px-5 sm:px-8 pt-4 sm:pt-6 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] backdrop-blur-xl">
          <span className="w-2 h-2 rounded-full bg-[#30D158] shadow-[0_0_8px_#30D158]" />
          <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/95">
            LIFE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onLaunchApp('profile')}
            className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] backdrop-blur-xl text-[12px] font-medium text-white/90 active:scale-95 transition"
          >
            {state.playerName}
          </button>
          {state.streakDays > 0 && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] backdrop-blur-xl text-[12px] font-semibold text-[#FFD60A] tabular-nums">
              <Flame className="w-3.5 h-3.5" />
              <span>{state.streakDays} дн.</span>
            </div>
          )}
        </div>
      </header>

      {/* Center: Big Clock + Real Squircle App Icons Grid */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-[560px] mx-auto px-6 py-6 sm:py-10">
        {/* Clean iOS / GTA Phone Clock */}
        <div className="text-center mb-9 sm:mb-12">
          <p className="text-[13px] sm:text-[15px] font-medium text-white/75 tracking-[-0.01em] drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
            {dateString}
          </p>
          <h1 className="mt-1 text-[56px] sm:text-[72px] font-semibold tracking-[-0.04em] text-white leading-none tabular-nums drop-shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
            {timeString}
          </h1>
        </div>

        {/* 4×2 App Launcher Grid */}
        <section
          aria-label="Приложения"
          className="w-full grid grid-cols-4 gap-x-4 sm:gap-x-8 gap-y-6 sm:gap-y-8 justify-items-center"
        >
          {apps.map((app) => {
            const Icon = app.icon;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => onLaunchApp(app.id)}
                className="group flex flex-col items-center gap-2 focus:outline-none"
              >
                <div className="relative">
                  <div
                    className="ios-app-icon w-[64px] h-[64px] sm:w-[76px] sm:h-[76px] rounded-[17px] sm:rounded-[21px] flex items-center justify-center transition-transform duration-150 group-hover:scale-[1.07] group-active:scale-[0.91]"
                    style={{
                      background: app.gradient,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.22), 0 14px 28px -8px ${app.glow}, 0 8px 18px -6px rgba(0,0,0,0.65)`,
                    }}
                  >
                    <Icon
                      className="w-[30px] h-[30px] sm:w-[36px] sm:h-[36px] stroke-[2] relative z-10 drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]"
                      style={{ color: app.iconColor ?? '#FFFFFF' }}
                    />
                  </div>

                  {typeof app.badge === 'number' && app.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#FF375F] border-2 border-black text-[12px] font-bold text-white flex items-center justify-center tabular-nums shadow-lg">
                      {app.badge > 99 ? '99+' : app.badge}
                    </span>
                  )}

                  {app.statusDot && (
                    <span
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black"
                      style={{ backgroundColor: app.statusDot }}
                    />
                  )}
                </div>

                <span className="text-[12px] sm:text-[13px] font-medium text-white/95 tracking-[-0.01em] drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] truncate max-w-[78px] sm:max-w-[90px]">
                  {app.label}
                </span>
              </button>
            );
          })}
        </section>
      </main>

      {/* Floating Liquid Glass Bottom Dock */}
      <footer className="relative z-10 w-full max-w-[390px] sm:max-w-[430px] mx-auto px-4 pb-4 sm:pb-6 pt-2">
        <div className="ios-dock-glass rounded-[30px] px-4 py-3 grid grid-cols-4 gap-3 justify-items-center">
          {dockApps.map((app) => {
            const Icon = app.icon;
            return (
              <button
                key={`dock-${app.id}`}
                type="button"
                onClick={() => onLaunchApp(app.id)}
                aria-label={app.label}
                title={app.label}
                className="group relative flex items-center justify-center focus:outline-none"
              >
                <div className="relative">
                  <div
                    className="ios-app-icon w-[54px] h-[54px] sm:w-[60px] sm:h-[60px] rounded-[15px] sm:rounded-[17px] flex items-center justify-center transition-transform duration-150 group-hover:scale-[1.08] group-active:scale-[0.91]"
                    style={{ background: app.gradient }}
                  >
                    <Icon
                      className="w-[26px] h-[26px] sm:w-[29px] sm:h-[29px] stroke-[2] relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.28)]"
                      style={{ color: app.iconColor ?? '#FFFFFF' }}
                    />
                  </div>
                  {typeof app.badge === 'number' && app.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-[#FF375F] border-2 border-black text-[12px] font-bold text-white flex items-center justify-center tabular-nums">
                      {app.badge > 99 ? '99+' : app.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Home Indicator Pill */}
        <div className="mt-3 flex justify-center">
          <div className="w-32 h-[4px] rounded-full bg-white/30" />
        </div>
      </footer>
    </div>
  );
};
