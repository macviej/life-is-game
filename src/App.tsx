import React, { useState } from 'react';
import {
  User,
  CalendarCheck2,
  Bell,
  SlidersHorizontal,
  History,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider, useGame } from './context/GameContext';
import { AuthModal } from './components/auth/AuthModal';
import { CharacterPhoneView } from './components/character/CharacterPhoneView';
import { MissionMap } from './components/missions/MissionMap';
import { ActiveWorkout } from './components/missions/ActiveWorkout';
import { PlanOnboarding } from './components/missions/PlanOnboarding';
import { MissionPassedModal } from './components/hud/MissionPassedModal';
import { NotificationToast } from './components/phone/NotificationToast';
import { MessagesTabView } from './components/phone/MessagesTabView';
import { RewardsShop } from './components/safehouse/RewardsShop';

type AppTab = 'character' | 'plan' | 'messages' | 'rewards';

const NAV_TABS: {
  id: AppTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'character', label: 'Фитнес', icon: User },
  { id: 'plan', label: 'План', icon: CalendarCheck2 },
  { id: 'messages', label: 'Сводка', icon: Bell },
  { id: 'rewards', label: 'Профиль', icon: History },
];

const AdaptiveAppShell: React.FC = () => {
  const {
    state,
    unreadNotificationsCount,
    markAllNotificationsRead,
    setIsOnboardingOpen,
  } = useGame();
  const { user, setIsAuthModalOpen } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>('character');

  const handleSelectTab = (tab: AppTab) => {
    setActiveTab(tab);
    if (tab === 'messages' && unreadNotificationsCount > 0) {
      markAllNotificationsRead();
    }
  };

  const isInActiveMission = Boolean(state.activeMissionId);
  const hpPercent = Math.round(
    (state.stats.currentHp / Math.max(1, state.stats.maxHp)) * 100
  );
  const healthLabel =
    hpPercent >= 75 ? 'Здоров' : hpPercent >= 45 ? 'Восстановление' : 'Усталость';
  const healthColor =
    hpPercent >= 75 ? 'text-[#7ED484]' : hpPercent >= 45 ? 'text-[#E5C97B]' : 'text-[#E5A3BD]';

  return (
    <div className="min-h-screen w-full bg-[#0E0F11] text-white flex flex-col lg:flex-row">
      {/* DESKTOP SIDEBAR (>= 1024px) */}
      {!isInActiveMission && (
        <aside className="hidden lg:flex lg:flex-col lg:w-[260px] shrink-0 p-4 sticky top-0 h-screen">
          <div className="flex-1 rounded-[24px] apple-card p-4 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="px-2 pt-1">
                <div className="text-[18px] font-semibold tracking-[-0.02em] text-white truncate">
                  {state.playerName}
                </div>
                <div className={`text-[13px] font-medium ${healthColor}`}>
                  {healthLabel}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[12px] text-[#8E9098] tabular-nums">
                  <span>Уровень {state.level}</span>
                  <span>·</span>
                  <span>{state.respectXp} XP</span>
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
                            isActive ? 'text-[#E5A3BD] stroke-[2.1]' : 'stroke-[1.8]'
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
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#E5A3BD] text-[11px] font-bold text-[#111214] flex items-center justify-center tabular-nums">
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
                <span>График</span>
                <span className="font-medium text-white/90 tabular-nums">
                  {state.activePlan.weeklyTargetMissions} трен./нед.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOnboardingOpen(true)}
                className="w-full h-10 px-3.5 rounded-[12px] bg-[#25262B] hover:bg-[#2F3137] text-[13px] font-medium text-white inline-flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#E5A3BD]" />
                <span>Настроить план</span>
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

      {/* TABLET TOP BAR (768px – 1023px) */}
      {!isInActiveMission && (
        <header className="hidden md:flex lg:hidden sticky top-0 z-30 px-6 pt-4 pb-2 items-center justify-between gap-4 bg-[#0E0F11]/90 backdrop-blur-xl">
          <div>
            <div className="text-[15px] font-semibold text-white leading-tight">
              {state.playerName}
            </div>
            <div className={`text-[12px] font-medium ${healthColor}`}>{healthLabel}</div>
          </div>

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
                  className={`relative px-4 py-1.5 rounded-full flex items-center gap-2 text-[13px] transition-all ${
                    isActive
                      ? 'apple-pill-active text-white font-semibold'
                      : 'text-[#8E9098] hover:text-white font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#E5A3BD]' : ''}`} />
                  <span>{tab.label}</span>
                  {showBadge && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#E5A3BD] text-[10px] font-bold text-[#111214] flex items-center justify-center tabular-nums">
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
            aria-label="Настроить программу"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#E5A3BD]" />
          </button>
        </header>
      )}

      {/* MAIN RESPONSIVE VIEWPORT — Full-width on Desktop, Tablet & Mobile */}
      <main
        className={`flex-1 min-w-0 w-full ${
          isInActiveMission ? 'pb-10' : 'pb-28 md:pb-10'
        }`}
      >
        <div className="w-full md:px-6 lg:px-8 xl:px-10 lg:py-5">
          {isInActiveMission ? (
            <ActiveWorkout />
          ) : (
            <>
              {activeTab === 'character' && (
                <CharacterPhoneView onOpenPlan={() => handleSelectTab('plan')} />
              )}
              {activeTab === 'plan' && <MissionMap />}
              {activeTab === 'messages' && <MessagesTabView />}
              {activeTab === 'rewards' && <RewardsShop />}
            </>
          )}
        </div>
      </main>

      {/* MOBILE FLOATING LIQUID GLASS TAB BAR (< 768px) */}
      {!isInActiveMission && (
        <>
          <div
            aria-hidden="true"
            className="md:hidden pointer-events-none fixed bottom-0 left-0 right-0 z-20 h-24 bg-gradient-to-t from-[#0E0F11] via-[#0E0F11]/80 to-transparent"
          />
          <nav
            aria-label="Мобильная навигация"
            className="md:hidden fixed bottom-4 left-4 right-4 z-30 max-w-[440px] mx-auto rounded-[28px] apple-liquid-glass p-1.5"
          >
            <div className="grid grid-cols-4 gap-1">
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
                        className={`w-[20px] h-[20px] transition-colors ${
                          isActive ? 'text-[#E5A3BD] stroke-[2.1]' : 'stroke-[1.8]'
                        }`}
                      />
                      {showBadge && (
                        <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#E5A3BD] text-[10px] font-bold text-[#111214] flex items-center justify-center tabular-nums">
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
