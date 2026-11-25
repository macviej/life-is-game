import React, { useState } from 'react';
import {
  Smartphone,
  Crosshair,
  MapPin,
  Activity,
  MessageCircle,
  Trophy,
  SlidersHorizontal,
  ChevronLeft,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider, useGame } from './context/GameContext';
import { AuthModal } from './components/auth/AuthModal';
import { SolisLogo } from './components/brand/SolisLogo';
import { LifeMissionsHub } from './components/missions/LifeMissionsHub';
import {
  InitialMapPinInput,
  MissionBuilderModal,
} from './components/missions/MissionBuilderModal';
import { SolisWorldMap } from './components/map/SolisWorldMap';
import { CharacterPhoneView } from './components/character/CharacterPhoneView';
import { MissionMap } from './components/missions/MissionMap';
import { ActiveWorkout } from './components/missions/ActiveWorkout';
import { PlanOnboarding } from './components/missions/PlanOnboarding';
import { MissionPassedModal } from './components/hud/MissionPassedModal';
import { NotificationToast } from './components/phone/NotificationToast';
import { MessagesTabView } from './components/phone/MessagesTabView';
import { PhoneHomeScreen, PhoneAppTarget } from './components/phone/PhoneHomeScreen';
import { RewardsShop } from './components/safehouse/RewardsShop';

type AppTab = 'home' | 'fitness' | 'messages' | 'map' | 'missions' | 'profile';
type FitnessSubTab = 'overview' | 'plan';

const NAV_TABS: {
  id: AppTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'home', label: 'Телефон', icon: Smartphone },
  { id: 'fitness', label: 'Фитнес', icon: Activity },
  { id: 'messages', label: 'Сообщения', icon: MessageCircle },
  { id: 'map', label: 'Карта', icon: MapPin },
  { id: 'missions', label: 'Миссии', icon: Crosshair },
  { id: 'profile', label: 'Награды', icon: Trophy },
];

const MOBILE_DOCK_TABS = NAV_TABS.slice(0, 5);

const APP_TITLES: Record<AppTab, string> = {
  home: 'Телефон',
  fitness: 'Фитнес',
  messages: 'Сообщения',
  map: 'Карта',
  missions: 'Миссии',
  profile: 'Награды',
};

const AdaptiveAppShell: React.FC = () => {
  const {
    state,
    unreadNotificationsCount,
    markAllNotificationsRead,
    setIsOnboardingOpen,
  } = useGame();
  const { user, setIsAuthModalOpen } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [fitnessSubTab, setFitnessSubTab] = useState<FitnessSubTab>('overview');
  const [focusedMissionId, setFocusedMissionId] = useState<string | null>(null);
  const [isQuickBuilderOpen, setIsQuickBuilderOpen] = useState(false);
  const [pendingMapPin, setPendingMapPin] = useState<InitialMapPinInput | null>(null);

  const handleOpenQuickBuilder = (pin?: InitialMapPinInput) => {
    setPendingMapPin(pin ?? null);
    setIsQuickBuilderOpen(true);
  };

  const handleCloseQuickBuilder = () => {
    setIsQuickBuilderOpen(false);
    setPendingMapPin(null);
  };

  const handleSelectTab = (tab: AppTab) => {
    setActiveTab(tab);
    if (tab === 'messages' && unreadNotificationsCount > 0) {
      markAllNotificationsRead();
    }
  };

  const handleLaunchApp = (target: PhoneAppTarget) => {
    switch (target) {
      case 'fitness':
        setFitnessSubTab('overview');
        setActiveTab('fitness');
        break;
      case 'fitness_plan':
        setFitnessSubTab('plan');
        setActiveTab('fitness');
        break;
      case 'messages':
        handleSelectTab('messages');
        break;
      case 'map':
        setActiveTab('map');
        break;
      case 'missions':
        setActiveTab('missions');
        break;
      case 'profile':
        setActiveTab('profile');
        break;
      case 'onboarding':
        setIsOnboardingOpen(true);
        break;
      case 'auth':
        setIsAuthModalOpen(true);
        break;
    }
  };

  const handleOpenFitness = (subTab: FitnessSubTab = 'overview') => {
    setFitnessSubTab(subTab);
    setActiveTab('fitness');
  };

  const handleOpenMissionInHub = (missionId: string) => {
    setFocusedMissionId(missionId);
    setActiveTab('missions');
  };

  const handleFocusOnMap = (_missionId: string) => {
    setActiveTab('map');
  };

  const isInActiveMission = Boolean(state.activeMissionId);
  const isHomeScreen = activeTab === 'home' && !isInActiveMission;
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

  if (isHomeScreen) {
    return (
      <>
        <PhoneHomeScreen onLaunchApp={handleLaunchApp} />
        <MissionBuilderModal
          isOpen={isQuickBuilderOpen}
          initialMapPin={pendingMapPin}
          onClose={handleCloseQuickBuilder}
        />
        <NotificationToast onOpenMessages={() => handleSelectTab('messages')} />
        <PlanOnboarding />
        <MissionPassedModal />
        <AuthModal />
      </>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0E0F11] text-white flex flex-col lg:flex-row">
      {/* DESKTOP SIDEBAR (>= 1024px) */}
      {!isInActiveMission && (
        <aside className="hidden lg:flex lg:flex-col lg:w-[272px] shrink-0 p-4 sticky top-0 h-screen">
          <div className="flex-1 rounded-[24px] apple-card p-4 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Brand Logo (clicks back to Phone Home) */}
              <button
                type="button"
                onClick={() => handleSelectTab('home')}
                className="px-1.5 pt-1 text-left transition hover:opacity-90 active:scale-[0.99]"
              >
                <SolisLogo variant="full" />
              </button>

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

      {/* MOBILE STICKY APP HEADER (< 768px) with Back to Phone Home */}
      {!isInActiveMission && (
        <header className="md:hidden sticky top-0 z-30 px-4 pt-3 pb-2.5 flex items-center justify-between gap-2 bg-[#0E0F11]/90 backdrop-blur-xl border-b border-white/[0.06]">
          <button
            type="button"
            onClick={() => handleSelectTab('home')}
            className="h-8 pl-2 pr-3 rounded-full apple-card hover:bg-[#25262B] text-[13px] font-semibold text-white inline-flex items-center gap-1 active:scale-95 transition"
          >
            <ChevronLeft className="w-4 h-4 text-[#FF85AE]" />
            <span>Домой</span>
          </button>

          <span className="text-[14px] font-semibold tracking-[-0.01em] text-white truncate">
            {APP_TITLES[activeTab]}
          </span>

          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full apple-card text-[11px] font-semibold text-[#FFB36B] tabular-nums">
              ${state.cash.toLocaleString('ru-RU')}
            </span>
          </div>
        </header>
      )}

      {/* TABLET TOP BAR (768px – 1023px) */}
      {!isInActiveMission && (
        <header className="hidden md:flex lg:hidden sticky top-0 z-30 px-6 pt-4 pb-2.5 items-center justify-between gap-4 bg-[#0E0F11]/90 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => handleSelectTab('home')}
            className="h-9 pl-2.5 pr-3.5 rounded-full apple-card hover:bg-[#25262B] text-[13px] font-semibold text-white inline-flex items-center gap-1.5 transition"
          >
            <ChevronLeft className="w-4 h-4 text-[#FF85AE]" />
            <span>Телефон</span>
          </button>

          <nav
            aria-label="Навигация планшета"
            className="rounded-full apple-liquid-glass p-1 flex items-center gap-1"
          >
            {NAV_TABS.filter((t) => t.id !== 'home').map((tab) => {
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
                  onOpenFitnessTab={() => handleOpenFitness('overview')}
                  onFocusOnMap={handleFocusOnMap}
                />
              )}

              {activeTab === 'map' && (
                <SolisWorldMap
                  onOpenMissionInHub={handleOpenMissionInHub}
                  onOpenCreateMission={handleOpenQuickBuilder}
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

              {activeTab === 'messages' && (
                <MessagesTabView
                  onOpenFitness={handleOpenFitness}
                  onOpenPlan={() => handleOpenFitness('plan')}
                />
              )}
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
              {MOBILE_DOCK_TABS.map((tab) => {
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
        initialMapPin={pendingMapPin}
        onClose={handleCloseQuickBuilder}
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
