import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BatteryCharging,
  Bell,
  BellOff,
  BellRing,
  CheckCheck,
  MessageSquare,
  PhoneCall,
  Smartphone,
  Sparkles,
  Timer,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { PHONE_CONTACTS, getContactById } from '../../data/contacts';
import { formatDurationMs } from '../../engine/recoveryEngine';
import { playRadarBlipSound } from '../../engine/soundEffects';

type PhoneTab = 'messages' | 'alerts' | 'contacts';

const GREASE_PRESETS: Array<{ label: string; seconds: number; badge?: string }> = [
  { label: '10 сек (Тест)', seconds: 10, badge: 'ТЕСТ' },
  { label: '45 мин', seconds: 45 * 60 },
  { label: '90 мин', seconds: 90 * 60 },
  { label: '2 часа', seconds: 120 * 60 },
  { label: '3 часа', seconds: 180 * 60 },
];

export const SolisLinkPhone: React.FC = () => {
  const {
    state,
    recommendation,
    isPhoneOpen,
    setIsPhoneOpen,
    unreadNotificationsCount,
    startMission,
    scheduleGreaseTimer,
    requestCoachStatusPing,
    callContactForChallenge,
    markAllNotificationsRead,
    toggleSound,
    toggleBrowserPush,
  } = useGame();

  const [activeTab, setActiveTab] = useState<PhoneTab>('messages');
  const [selectedPresetSec, setSelectedPresetSec] = useState<number | null>(null);
  const [contactFeedbackId, setContactFeedbackId] = useState<string | null>(null);

  const sortedNotifications = [...state.notifications].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  useEffect(() => {
    if (!contactFeedbackId) return;
    const timer = window.setTimeout(() => setContactFeedbackId(null), 2600);
    return () => window.clearTimeout(timer);
  }, [contactFeedbackId]);

  const handleTogglePhone = (open: boolean) => {
    if (state.soundEnabled) {
      playRadarBlipSound();
    }
    setIsPhoneOpen(open);
  };

  const handleSchedulePreset = (seconds: number) => {
    if (state.soundEnabled) {
      playRadarBlipSound();
    }
    setSelectedPresetSec(seconds);
    scheduleGreaseTimer(seconds);
  };

  const handleStatusPing = () => {
    if (state.soundEnabled) {
      playRadarBlipSound();
    }
    requestCoachStatusPing();
  };

  const handleCallContact = (contactId: string) => {
    if (state.soundEnabled) {
      playRadarBlipSound();
    }
    callContactForChallenge(contactId);
    setContactFeedbackId(contactId);
  };

  const handleNotificationMissionClick = (missionId?: string) => {
    if (!missionId) return;
    if (state.soundEnabled) {
      playRadarBlipSound();
    }
    startMission(missionId);
  };

  const pushPermission =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported';

  const currentClock = new Date().toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Свёрнутый режим: изящная плавающая пилюля Solis Link с градиентным кольцом
  if (!isPhoneOpen) {
    const isGreaseReady = recommendation.status === 'grease_ready';

    return (
      <div className="fixed bottom-20 md:bottom-5 right-4 z-50">
        <button
          type="button"
          onClick={() => handleTogglePhone(true)}
          className="group relative rounded-full p-[1.5px] bg-gradient-to-r from-[#FF4D8D] via-[#FF8A4C] to-[#00DFC8] shadow-sunset-glow transition-all hover:scale-[1.03] active:scale-95"
          aria-label="Открыть мессенджер Solis Link"
        >
          <div className="flex items-center gap-3 rounded-full bg-[#120D20]/95 backdrop-blur-xl px-4 py-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#FF4D8D]/25 via-[#FF8A4C]/20 to-[#00DFC8]/25 border border-white/10">
              <Smartphone className="h-4 w-4 text-[#00DFC8] transition-colors group-hover:text-[#FF8A4C]" />
              {isGreaseReady && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#10E598] ring-2 ring-[#120D20] animate-ping" />
              )}
            </span>

            <div className="text-left pr-1">
              <div className="font-display text-xs font-extrabold tracking-widest text-[#F8F5FF]">
                SOLIS LINK
              </div>
              <div className="text-[11px] font-medium text-[#9F95B8] tabular-nums">
                {recommendation.msUntilNextGrease > 0
                  ? `Через ${formatDurationMs(recommendation.msUntilNextGrease)}`
                  : 'Связь с тренерами'}
              </div>
            </div>
          </div>

          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-gradient-to-r from-[#FF4D8D] to-[#FF8A4C] px-1.5 font-mono text-xs font-bold text-[#0E0A18] shadow-sunset-glow ring-2 ring-[#0E0A18] tabular-nums">
              {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Развёрнутый тонкий стеклянный корпус смартфона SOLIS LINK
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[380px] animate-mission-in">
      <div className="relative flex flex-col overflow-hidden rounded-[2.25rem] border border-white/[0.14] bg-[#120C21]/95 backdrop-blur-2xl shadow-[0_32px_70px_-15px_rgba(6,3,14,0.92),0_0_40px_-14px_rgba(255,77,141,0.35)] max-h-[84vh] h-[620px]">
        {/* Тонкий градиентный ободок */}
        <div className="pointer-events-none absolute inset-0 rounded-[2.25rem] ring-1 ring-inset ring-white/[0.08]" />

        {/* Верхняя статус-панель SOLIS LINK */}
        <div className="relative flex items-center justify-between px-5 pt-3.5 pb-2.5 border-b border-white/[0.08] bg-[#0E0A18]/65 shrink-0">
          <span className="font-mono text-xs font-semibold text-[#F8F5FF]/90 tabular-nums">
            {currentClock}
          </span>

          <div className="flex items-center gap-1.5 rounded-full bg-[#1C1430] px-3 py-1 border border-white/[0.09]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00DFC8] animate-pulse" />
            <span className="font-display text-[11px] font-extrabold tracking-[0.18em] sunset-gradient-text">
              SOLIS LINK
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Wifi className="h-3.5 w-3.5 text-[#00DFC8]" />
            <BatteryCharging className="h-4 w-4 text-[#10E598]" />
            <button
              type="button"
              onClick={() => handleTogglePhone(false)}
              aria-label="Свернуть Solis Link"
              className="ml-1 rounded-full bg-white/[0.07] p-1.5 text-[#9F95B8] transition hover:bg-[#FF4D8D]/25 hover:text-[#F8F5FF]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Основной экран вкладки */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5">
          {/* ВКЛАДКА 1: СООБЩЕНИЯ */}
          {activeTab === 'messages' && (
            <>
              {/* Карточка текущего статуса готовности */}
              <div className="rounded-2xl border border-[#00DFC8]/25 bg-gradient-to-br from-[#00DFC8]/10 via-[#1A132B] to-[#FF4D8D]/10 p-3.5">
                <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#00DFC8]">
                  <span>Статус готовности</span>
                  <span className="font-mono text-[#F8F5FF] tabular-nums">
                    Турник: {recommendation.pullupReadinessPercent}%
                  </span>
                </div>
                <p className="mt-1 font-semibold text-xs text-[#F8F5FF] leading-snug">
                  {recommendation.headline}
                </p>
                <p className="mt-1 text-xs text-[#9F95B8] leading-snug">
                  {recommendation.subtext}
                </p>
              </div>

              {/* Кнопка: Спросить тренера */}
              <button
                type="button"
                onClick={handleStatusPing}
                className="sunset-btn-primary flex w-full min-h-[46px] items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold tracking-wide text-[#0E0A18] transition active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" />
                <span>Спросить тренера: что делать сейчас?</span>
              </button>

              {/* Заголовок ленты */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#9F95B8]">
                  Сообщения ({sortedNotifications.length})
                </span>
                {unreadNotificationsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (state.soundEnabled) playRadarBlipSound();
                      markAllNotificationsRead();
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-[#00DFC8] transition hover:bg-white/[0.12]"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Прочитать все</span>
                  </button>
                )}
              </div>

              {/* Лента уведомлений */}
              {sortedNotifications.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-center text-xs text-[#9F95B8]">
                  Пока нет сообщений. Нажмите кнопку выше, чтобы получить рекомендацию тренера!
                </div>
              ) : (
                <div className="space-y-2.5 pb-1">
                  {sortedNotifications.map((item) => {
                    const contact = getContactById(item.contactId);
                    const accent = contact?.accentColor || '#00DFC8';
                    const hasMission = Boolean(item.actionMissionId);

                    return (
                      <div
                        key={item.id}
                        onClick={() =>
                          hasMission && handleNotificationMissionClick(item.actionMissionId)
                        }
                        role={hasMission ? 'button' : undefined}
                        tabIndex={hasMission ? 0 : undefined}
                        onKeyDown={(e) => {
                          if (hasMission && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            handleNotificationMissionClick(item.actionMissionId);
                          }
                        }}
                        className={`relative overflow-hidden rounded-2xl border p-3.5 transition ${
                          item.read
                            ? 'border-white/[0.07] bg-white/[0.03]'
                            : 'border-white/[0.16] bg-white/[0.07]'
                        } ${
                          hasMission
                            ? 'cursor-pointer hover:border-[#FF8A4C]/50 hover:bg-white/[0.09]'
                            : ''
                        }`}
                      >
                        <div
                          className="absolute inset-y-2.5 left-0 w-1 rounded-r-full"
                          style={{ backgroundColor: accent }}
                        />

                        <div className="pl-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base">{contact?.avatarEmoji || '🌴'}</span>
                              <span
                                className="truncate text-xs font-bold tracking-wide"
                                style={{ color: accent }}
                              >
                                {contact?.name || 'Solis Link'}
                              </span>
                              {!item.read && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-[#FF4D8D]" />
                              )}
                            </div>

                            <span className="font-mono text-[10px] text-[#9F95B8] tabular-nums shrink-0">
                              {new Date(item.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="mt-1 font-display text-sm font-bold text-[#F8F5FF]">
                            {item.title}
                          </div>
                          <p className="mt-0.5 text-xs leading-relaxed text-[#9F95B8]">
                            {item.message}
                          </p>

                          {item.actionMissionId && (
                            <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#FFD166]">
                              <span>Начать миссию</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ВКЛАДКА 2: ТАЙМЕРЫ */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {/* Тумблеры звука и Push-уведомлений */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-[#9F95B8]">
                  Настройки уведомлений
                </div>

                {/* Звуки уведомлений */}
                <button
                  type="button"
                  onClick={toggleSound}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-left transition hover:border-[#00DFC8]/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]">
                      {state.soundEnabled ? (
                        <Volume2 className="h-4 w-4 text-[#00DFC8]" />
                      ) : (
                        <VolumeX className="h-4 w-4 text-[#9F95B8]" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#F8F5FF]">
                        Звуки уведомлений
                      </div>
                      <div className="text-[11px] text-[#9F95B8]">
                        Аудиосигналы подходов и наград
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-bold ${
                      state.soundEnabled
                        ? 'bg-[#00DFC8]/15 text-[#00DFC8] border border-[#00DFC8]/40'
                        : 'bg-white/[0.07] text-[#9F95B8] border border-white/[0.08]'
                    }`}
                  >
                    {state.soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}
                  </span>
                </button>

                {/* Push-уведомления браузера */}
                <button
                  type="button"
                  onClick={() => void toggleBrowserPush()}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-left transition hover:border-[#FF4D8D]/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]">
                      {state.browserPushEnabled ? (
                        <Bell className="h-4 w-4 text-[#FF4D8D]" />
                      ) : (
                        <BellOff className="h-4 w-4 text-[#9F95B8]" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#F8F5FF]">
                        Push-уведомления браузера
                      </div>
                      <div className="text-[11px] text-[#9F95B8]">
                        Статус:{' '}
                        {pushPermission === 'granted'
                          ? 'Разрешены'
                          : pushPermission === 'denied'
                          ? 'Заблокированы'
                          : pushPermission === 'unsupported'
                          ? 'Не поддерживаются'
                          : 'Ожидают разрешения'}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-bold ${
                      state.browserPushEnabled
                        ? 'bg-[#FF4D8D]/15 text-[#FF4D8D] border border-[#FF4D8D]/40'
                        : 'bg-white/[0.07] text-[#9F95B8] border border-white/[0.08]'
                    }`}
                  >
                    {state.browserPushEnabled ? 'ВКЛ' : 'ВЫКЛ'}
                  </span>
                </button>
              </div>

              {/* Живой обратный отсчёт */}
              <div className="rounded-2xl border border-[#FFD166]/30 bg-gradient-to-br from-[#FFD166]/12 via-[#1A132B] to-[#FF8A4C]/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FFD166]">
                    <Timer className="h-4 w-4" />
                    <span>Следующий подход дня</span>
                  </div>
                  <Zap className="h-4 w-4 text-[#FFD166] animate-pulse" />
                </div>

                <div className="mt-2 font-mono text-3xl font-bold tracking-tight text-[#F8F5FF] tabular-nums">
                  {recommendation.msUntilNextGrease > 0
                    ? formatDurationMs(recommendation.msUntilNextGrease)
                    : state.nextGreaseTimestamp
                    ? '00:00 — ГОТОВ'
                    : 'Не запущен'}
                </div>
                <p className="mt-1 text-[11px] text-[#9F95B8] leading-snug">
                  {recommendation.msUntilNextGrease > 0
                    ? 'Таймер активен. Solis Link напомнит о подходе, когда время выйдет.'
                    : 'Выберите интервал ниже, чтобы поставить напоминание.'}
                </p>
              </div>

              {/* Кнопки таймера напоминаний */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#9F95B8]">
                  Напомнить о подходе через:
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {GREASE_PRESETS.map((preset) => {
                    const isSelected = selectedPresetSec === preset.seconds;
                    const isTest = preset.seconds === 10;

                    return (
                      <button
                        key={preset.seconds}
                        type="button"
                        onClick={() => handleSchedulePreset(preset.seconds)}
                        className={`flex min-h-[44px] items-center justify-between rounded-2xl border px-4 py-2.5 text-left text-xs font-bold transition active:scale-[0.98] ${
                          isTest
                            ? 'border-[#FF4D8D]/45 bg-gradient-to-r from-[#FF4D8D]/18 to-[#FF8A4C]/12 text-[#F8F5FF] hover:border-[#FF4D8D]'
                            : isSelected
                            ? 'border-[#00DFC8]/60 bg-[#00DFC8]/15 text-[#00DFC8]'
                            : 'border-white/[0.08] bg-white/[0.04] text-[#F8F5FF] hover:border-white/20 hover:bg-white/[0.07]'
                        }`}
                      >
                        <span>{preset.label}</span>
                        {preset.badge ? (
                          <span className="rounded-lg bg-gradient-to-r from-[#FF4D8D] to-[#FF8A4C] px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#0E0A18]">
                            {preset.badge}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-[#9F95B8]">
                            Запустить →
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ВКЛАДКА 3: ТРЕНЕРЫ */}
          {activeTab === 'contacts' && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#9F95B8]">
                Наставники Solis Bay ({PHONE_CONTACTS.length})
              </div>

              {PHONE_CONTACTS.map((contact) => {
                const isCalled = contactFeedbackId === contact.id;

                return (
                  <div
                    key={contact.id}
                    className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5"
                  >
                    <div
                      className="absolute inset-y-3 left-0 w-1 rounded-r-full"
                      style={{ backgroundColor: contact.accentColor }}
                    />

                    <div className="pl-2.5">
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-xl bg-[#0E0A18]/75"
                          style={{ borderColor: `${contact.accentColor}55` }}
                        >
                          {contact.avatarEmoji}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4
                            className="truncate font-display text-base font-bold"
                            style={{ color: contact.accentColor }}
                          >
                            {contact.name}
                          </h4>
                          <div className="text-[11px] font-semibold text-[#F8F5FF]/90">
                            {contact.role}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-[#9F95B8]">
                            {contact.bio}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCallContact(contact.id)}
                        className="mt-3 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition active:scale-[0.98]"
                        style={{
                          borderColor: `${contact.accentColor}55`,
                          backgroundColor: isCalled
                            ? `${contact.accentColor}28`
                            : `${contact.accentColor}12`,
                          color: isCalled ? '#F8F5FF' : contact.accentColor,
                        }}
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                        <span>
                          {isCalled
                            ? 'Мини-вызов получен — смотрите сообщения!'
                            : 'Запросить мини-вызов'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Нижняя навигация Solis Link (3 вкладки) */}
        <div className="grid grid-cols-3 gap-1 border-t border-white/[0.08] bg-[#0E0A18]/85 px-2.5 py-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (state.soundEnabled) playRadarBlipSound();
              setActiveTab('messages');
            }}
            className={`relative flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-bold transition ${
              activeTab === 'messages'
                ? 'bg-[#00DFC8]/14 text-[#00DFC8]'
                : 'text-[#9F95B8] hover:text-[#F8F5FF]'
            }`}
          >
            <div className="relative">
              <MessageSquare className="h-4 w-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#FF4D8D] px-1 font-mono text-[9px] font-bold text-[#0E0A18] tabular-nums">
                  {unreadNotificationsCount}
                </span>
              )}
            </div>
            <span>Сообщения</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (state.soundEnabled) playRadarBlipSound();
              setActiveTab('alerts');
            }}
            className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-bold transition ${
              activeTab === 'alerts'
                ? 'bg-[#FFD166]/14 text-[#FFD166]'
                : 'text-[#9F95B8] hover:text-[#F8F5FF]'
            }`}
          >
            <BellRing className="h-4 w-4" />
            <span>Таймеры</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (state.soundEnabled) playRadarBlipSound();
              setActiveTab('contacts');
            }}
            className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-bold transition ${
              activeTab === 'contacts'
                ? 'bg-[#FF4D8D]/14 text-[#FF4D8D]'
                : 'text-[#9F95B8] hover:text-[#F8F5FF]'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Тренеры</span>
          </button>
        </div>
      </div>
    </div>
  );
};
