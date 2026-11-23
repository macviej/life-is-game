import React from 'react';
import { X, Bell } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { getContactById } from '../../data/contacts';

interface NotificationToastProps {
  onOpenMessages?: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ onOpenMessages }) => {
  const { activeToast, dismissToast, startMission } = useGame();

  if (!activeToast) return null;

  const contact = getContactById(activeToast.contactId);

  const handleOpen = () => {
    const missionId = activeToast.actionMissionId;
    dismissToast();
    if (missionId) {
      startMission(missionId);
    } else if (onOpenMessages) {
      onOpenMessages();
    }
  };

  return (
    <div className="fixed top-3 left-3 right-3 md:left-auto md:right-6 md:top-6 md:w-[390px] z-50 animate-toast-in">
      <div
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleOpen();
        }}
        className="w-full rounded-[26px] apple-liquid-glass px-3.5 py-3 flex items-start gap-3 cursor-pointer active:scale-[0.98] transition"
      >
        {/* Native iOS App Icon Tile */}
        <div className="w-9 h-9 rounded-[11px] apple-sunset-cta flex items-center justify-center shrink-0 text-[#111214] mt-0.5">
          <Bell className="w-[17px] h-[17px] stroke-[2.2]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold tracking-[-0.01em] text-white truncate">
              {contact.name}
            </span>
            <span className="text-[11px] text-[#AEAEB2] shrink-0">сейчас</span>
          </div>
          <p className="mt-0.5 text-[13px] text-white/85 line-clamp-2 leading-snug">
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
