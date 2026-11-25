import React, { useId } from 'react';

export interface SolisLogoProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export const SolisLogo: React.FC<SolisLogoProps> = ({
  variant = 'full',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const isCompact = variant === 'compact';

  const bgGradId = `solis-bg-${uid}`;
  const sunGradId = `solis-sun-${uid}`;
  const waterGradId = `solis-water-${uid}`;
  const rimGradId = `solis-rim-${uid}`;
  const clipId = `solis-clip-${uid}`;

  return (
    <div
      className={`inline-flex items-center select-none ${
        isCompact ? 'gap-2.5' : 'gap-3'
      } ${className}`}
    >
      {/* iOS Squircle Emblem */}
      <div
        className={`relative shrink-0 ${
          isCompact ? 'w-8 h-8' : 'w-10 h-10'
        }`}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_6px_16px_rgba(255,107,157,0.28)]"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={bgGradId} x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1E1726" />
              <stop offset="55%" stopColor="#15161C" />
              <stop offset="100%" stopColor="#0E1A22" />
            </linearGradient>

            <linearGradient id={sunGradId} x1="12" y1="8" x2="36" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF6B9D" />
              <stop offset="52%" stopColor="#FFB36B" />
              <stop offset="100%" stopColor="#5CE1E6" />
            </linearGradient>

            <linearGradient id={waterGradId} x1="6" y1="32" x2="42" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#5CE1E6" stopOpacity="0.48" />
              <stop offset="50%" stopColor="#FF6B9D" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#FFB36B" stopOpacity="0.22" />
            </linearGradient>

            <linearGradient id={rimGradId} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.34" />
              <stop offset="45%" stopColor="#FF6B9D" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#5CE1E6" stopOpacity="0.32" />
            </linearGradient>

            <clipPath id={clipId}>
              <rect x="1" y="1" width="46" height="46" rx="12" />
            </clipPath>
          </defs>

          <g clipPath={`url(#${clipId})`}>
            {/* Night Sky Canvas */}
            <rect x="1" y="1" width="46" height="46" rx="12" fill={`url(#${bgGradId})`} />

            {/* Soft Sunset Glow */}
            <circle cx="24" cy="24" r="18" fill={`url(#${sunGradId})`} fillOpacity="0.16" />

            {/* Sunset Sun Disc */}
            <circle cx="24" cy="23.5" r="11.5" fill={`url(#${sunGradId})`} />

            {/* Retro Horizontal Sunset Cut Lines */}
            <rect x="11" y="24.2" width="26" height="1.35" fill="#15161C" fillOpacity="0.92" />
            <rect x="11" y="27.3" width="26" height="1.75" fill="#15161C" fillOpacity="0.94" />
            <rect x="11" y="30.8" width="26" height="2.2" fill="#15161C" fillOpacity="0.96" />

            {/* Horizon Water Band */}
            <rect x="1" y="33.5" width="46" height="13.5" fill="#101319" />
            <rect x="1" y="33.5" width="46" height="13.5" fill={`url(#${waterGradId})`} />
            <line
              x1="6"
              y1="34"
              x2="42"
              y2="34"
              stroke="#5CE1E6"
              strokeOpacity="0.55"
              strokeWidth="0.9"
            />
            <line
              x1="14"
              y1="37.5"
              x2="34"
              y2="37.5"
              stroke="#FFB36B"
              strokeOpacity="0.45"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <line
              x1="18"
              y1="40.8"
              x2="30"
              y2="40.8"
              stroke="#FF6B9D"
              strokeOpacity="0.4"
              strokeWidth="0.9"
              strokeLinecap="round"
            />

            {/* Minimalist Leaning Palm Silhouette */}
            <path
              d="M17.2 35.2C18.6 29.8 20.8 25.4 23.6 21.4"
              stroke="#0D0F14"
              strokeWidth="2.3"
              strokeLinecap="round"
            />
            <path
              d="M23.5 21.6C20.2 19.6 16.4 19.6 13.4 21.4"
              stroke="#0D0F14"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            <path
              d="M23.6 21.3C21.8 17.6 18.8 15.8 15.6 15.9"
              stroke="#0D0F14"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M23.8 21.3C25.5 17.4 28.8 15.5 32.5 16.3"
              stroke="#0D0F14"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            <path
              d="M23.7 21.7C27.2 19.8 31.1 20.2 34.2 22.6"
              stroke="#0D0F14"
              strokeWidth="1.85"
              strokeLinecap="round"
            />
            <path
              d="M23.6 21.9C26.2 22.6 28.4 24.4 29.8 26.8"
              stroke="#0D0F14"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>

          {/* Specular Apple Glass Border */}
          <rect
            x="1"
            y="1"
            width="46"
            height="46"
            rx="12"
            stroke={`url(#${rimGradId})`}
            strokeWidth="1.15"
          />
        </svg>
      </div>

      {/* Typography Wordmark */}
      <div className="min-w-0 leading-none">
        <div
          className={`font-bold tracking-[-0.03em] text-white whitespace-nowrap ${
            isCompact ? 'text-[14px]' : 'text-[16px]'
          }`}
        >
          LIFE IS GAME
        </div>
        <div
          className={`mt-1 font-semibold uppercase tracking-[0.18em] bg-gradient-to-r from-[#FF6B9D] via-[#FFB36B] to-[#5CE1E6] bg-clip-text text-transparent whitespace-nowrap ${
            isCompact ? 'text-[9px]' : 'text-[10px]'
          }`}
        >
          ЖИЗНЬ — ЭТО ИГРА
        </div>
      </div>
    </div>
  );
};
