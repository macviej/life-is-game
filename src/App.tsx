import React, { useState } from 'react';
import {
  Crosshair,
  MapPin,
  Activity,
  Bell,
  User,
  SlidersHorizontal,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider, useGame } from './context/GameContext';
import { AuthModal } from './components/auth/AuthModal';
import { SolisLogo } from './components/brand/SolisLogo';
import { LifeMissionsHub } from './components/missions/LifeMissionsHub';
import { MissionBuilderModal } from './components/missions/MissionBuilderModal';
import { SolisWorldMap } from './components/map/SolisWorldMap';
import { CharacterPhoneView } from './components/character/CharacterPhoneView';
import { MissionMap } from './components/missions/MissionMap';
import { ActiveWorkout } from './components/missions/ActiveWorkout';
import { PlanOnboarding } from './components/missions/PlanOnboarding';
import { MissionPassedModal } from './components/hud/MissionPassedModal';
import { NotificationToast } from './components/phone/NotificationToast';
import { MessagesTabView } from './components/phone/MessagesTabView';
import { RewardsShop } from './components/safehouse/RewardsShop';

type AppTab = 'missions' | 'map' | 'fitness' | 'messages' | 'profile';
type FitnessSubTab = 'overview' | 'plan';

const NAV_TABS: {
  id: AppTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'missions', label: 'Миссии', icon: Crosshair },
  { id: 'map', label: 'Карта', icon: MapPin },
  { id: 'fitness', label: 'Фитнес', icon: Activity },
  { id: 'messages', label: 'Сводка', icon: Bell },
  { id: 'profile', label: 'Профиль', icon: User },
];

const AdaptiveAppShell: React.FC = () => {
  const {
    state,
    unreadNotificationsCount,
    markAllNotificationsRead,
    setIsOnboardingOpen,
  } = useGame();
  const { user, setIsAuthModalOpen } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>('missions');
  const [fitnessSubTab, setFitnessSubTab] = useState<FitnessSubTab>('overview');
  const [focusedMissionId, setFocusedMissionId] = useState<string | null>(null);
  const [isQuickBuilderOpen, setIsQuickBuilderOpen] = useState(false);

  const handleSelectTab = (tab: AppTab) => {
    setActiveTab(tab);
    if (tab === 'messages' && unreadNotificationsCount > 0) {
      markAllNotificationsRead();
    }
  };

  const handleOpenMissionInHub = (missionId: string) => {
    setFocusedMissionId(missionId);
    setActiveTab('missions');
  };

  const handleFocusOnMap = (_missionId: string) => {
    setActiveTab('map');
  };

  const isInActiveMission = Boolean(state.activeMissionId);
  const hpPercent = Math.round(
    (state.stats.currentHp / Math.max(1, state.stats.maxHp)) * 100
  );
  const healthLabel =
    hpPercent >= 75 ? 'В тонусе' : hpPercent >= 45 ? 'Восстановление' : 'Усталость';
  const healthColor =
    hpPercent >= 75
      ? 'text-[#7ED484]'
      : hpPercent >= 45
      ? 'text-[#FFB36B]'
      : 'text-[#FF6B9D]';

  return (
    <div className="min-h-screen w-full bg-[#0E0F11] text-white flex flex-col lg:flex-row">
      {/* DESKTOP SIDEBAR (>= 1024px) */}
      {!isInActiveMission && (
        <aside className="hidden lg:flex lg:flex-col lg:w-[272px] shrink-0 p-4 sticky top-0 h-screen">
          <div className="flex-1 rounded-[24px] apple-card p-4 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Brand Logo */}
              <div className="px-1.5 pt-1">
                <SolisLogo variant="full" />
              </div>

              {/* Compact Player Status */}
              <div className="rounded-[18px] apple-card-elevated px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[14px] font-semibold tracking-[-0.01em] text-white truncate">
                    {state.playerName}
                  </div>
                  <span className="text-[12px] font-bold text-[#FFB36B] tabular-nums shrink-0">
                    ${state.cash.toLocaleString('ru-RU')}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[12px]">
                  <span className={`font-medium ${healthColor}`}>{healthLabel}</span>
                  <span className="text-[#8E9098] tabular-nums">
                    Ур. {state.level} · {state.respectXp} XP
                  </span>
                </div>
              </div>

              <nav aria-label="Навигация" className="space-y-1">
                {NAV_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const showBadge = tab.id === 'messages' && unreadNotificationsCount > 0;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectTab(tab.id)}
                      className={`w-full px-3.5 py-2.5 rounded-[14px] flex items-center justify-between transition-all active:scale-[0.98] ${
                        isActive
                          ? 'apple-pill-active text-white'
                          : 'text-[#8E9098] hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-[18px] h-[18px] ${
                            isActive ? 'text-[#FF85AE] stroke-[2.1]' : 'stroke-[1.8]'
                          }`}
                        />
                        <span
                          className={`text-[14px] ${
                            isActive ? 'font-semibold text-white' : 'font-medium'
                          }`}
                        >
                          {tab.label}
                        </span>
                      </div>
                      {showBadge && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#FF6B9D] text-[11px] font-bold text-[#111214] flex items-center justify-center tabular-nums">
                          {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-white/[0.07] space-y-2.5">
              <div className="px-2 text-[12px] text-[#8E9098] flex items-center justify-between">
                <span>Активных миссий</span>
                <span className="font-medium text-white/90 tabular-nums">
                  {state.lifeMissions.filter((m) => m.status === 'active').length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOnboardingOpen(true)}
                className="w-full h-10 px-3.5 rounded-[12px] bg-[#25262B] hover:bg-[#2F3137] text-[13px] font-medium text-white inline-flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#E5A3BD]" />
                <span>Настроить фитнес-план</span>
              </button>

              {!user && (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full h-10 px-3.5 rounded-[12px] apple-sunset-cta text-[#111214] text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition active:scale-[0.98]"
                >
                  <span>Войти в аккаунт</span>
                </button>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* MOBILE STICKY HEADER (< 768px) */}
      {!isInActiveMission && (
        <header className="md:hidden sticky top-0 z-30 px-4 pt-3 pb-2.5 flex items-center justify-between gap-3 bg-[#0E0F11]/88 backdrop-blur-xl border-b border-white/[0.05]">
          <SolisLogo variant="compact" />
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full apple-card text-[12px] font-semibold text-[#FFB36B] tabular-nums">
              ${state.cash.toLocaleString('ru-RU')}
            </span>
            <span className="px-2.5 py-1 rounded-full apple-card text-[12px] font-semibold text-[#5CE1E6] tabular-nums">
              Ур. {state.level}
            </span>
          </div>
        </header>
      )}

      {/* TABLET TOP BAR (768px – 1023px) */}
      {!isInActiveMission && (
        <header className="hidden md:flex lg:hidden sticky top-0 z-30 px-6 pt-4 pb-2.5 items-center justify-between gap-4 bg-[#0E0F11]/90 backdrop-blur-xl">
          <SolisLogo variant="compact" />

          <nav
            aria-label="Навигация планшета"
            className="rounded-full apple-liquid-glass p-1 flex items-center gap-1"
          >
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const showBadge = tab.id === 'messages' && unreadNotificationsCount > 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  className={`relative px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-[13px] transition-all ${
                    isActive
                      ? 'apple-pill-active text-white font-semibold'
                      : 'text-[#8E9098] hover:text-white font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF85AE]' : ''}`} />
                  <span>{tab.label}</span>
                  {showBadge && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#FF6B9D] text-[10px] font-bold text-[#111214] flex items-center justify-center tabular-nums">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setIsOnboardingOpen(true)}
            className="w-9 h-9 rounded-full apple-card hover:bg-[#25262B] flex items-center justify-center text-white/90 transition"
            aria-label="Настроить фитнес-план"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#E5A3BD]" />
          </button>
        </header>
      )}

      {/* MAIN RESPONSIVE VIEWPORT */}
      <main
        className={`flex-1 min-w-0 w-full ${
          isInActiveMission ? 'pb-10' : 'pb-28 md:pb-10'
        }`}
      >
        <div className="w-full px-4 md:px-6 lg:px-8 xl:px-10 py-4 lg:py-5">
          {isInActiveMission ? (
            <ActiveWorkout />
          ) : (
            <>
              {activeTab === 'missions' && (
                <LifeMissionsHub
                  initialSelectedMissionId={focusedMissionId}
                  onOpenFitnessTab={() => handleSelectTab('fitness')}
                  onFocusOnMap={handleFocusOnMap}
                />
              )}

              {activeTab === 'map' && (
                <SolisWorldMap
                  onOpenMissionInHub={handleOpenMissionInHub}
                  onOpenCreateMission={() => setIsQuickBuilderOpen(true)}
                />
              )}

              {activeTab === 'fitness' && (
                <div className="space-y-4">
                  <div className="inline-flex rounded-full apple-card p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setFitnessSubTab('overview')}
                      className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition ${
                        fitnessSubTab === 'overview'
                          ? 'apple-pill-active text-white'
                          : 'text-[#8E9098] hover:text-white'
                      }`}
                    >
                      Форма и тело
                    </button>
                    <button
                      type="button"
                      onClick={() => setFitnessSubTab('plan')}
                      className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition ${
                        fitnessSubTab === 'plan'
                          ? 'apple-pill-active text-white'
                          : 'text-[#8E9098] hover:text-white'
                      }`}
                    >
                      План тренировок
                    </button>
                  </div>

                  {fitnessSubTab === 'overview' ? (
                    <CharacterPhoneView onOpenPlan={() => setFitnessSubTab('plan')} />
                  ) : (
                    <MissionMap />
                  )}
                </div>
              )}

              {activeTab === 'messages' && <MessagesTabView />}
              {activeTab === 'profile' && <RewardsShop />}
            </>
          )}
        </div>
      </main>

      {/* MOBILE FLOATING LIQUID GLASS TAB BAR (< 768px) */}
      {!isInActiveMission && (
        <>
          <div
            aria-hidden="true"
            className="md:hidden pointer-events-none fixed bottom-0 left-0 right-0 z-20 h-24 bg-gradient-to-t from-[#0E0F11] via-[#0E0F11]/82 to-transparent"
          />
          <nav
            aria-label="Мобильная навигация"
            className="md:hidden fixed bottom-3.5 left-3 right-3 z-30 max-w-[460px] mx-auto rounded-[28px] apple-liquid-glass p-1.5"
          >
            <div className="grid grid-cols-5 gap-0.5">
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const showBadge = tab.id === 'messages' && unreadNotificationsCount > 0;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectTab(tab.id)}
                    className={`relative flex flex-col items-center justify-center gap-0.5 py-2 rounded-[22px] transition-all duration-200 active:scale-[0.96] ${
                      isActive
                        ? 'apple-pill-active text-white'
                        : 'text-[#8E9098] hover:text-white'
                    }`}
                  >
                    <div className="relative">
                      <Icon
                        className={`w-[19px] h-[19px] transition-colors ${
                          isActive ? 'text-[#FF85AE] stroke-[2.1]' : 'stroke-[1.8]'
                        }`}
                      />
                      {showBadge && (
                        <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#FF6B9D] text-[10px] font-bold text-[#111214] flex items-center justify-center tabular-nums">
                          {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] leading-tight ${
                        isActive ? 'font-semibold text-white' : 'font-medium'
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </>
      )}

      <MissionBuilderModal
        isOpen={isQuickBuilderOpen}
        onClose={() => setIsQuickBuilderOpen(false)}
      />
      <NotificationToast onOpenMessages={() => handleSelectTab('messages')} />
      <PlanOnboarding />
      <MissionPassedModal />
      <AuthModal />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <AdaptiveAppShell />
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
