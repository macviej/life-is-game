import React, { useMemo } from 'react';
import {
  Activity,
  MessageCircle,
  MapPin,
  Crosshair,
  Settings,
  ArrowUpRight,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';

export type PhoneAppTarget = 'fitness' | 'messages' | 'map' | 'missions' | 'profile';

interface PhoneHomeScreenProps {
  onLaunchApp: (app: PhoneAppTarget) => void;
}

interface AppCardItem {
  id: PhoneAppTarget;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  badge?: number;
  statusDot?: string;
}

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
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [now]);

  const activeLifeMissionsCount = state.lifeMissions.filter((m) => m.status === 'active').length;
  const readiness = recommendation.pullupReadinessPercent;

  const apps: AppCardItem[] = [
    {
      id: 'fitness',
      title: 'Фитнес',
      subtitle:
        readiness >= 85
          ? `Готовность ${readiness}% · можно тренироваться`
          : `Восстановление ${readiness}% · план и форма`,
      icon: Activity,
      iconBg: 'bg-[#FF375F]/14',
      iconColor: 'text-[#FF6B8A]',
    },
    {
      id: 'messages',
      title: 'Сообщения',
      subtitle:
        unreadNotificationsCount > 0
          ? `Новых сообщений: ${unreadNotificationsCount}`
          : 'Чат с тренером и сводка',
      icon: MessageCircle,
      iconBg: 'bg-[#30D158]/14',
      iconColor: 'text-[#7ED484]',
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    {
      id: 'map',
      title: 'Карта',
      subtitle: 'Точки, локации и маршруты',
      icon: MapPin,
      iconBg: 'bg-[#32ADE6]/14',
      iconColor: 'text-[#64D2FF]',
    },
    {
      id: 'missions',
      title: 'Миссии',
      subtitle:
        activeLifeMissionsCount > 0
          ? `Активных задач: ${activeLifeMissionsCount}`
          : 'Цели, списки и дела',
      icon: Crosshair,
      iconBg: 'bg-[#FFB36B]/14',
      iconColor: 'text-[#FFB36B]',
      badge: activeLifeMissionsCount > 0 ? activeLifeMissionsCount : undefined,
    },
    {
      id: 'profile',
      title: 'Профиль',
      subtitle: user ? 'Облако подключено · план и копии' : 'Аккаунт, план и резервная копия',
      icon: Settings,
      iconBg: 'bg-white/[0.08]',
      iconColor: 'text-[#D1D2D8]',
      statusDot: user ? '#30D158' : undefined,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto py-2 md:py-4 space-y-6 md:space-y-8">
      {/* Clean Material Design 3 Hero Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
        <div>
          <p className="text-[13px] font-medium text-[#8E9098]">{dateString}</p>
          <h1 className="mt-1 text-[34px] md:text-[42px] font-semibold tracking-[-0.03em] text-white leading-none tabular-nums">
            {timeString}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-end">
          <div className="px-3.5 py-2 rounded-full bg-[#1C1D21] border border-white/[0.08] text-[13px] font-medium text-white/90">
            {state.playerName}
          </div>
          {state.streakDays > 0 && (
            <div className="px-3.5 py-2 rounded-full bg-[#1C1D21] border border-white/[0.08] text-[13px] font-medium text-[#8E9098] tabular-nums">
              Серия {state.streakDays} дн.
            </div>
          )}
        </div>
      </header>

      {/* Responsive Material Card Grid (Mobile + Tablet + Desktop) */}
      <section aria-label="Приложения" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 md:gap-4">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => onLaunchApp(app.id)}
              className="group relative text-left rounded-[24px] bg-[#191A1D] hover:bg-[#212227] border border-white/[0.08] hover:border-white/[0.15] p-5 md:p-6 flex flex-col justify-between min-h-[144px] md:min-h-[164px] transition-all duration-200 active:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A3BD]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-[16px] ${app.iconBg} flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.04]`}
                  >
                    <Icon className={`w-6 h-6 stroke-[1.9] ${app.iconColor}`} />
                  </div>
                  {app.statusDot && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#191A1D]"
                      style={{ backgroundColor: app.statusDot }}
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {typeof app.badge === 'number' && app.badge > 0 && (
                    <span className="min-w-[24px] h-6 px-2 rounded-full bg-[#FF6B9D] text-[12px] font-semibold text-[#111214] flex items-center justify-center tabular-nums">
                      {app.badge > 99 ? '99+' : app.badge}
                    </span>
                  )}
                  <ArrowUpRight className="w-4 h-4 text-[#63656E] group-hover:text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              </div>

              <div className="mt-5">
                <div className="text-[18px] font-semibold tracking-[-0.015em] text-white">
                  {app.title}
                </div>
                <div className="mt-1 text-[13px] text-[#8E9098] leading-snug">
                  {app.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
};
