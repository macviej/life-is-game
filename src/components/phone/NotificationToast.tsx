import React from 'react';
import { X, Bell, Sparkles, Radio } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { getContactById } from '../../data/contacts';

interface NotificationToastProps {
  onOpenMessages?: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ onOpenMessages }) => {
  const { activeToast, dismissToast, startMission } = useGame();

  if (!activeToast) return null;

  const contact = getContactById(activeToast.contactId);
  const isLuciaPraise = activeToast.category === 'lucia_praise';
  const isStreetJoke = activeToast.category === 'street_joke';

  const handleOpen = () => {
    const missionId = activeToast.actionMissionId;
    dismissToast();
    if (missionId) {
      startMission(missionId);
    } else if (onOpenMessages) {
      onOpenMessages();
    }
  };

  const containerClass = isLuciaPraise
    ? 'lucia-praise-banner'
    : 'apple-liquid-glass';

  const iconTileClass = isLuciaPraise
    ? 'bg-gradient-to-br from-[#FF6B9D] via-[#FF8DA1] to-[#FFB36B] text-[#111214]'
    : isStreetJoke
    ? 'bg-gradient-to-br from-[#5CE1E6] to-[#32ADE6] text-[#0E1318]'
    : 'apple-sunset-cta text-[#111214]';

  return (
    <div className="fixed top-3 left-3 right-3 md:left-auto md:right-6 md:top-6 md:w-[396px] z-50 animate-toast-in">
      <div
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleOpen();
        }}
        className={`w-full rounded-[26px] ${containerClass} px-3.5 py-3 flex items-start gap-3 cursor-pointer active:scale-[0.98] transition`}
      >
        {/* Native iOS App Icon Tile */}
        <div
          className={`w-9 h-9 rounded-[11px] ${iconTileClass} flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}
        >
          {isLuciaPraise ? (
            <Sparkles className="w-[17px] h-[17px] stroke-[2.3]" />
          ) : isStreetJoke ? (
            <Radio className="w-[17px] h-[17px] stroke-[2.2]" />
          ) : (
            <Bell className="w-[17px] h-[17px] stroke-[2.2]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {isLuciaPraise ? (
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FF6B9D]/20 border border-[#FF6B9D]/35 text-[10px] font-bold uppercase tracking-[0.12em] text-[#FFC2D6]">
                Люсии это понравится
              </span>
              <span className="text-[11px] text-white/60 shrink-0">сейчас</span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold tracking-[-0.01em] text-white truncate">
                {isStreetJoke ? activeToast.title || 'Пульс Solis' : contact.name}
              </span>
              <span className="text-[11px] text-[#AEAEB2] shrink-0">сейчас</span>
            </div>
          )}

          <p className="mt-1 text-[13px] text-white/90 line-clamp-2 leading-snug">
            {activeToast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismissToast();
          }}
          className="shrink-0 w-6 h-6 rounded-full bg-white/[0.08] hover:bg-white/[0.16] flex items-center justify-center text-white/75 hover:text-white transition"
          aria-label="Закрыть уведомление"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
