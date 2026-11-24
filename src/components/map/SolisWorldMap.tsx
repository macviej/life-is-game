import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Compass,
  Crosshair,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { EXERCISES } from '../../data/exercises';
import {
  LifeMission,
  Mission,
  MissionGroup,
  MissionGroupId,
  MissionMapPin,
} from '../../types/game';

export interface SolisWorldMapProps {
  onOpenMissionInHub?: (missionId: string) => void;
  onOpenCreateMission?: () => void;
}

type MapMarkerItem =
  | {
      kind: 'life';
      key: string;
      id: string;
      mission: LifeMission;
      groupId: MissionGroupId;
      code: string;
      color: string;
      title: string;
      subtitle: string;
      virtualX: number;
      virtualY: number;
      lat?: number;
      lng?: number;
      placeName: string;
      districtLabel?: string;
      isBig: boolean;
    }
  | {
      kind: 'fitness';
      key: string;
      id: string;
      mission: Mission;
      groupId: 'fitness';
      code: string;
      color: string;
      title: string;
      subtitle: string;
      virtualX: number;
      virtualY: number;
      lat?: number;
      lng?: number;
      placeName: string;
      districtLabel?: string;
      isBig: boolean;
    };

interface DistrictAnchor {
  name: string;
  x: number;
  y: number;
  tag: string;
}

const DEFAULT_REAL_CENTER = { lat: 25.7617, lng: -80.1918 };

const SOLIS_DISTRICTS: DistrictAnchor[] = [
  { name: 'Убежище на холме', x: 20, y: 24, tag: 'NORTH HILLS' },
  { name: 'Маркет-Бэй', x: 50, y: 22, tag: 'BAYSIDE' },
  { name: 'Даунтаун Солис', x: 37, y: 50, tag: 'FINANCIAL' },
  { name: 'Променад Палм', x: 58, y: 55, tag: 'BOULEVARD' },
  { name: 'Закатный Пляж', x: 83, y: 44, tag: 'OCEANFRONT' },
  { name: 'Порт-Солис', x: 64, y: 80, tag: 'HARBOR' },
];

const FITNESS_SOLIS_SPOTS: Array<{
  virtualX: number;
  virtualY: number;
  placeName: string;
  districtLabel: string;
}> = [
  {
    virtualX: 83,
    virtualY: 41,
    placeName: 'Турники Закатного Пляжа',
    districtLabel: 'Закатный Пляж',
  },
  {
    virtualX: 59,
    virtualY: 53,
    placeName: 'Воркаут-парк Променада',
    districtLabel: 'Променад Палм',
  },
  {
    virtualX: 50,
    virtualY: 25,
    placeName: 'Площадка у залива',
    districtLabel: 'Маркет-Бэй',
  },
  {
    virtualX: 21,
    virtualY: 27,
    placeName: 'Дворовый турник у холма',
    districtLabel: 'Убежище на холме',
  },
  {
    virtualX: 38,
    virtualY: 49,
    placeName: 'Спортивная арена Солис',
    districtLabel: 'Даунтаун Солис',
  },
];

const FALLBACK_GROUP_META: Record<
  string,
  { name: string; color: string; mapMarkerCode: string }
> = {
  fitness: { name: 'Фитнес', color: '#00F5D4', mapMarkerCode: 'F' },
  shopping: { name: 'Магазин', color: '#FFB703', mapMarkerCode: '$' },
  home_repair: { name: 'Ремонт', color: '#FF7A45', mapMarkerCode: 'R' },
  home_life: { name: 'Дом и быт', color: '#A78BFA', mapMarkerCode: 'H' },
  work_hustle: { name: 'Работа', color: '#38BDF8', mapMarkerCode: 'W' },
  learning: { name: 'Развитие', color: '#C084FC', mapMarkerCode: 'L' },
  social: { name: 'Люди и город', color: '#FF2A85', mapMarkerCode: 'S' },
  health_routine: { name: 'Здоровье', color: '#30D158', mapMarkerCode: '♥' },
  finance: { name: 'Финансы', color: '#34D399', mapMarkerCode: 'B' },
  street_events: { name: 'Уличные события', color: '#FF2A85', mapMarkerCode: '?' },
};

const LEAFLET_CUSTOM_CSS = `
  .solis-leaflet-map .leaflet-tile-pane {
    filter: brightness(0.95) contrast(1.08) saturate(1.18);
  }
  .solis-leaflet-map .leaflet-control-attribution {
    background: rgba(14, 15, 17, 0.72) !important;
    color: rgba(142, 144, 152, 0.85) !important;
    font-size: 10px !important;
    border-top-left-radius: 8px;
    padding: 2px 6px !important;
  }
  .solis-leaflet-map .leaflet-control-attribution a {
    color: rgba(229, 163, 189, 0.85) !important;
  }
  .solis-map-div-icon {
    background: transparent !important;
    border: none !important;
  }
  @keyframes solisMarkerPulse {
    0%, 100% { transform: scale(1); opacity: 0.7; }
    50% { transform: scale(1.45); opacity: 0; }
  }
  @keyframes solisFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .solis-marker-pulse {
    animation: solisMarkerPulse 2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }
  .solis-sheet-enter {
    animation: solisFadeIn 0.18s ease-out both;
  }
`;

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getDeterministicVirtualCoords(seedId: string): { x: number; y: number } {
  const h = hashSeed(seedId);
  const x = 16 + (h % 68); // 16..83%
  const y = 18 + ((h >> 8) % 64); // 18..81%
  return { x, y };
}

function resolveNearestDistrict(vx: number, vy: number): string {
  let best = SOLIS_DISTRICTS[0];
  let bestDist = Infinity;
  for (const d of SOLIS_DISTRICTS) {
    const dist = Math.hypot(d.x - vx, d.y - vy);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best.name;
}

function resolveRealLatLng(
  item: { virtualX: number; virtualY: number; lat?: number; lng?: number },
  baseCenter: { lat: number; lng: number }
): [number, number] {
  if (typeof item.lat === 'number' && typeof item.lng === 'number') {
    return [item.lat, item.lng];
  }
  // Spread markers realistically (~1.5–2km radius) around userLocation or default center
  const latOffset = ((50 - item.virtualY) / 50) * 0.016;
  const lngOffset = ((item.virtualX - 50) / 50) * 0.022;
  return [baseCenter.lat + latOffset, baseCenter.lng + lngOffset];
}

function getGroupMeta(
  groupId: MissionGroupId,
  missionGroups: MissionGroup[]
): { name: string; color: string; mapMarkerCode: string } {
  const found = missionGroups.find((g) => g.id === groupId);
  if (found) {
    return {
      name: found.name,
      color: found.color,
      mapMarkerCode: found.mapMarkerCode,
    };
  }
  return (
    FALLBACK_GROUP_META[groupId] ?? {
      name: 'Миссия',
      color: '#E5A3BD',
      mapMarkerCode: 'M',
    }
  );
}

function selectKeyFitnessMissions(
  missions: Mission[],
  activeMissionId: string | null,
  plannedMissionId: string | null
): Mission[] {
  const unlocked = missions.filter((m) => m.isUnlocked);
  if (unlocked.length === 0) return [];

  const picked: Mission[] = [];
  const seen = new Set<string>();
  const addIfFound = (m?: Mission) => {
    if (m && !seen.has(m.id) && picked.length < 5) {
      seen.add(m.id);
      picked.push(m);
    }
  };

  addIfFound(unlocked.find((m) => m.id === activeMissionId));
  addIfFound(unlocked.find((m) => m.id === plannedMissionId));
  addIfFound(unlocked.find((m) => m.type === 'boss_fight'));
  addIfFound(unlocked.find((m) => m.type === 'strangers_and_freaks'));

  for (const m of unlocked) {
    if (picked.length >= 5) break;
    if (m.type === 'main_campaign' || m.type === 'parallel_side') {
      addIfFound(m);
    }
  }
  for (const m of unlocked) {
    if (picked.length >= 5) break;
    addIfFound(m);
  }
  return picked;
}

const SolisCoastSvg: React.FC = () => (
  <svg
    viewBox="0 0 1000 700"
    className="w-full h-full select-none block"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="solisOceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#050814" />
        <stop offset="55%" stopColor="#081426" />
        <stop offset="100%" stopColor="#0B1E36" />
      </linearGradient>
      <radialGradient id="solisSunsetGlow" cx="88%" cy="14%" r="55%">
        <stop offset="0%" stopColor="#FF2A85" stopOpacity="0.24" />
        <stop offset="45%" stopColor="#FF7A45" stopOpacity="0.10" />
        <stop offset="100%" stopColor="#050814" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="solisMainlandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#141720" />
        <stop offset="100%" stopColor="#1A1E29" />
      </linearGradient>
      <linearGradient id="solisSandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#26212C" />
        <stop offset="100%" stopColor="#1E202B" />
      </linearGradient>
      <linearGradient id="solisHighwayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFB703" />
        <stop offset="55%" stopColor="#FF7A45" />
        <stop offset="100%" stopColor="#FF2A85" />
      </linearGradient>
      <filter id="solisNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <pattern id="solisCityGrid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path
          d="M 24 0 L 0 0 0 24"
          fill="none"
          stroke="rgba(255,255,255,0.045)"
          strokeWidth="1"
        />
      </pattern>
      <pattern id="solisWaterGrid" width="60" height="60" patternUnits="userSpaceOnUse">
        <path
          d="M 60 0 L 0 0 0 60"
          fill="none"
          stroke="rgba(0,245,212,0.035)"
          strokeWidth="1"
        />
      </pattern>
    </defs>

    {/* Deep Night Ocean + Sunset Atmospheric Wash */}
    <rect width="1000" height="700" fill="url(#solisOceanGrad)" />
    <rect width="1000" height="700" fill="url(#solisWaterGrid)" />
    <rect width="1000" height="700" fill="url(#solisSunsetGlow)" />

    {/* Bathymetry Contour Ripples */}
    <path
      d="M 730 0 C 700 170, 740 310, 700 460 C 670 570, 720 650, 770 700"
      fill="none"
      stroke="rgba(0,245,212,0.09)"
      strokeWidth="1.5"
      strokeDasharray="6 8"
    />
    <path
      d="M 905 0 C 890 190, 920 350, 880 510 C 855 610, 890 670, 925 700"
      fill="none"
      stroke="rgba(255,42,133,0.12)"
      strokeWidth="1.5"
      strokeDasharray="8 10"
    />

    {/* Mainland West & North Coastline */}
    <path
      d="M 0 0 L 660 0 C 655 75, 620 120, 585 165 C 565 190, 585 245, 565 295 C 545 340, 610 385, 635 435 C 655 475, 615 535, 560 575 C 510 612, 470 655, 455 700 L 0 700 Z"
      fill="url(#solisMainlandGrad)"
      stroke="#00F5D4"
      strokeOpacity="0.48"
      strokeWidth="2.5"
      filter="url(#solisNeonGlow)"
    />
    {/* Urban Block Grid clipped visually over Mainland */}
    <path
      d="M 0 0 L 660 0 C 655 75, 620 120, 585 165 C 565 190, 585 245, 565 295 C 545 340, 610 385, 635 435 C 655 475, 615 535, 560 575 C 510 612, 470 655, 455 700 L 0 700 Z"
      fill="url(#solisCityGrid)"
    />

    {/* Hideout Hill Topographic Contours (NW) */}
    <g stroke="rgba(167,139,250,0.22)" fill="none" strokeWidth="1.2">
      <ellipse cx="195" cy="165" rx="115" ry="72" />
      <ellipse cx="195" cy="165" rx="82" ry="50" />
      <ellipse cx="195" cy="165" rx="48" ry="28" />
    </g>

    {/* Green Parks (Market Bay & Palm Promenade) */}
    <rect x="445" y="135" width="76" height="44" rx="12" fill="#132A24" stroke="#30D158" strokeOpacity="0.35" />
    <rect x="510" y="370" width="74" height="52" rx="14" fill="#132A24" stroke="#30D158" strokeOpacity="0.35" />
    <rect x="285" y="305" width="54" height="36" rx="10" fill="#132A24" stroke="#30D158" strokeOpacity="0.30" />

    {/* Venetian Lagoon Islands inside Solis Bay */}
    <ellipse
      cx="695"
      cy="265"
      rx="32"
      ry="18"
      fill="#1A202E"
      stroke="#00F5D4"
      strokeOpacity="0.45"
      strokeWidth="1.5"
    />
    <ellipse
      cx="732"
      cy="375"
      rx="26"
      ry="15"
      fill="#1A202E"
      stroke="#00F5D4"
      strokeOpacity="0.45"
      strokeWidth="1.5"
    />

    {/* Sunset Beach Barrier Island (East) */}
    <path
      d="M 795 48 C 835 42, 872 62, 878 105 C 885 165, 868 250, 875 335 C 882 405, 862 475, 830 515 C 805 545, 772 525, 776 485 C 782 425, 795 360, 788 280 C 782 215, 768 145, 778 88 C 782 65, 788 50, 795 48 Z"
      fill="url(#solisSandGrad)"
      stroke="#FF2A85"
      strokeOpacity="0.55"
      strokeWidth="2.5"
      filter="url(#solisNeonGlow)"
    />
    <path
      d="M 795 48 C 835 42, 872 62, 878 105 C 885 165, 868 250, 875 335 C 882 405, 862 475, 830 515 C 805 545, 772 525, 776 485 C 782 425, 795 360, 788 280 C 782 215, 768 145, 778 88 C 782 65, 788 50, 795 48 Z"
      fill="url(#solisCityGrid)"
    />

    {/* Port Solis Harbor Island (South-East) */}
    <path
      d="M 565 540 L 725 535 L 745 582 L 718 618 L 690 618 L 690 595 L 662 595 L 662 626 L 615 626 L 615 596 L 584 596 L 560 572 Z"
      fill="#181C26"
      stroke="#FFB703"
      strokeOpacity="0.5"
      strokeWidth="2"
      filter="url(#solisNeonGlow)"
    />

    {/* Bridges & Causeways */}
    <g strokeLinecap="round">
      {/* North Bay Causeway */}
      <line x1="570" y1="255" x2="788" y2="268" stroke="#00F5D4" strokeOpacity="0.55" strokeWidth="5" />
      <line x1="570" y1="255" x2="788" y2="268" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="6 6" />

      {/* Central Palm Causeway */}
      <line x1="628" y1="425" x2="795" y2="365" stroke="#FF2A85" strokeOpacity="0.6" strokeWidth="5" />
      <line x1="628" y1="425" x2="795" y2="365" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="6 6" />

      {/* Port Solis Bridge */}
      <line x1="535" y1="588" x2="578" y2="564" stroke="#FFB703" strokeOpacity="0.7" strokeWidth="6" />
    </g>

    {/* Major Avenues & City Arteries */}
    <g stroke="rgba(255,255,255,0.14)" strokeWidth="2.5" fill="none" strokeLinecap="round">
      <path d="M 105 160 L 420 190 L 580 255" />
      <path d="M 80 340 L 380 345 L 628 425" />
      <path d="M 110 490 L 395 490 L 555 555" />
      <path d="M 828 78 L 832 280 L 814 495" stroke="rgba(255,42,133,0.35)" strokeWidth="3" />
    </g>

    {/* Highway 95 (Шоссе 95) */}
    <path
      d="M 275 0 C 282 120, 260 220, 290 335 C 315 430, 300 560, 270 700"
      fill="none"
      stroke="url(#solisHighwayGrad)"
      strokeWidth="6"
      strokeOpacity="0.82"
      strokeLinecap="round"
    />
    <path
      d="M 275 0 C 282 120, 260 220, 290 335 C 315 430, 300 560, 270 700"
      fill="none"
      stroke="#111214"
      strokeWidth="1.4"
      strokeDasharray="8 8"
    />
    {/* Highway 95 Interchange Ring */}
    <circle cx="290" cy="342" r="14" fill="#181A22" stroke="#FFB703" strokeWidth="3" />
    {/* Highway 95 Shield Badge */}
    <g transform="translate(242, 428)">
      <rect x="0" y="0" width="52" height="22" rx="6" fill="#111214" stroke="#FFB703" strokeOpacity="0.8" strokeWidth="1.3" />
      <text
        x="26"
        y="15"
        textAnchor="middle"
        fill="#FFB703"
        fontSize="10"
        fontWeight="700"
        fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
      >
        ШОССЕ 95
      </text>
    </g>

    {/* District Labels */}
    {SOLIS_DISTRICTS.map((d) => {
      const cx = (d.x / 100) * 1000;
      const cy = (d.y / 100) * 700;
      return (
        <g key={d.name} transform={`translate(${cx}, ${cy})`} className="pointer-events-none">
          <text
            x="0"
            y="-10"
            textAnchor="middle"
            fill="rgba(255,255,255,0.28)"
            fontSize="9"
            fontWeight="700"
            letterSpacing="2.2"
          >
            {d.tag}
          </text>
          <text
            x="0"
            y="6"
            textAnchor="middle"
            fill="rgba(243,244,246,0.72)"
            fontSize="14"
            fontWeight="700"
            stroke="#080B14"
            strokeWidth="4"
            paintOrder="stroke"
          >
            {d.name}
          </text>
        </g>
      );
    })}

    {/* Ocean Watermark */}
    <text
      x="915"
      y="625"
      textAnchor="end"
      fill="rgba(0,245,212,0.18)"
      fontSize="16"
      fontWeight="700"
      letterSpacing="5"
    >
      SOLIS OCEAN
    </text>
    <text
      x="690"
      y="465"
      textAnchor="middle"
      fill="rgba(0,245,212,0.22)"
      fontSize="11"
      fontWeight="600"
      letterSpacing="3.5"
    >
      ЗАЛИВ СОЛИС
    </text>
  </svg>
);

interface MarkerBottomSheetProps {
  marker: MapMarkerItem;
  groupName: string;
  onClose: () => void;
  onToggleSubMission: (missionId: string, subMissionId: string) => void;
  onCompleteLifeMission: (missionId: string) => void;
  onStartFitnessMission: (missionId: string) => void;
  onOpenMissionInHub?: (missionId: string) => void;
  onMovePin: (missionId: string) => void;
}

const MarkerBottomSheet: React.FC<MarkerBottomSheetProps> = ({
  marker,
  groupName,
  onClose,
  onToggleSubMission,
  onCompleteLifeMission,
  onStartFitnessMission,
  onOpenMissionInHub,
  onMovePin,
}) => {
  const isLife = marker.kind === 'life';
  const lifeMission = isLife ? marker.mission : null;
  const fitnessMission = !isLife ? marker.mission : null;

  const doneSubs = lifeMission
    ? lifeMission.subMissions.filter((s) => s.completed).length
    : 0;
  const totalSubs = lifeMission ? lifeMission.subMissions.length : 0;
  const progressPct = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 100;

  const rewardXp = lifeMission
    ? lifeMission.rewardRespect
    : fitnessMission?.rewards.respectXp ?? 0;
  const rewardCash = lifeMission
    ? lifeMission.rewardCash
    : fitnessMission?.rewards.cash ?? 0;
  const rewardHp = lifeMission
    ? lifeMission.rewardHealth
    : fitnessMission?.rewards.healthBonus ?? 0;

  const quote = lifeMission?.jokeQuote || fitnessMission?.briefingQuote;

  return (
    <div
      className="solis-sheet-enter absolute inset-x-3 bottom-3 md:inset-x-auto md:left-4 md:bottom-4 md:w-[410px] z-[600]"
      role="dialog"
      aria-label={marker.title}
    >
      <div className="apple-liquid-glass rounded-[24px] p-4 md:p-5 max-h-[58vh] overflow-y-auto space-y-3.5">
        {/* Top Row: Badge + Location + Close */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-9 h-9 rounded-[12px] shrink-0 flex items-center justify-center text-[14px] font-bold text-[#0E0F11] shadow-md"
              style={{ backgroundColor: marker.color }}
            >
              {marker.code}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.06em]"
                  style={{ color: marker.color }}
                >
                  {groupName}
                </span>
                {marker.isBig && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FF2A85]/20 text-[#FF7AB4] text-[10px] font-semibold">
                    <Sparkles className="w-2.5 h-2.5" />
                    Крупная
                  </span>
                )}
              </div>
              <div className="text-[12px] text-[#98989F] truncate">
                {marker.districtLabel
                  ? `${marker.districtLabel} · ${marker.placeName}`
                  : marker.placeName}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть карточку миссии"
            className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] flex items-center justify-center text-[#98989F] hover:text-white transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Quote */}
        <div>
          <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-white leading-snug">
            {marker.title}
          </h3>
          {marker.subtitle && (
            <p className="mt-0.5 text-[13px] text-[#98989F] leading-snug">
              {marker.subtitle}
            </p>
          )}
          {quote && (
            <div className="mt-2.5 px-3 py-2 rounded-[14px] bg-white/[0.05] border border-white/[0.07] text-[12px] text-[#D1D5DB] italic leading-relaxed">
              «{quote}»
            </div>
          )}
        </div>

        {/* LifeMission Submissions Checklist */}
        {lifeMission && totalSubs > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[#98989F] font-medium">Чеклист миссии</span>
              <span className="text-white font-semibold tabular-nums">
                {doneSubs} / {totalSubs} ({progressPct}%)
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: marker.color,
                }}
              />
            </div>

            <div className="divide-y divide-white/[0.07] rounded-[16px] bg-[#16171B]/80 border border-white/[0.07] overflow-hidden max-h-[168px] overflow-y-auto">
              {lifeMission.subMissions.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onToggleSubMission(lifeMission.id, sub.id)}
                  className="w-full px-3 py-2.5 flex items-center gap-2.5 text-left hover:bg-white/[0.04] active:bg-white/[0.07] transition"
                >
                  {sub.completed ? (
                    <CheckCircle2
                      className="w-4 h-4 shrink-0"
                      style={{ color: marker.color }}
                    />
                  ) : (
                    <Circle className="w-4 h-4 text-[#636366] shrink-0" />
                  )}
                  <span
                    className={`flex-1 text-[13px] leading-snug ${
                      sub.completed ? 'line-through text-[#636366]' : 'text-white'
                    }`}
                  >
                    {sub.title}
                  </span>
                  {sub.quantity && (
                    <span className="text-[11px] font-medium text-[#98989F] bg-white/[0.06] px-2 py-0.5 rounded-full tabular-nums shrink-0">
                      {sub.quantity}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fitness Mission Tasks Preview */}
        {fitnessMission && (
          <div className="rounded-[16px] bg-[#16171B]/80 border border-white/[0.07] divide-y divide-white/[0.07] overflow-hidden">
            {fitnessMission.tasks.slice(0, 3).map((t, idx) => {
              const ex = EXERCISES[t.exerciseId];
              const unitLabel =
                ex?.unit === 'seconds' ? 'сек' : ex?.unit === 'meters' ? 'м' : 'повт.';
              return (
                <div
                  key={`${t.exerciseId}_${idx}`}
                  className="px-3 py-2 flex items-center justify-between gap-2 text-[13px]"
                >
                  <span className="text-white truncate">
                    {ex?.name ?? t.exerciseId}
                  </span>
                  <span className="text-[12px] text-[#98989F] tabular-nums shrink-0">
                    {t.sets} × {t.targetPerSet} {unitLabel}
                  </span>
                </div>
              );
            })}
            {fitnessMission.tasks.length > 3 && (
              <div className="px-3 py-1.5 text-[11px] text-[#98989F]">
                + ещё {fitnessMission.tasks.length - 3} упр.
              </div>
            )}
          </div>
        )}

        {/* Rewards Strip */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-full bg-[#00F5D4]/12 border border-[#00F5D4]/25 text-[#00F5D4] text-[12px] font-semibold tabular-nums">
            +{rewardXp} XP
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[#FFB703]/12 border border-[#FFB703]/25 text-[#FFB703] text-[12px] font-semibold tabular-nums">
            +${rewardCash}
          </span>
          {rewardHp > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-[#30D158]/12 border border-[#30D158]/25 text-[#30D158] text-[12px] font-semibold tabular-nums">
              +{rewardHp} HP
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          {lifeMission ? (
            <>
              <button
                type="button"
                onClick={() => onCompleteLifeMission(lifeMission.id)}
                className="flex-1 h-10 px-4 rounded-[14px] apple-sunset-cta font-semibold text-[13px] inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
              >
                <Check className="w-4 h-4" />
                <span>Выполнить миссию</span>
              </button>
              {onOpenMissionInHub && (
                <button
                  type="button"
                  onClick={() => onOpenMissionInHub(lifeMission.id)}
                  className="h-10 px-3.5 rounded-[14px] bg-white/[0.08] hover:bg-white/[0.14] text-white text-[13px] font-medium inline-flex items-center gap-1.5 active:scale-[0.98] transition"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#E5A3BD]" />
                  <span>Чеклист</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onMovePin(lifeMission.id)}
                title="Переместить точку на карте"
                aria-label="Переместить точку на карте"
                className="h-10 w-10 rounded-[14px] bg-white/[0.08] hover:bg-white/[0.14] text-[#98989F] hover:text-white flex items-center justify-center active:scale-[0.98] transition shrink-0"
              >
                <MapPin className="w-4 h-4" />
              </button>
            </>
          ) : fitnessMission ? (
            <button
              type="button"
              onClick={() => onStartFitnessMission(fitnessMission.id)}
              className="flex-1 h-10 px-4 rounded-[14px] apple-sunset-cta font-semibold text-[13px] inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Начать тренировку</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const SolisWorldMap: React.FC<SolisWorldMapProps> = ({
  onOpenMissionInHub,
  onOpenCreateMission,
}) => {
  const {
    state,
    now,
    startMission,
    completeLifeMission,
    toggleLifeSubMission,
    setLifeMissionMapPin,
    setMapMode,
    setUserLocation,
  } = useGame();

  const mapMode = state.mapMode ?? 'solis';
  const missionGroups = state.missionGroups ?? [];
  const lifeMissions = state.lifeMissions ?? [];

  const [selectedGroupFilter, setSelectedGroupFilter] = useState<'all' | MissionGroupId>('all');
  const [selectedMarkerKey, setSelectedMarkerKey] = useState<string | null>(null);

  // Pin-placement mode
  const [isPinMode, setIsPinMode] = useState(false);
  const [pinTargetMissionId, setPinTargetMissionId] = useState<string>('');
  const [pinConfirmText, setPinConfirmText] = useState<string | null>(null);

  // Geolocation state & smart fallback banner
  const [isLocating, setIsLocating] = useState(false);
  const [geoBanner, setGeoBanner] = useState<string | null>(null);
  const hasAttemptedAutoGeoRef = useRef(false);

  // Leaflet refs
  const leafletContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationRef = useRef(state.userLocation);
  userLocationRef.current = state.userLocation;

  // Solis Coast interactive pan & zoom state
  const solisViewportRef = useRef<HTMLDivElement | null>(null);
  const solisStageRef = useRef<HTMLDivElement | null>(null);
  const [solisZoom, setSolisZoom] = useState(1);
  const [solisPan, setSolisPan] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef<{
    dragging: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ dragging: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const activeLifeMissions = useMemo(
    () => lifeMissions.filter((m) => m.status === 'active'),
    [lifeMissions]
  );

  // Keep pin target synchronized with available active life missions
  useEffect(() => {
    if (activeLifeMissions.length === 0) {
      setPinTargetMissionId('');
      return;
    }
    if (!activeLifeMissions.some((m) => m.id === pinTargetMissionId)) {
      setPinTargetMissionId(activeLifeMissions[0].id);
    }
  }, [activeLifeMissions, pinTargetMissionId]);

  // Planned fitness mission for today
  const plannedFitnessMissionId = useMemo(() => {
    const schedule = state.activePlan?.weeklySchedule ?? [];
    const jsDay = new Date(now).getDay();
    const idx = jsDay === 0 ? 6 : jsDay - 1;
    return schedule[idx]?.primaryMissionId ?? null;
  }, [state.activePlan?.weeklySchedule, now]);

  // Build unified markers list (active lifeMissions + key fitness missions)
  const allMarkers = useMemo<MapMarkerItem[]>(() => {
    const lifeItems: MapMarkerItem[] = activeLifeMissions.map((m) => {
      const group = getGroupMeta(m.groupId, missionGroups);
      const fallbackCoords = getDeterministicVirtualCoords(m.id);
      const vx = m.mapPin?.virtualX ?? fallbackCoords.x;
      const vy = m.mapPin?.virtualY ?? fallbackCoords.y;

      return {
        kind: 'life',
        key: `life:${m.id}`,
        id: m.id,
        mission: m,
        groupId: m.groupId,
        code: m.mapPin?.markerCode || group.mapMarkerCode,
        color: group.color,
        title: m.title,
        subtitle: m.subtitle,
        virtualX: vx,
        virtualY: vy,
        lat: m.mapPin?.lat,
        lng: m.mapPin?.lng,
        placeName: m.mapPin?.placeName || resolveNearestDistrict(vx, vy),
        districtLabel: m.mapPin?.districtLabel || resolveNearestDistrict(vx, vy),
        isBig: m.isBigMission,
      };
    });

    const fitnessMeta = getGroupMeta('fitness', missionGroups);
    const keyFitness = selectKeyFitnessMissions(
      state.missions,
      state.activeMissionId,
      plannedFitnessMissionId
    );
    const fitnessItems: MapMarkerItem[] = keyFitness.map((m, idx) => {
      const spot = FITNESS_SOLIS_SPOTS[idx % FITNESS_SOLIS_SPOTS.length];
      return {
        kind: 'fitness',
        key: `fitness:${m.id}`,
        id: m.id,
        mission: m,
        groupId: 'fitness',
        code: m.code || fitnessMeta.mapMarkerCode,
        color: fitnessMeta.color,
        title: m.title,
        subtitle: m.subtitle,
        virtualX: spot.virtualX,
        virtualY: spot.virtualY,
        placeName: spot.placeName,
        districtLabel: spot.districtLabel,
        isBig: m.type === 'boss_fight' || m.id === state.activeMissionId,
      };
    });

    return [...lifeItems, ...fitnessItems];
  }, [
    activeLifeMissions,
    missionGroups,
    state.missions,
    state.activeMissionId,
    plannedFitnessMissionId,
  ]);

  const filteredMarkers = useMemo(() => {
    if (selectedGroupFilter === 'all') return allMarkers;
    return allMarkers.filter((m) => m.groupId === selectedGroupFilter);
  }, [allMarkers, selectedGroupFilter]);

  const selectedMarker = useMemo(
    () => allMarkers.find((m) => m.key === selectedMarkerKey) ?? null,
    [allMarkers, selectedMarkerKey]
  );

  // Group chips with counts
  const filterChips = useMemo(() => {
    const counts = new Map<MissionGroupId, number>();
    for (const marker of allMarkers) {
      counts.set(marker.groupId, (counts.get(marker.groupId) ?? 0) + 1);
    }
    const groupIds = new Set<MissionGroupId>(['fitness']);
    for (const g of missionGroups) groupIds.add(g.id);
    for (const k of counts.keys()) groupIds.add(k);

    return Array.from(groupIds)
      .map((id) => ({
        id,
        ...getGroupMeta(id, missionGroups),
        count: counts.get(id) ?? 0,
      }))
      .filter((g) => g.count > 0 || g.id === selectedGroupFilter);
  }, [allMarkers, missionGroups, selectedGroupFilter]);

  // Geolocation handler with smart Solis Coast fallback
  const requestGeolocation = useCallback(
    (switchToRealOnSuccess = false) => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        setGeoBanner(
          'Геолокация недоступна в этом браузере — открыта карта побережья Solis Coast.'
        );
        setMapMode('solis');
        return;
      }

      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setIsLocating(false);
          setGeoBanner(null);
          setUserLocation(coords);
          if (switchToRealOnSuccess) {
            setMapMode('real');
          }
          if (leafletMapRef.current) {
            leafletMapRef.current.flyTo([coords.lat, coords.lng], 14, { duration: 0.9 });
          }
        },
        (err) => {
          setIsLocating(false);
          const message =
            err.code === 1
              ? 'Доступ к геолокации отклонён — мы переключили вас на карту Solis Coast.'
              : 'Не удалось определить геопозицию — мы переключили вас на карту Solis Coast.';
          setGeoBanner(message);
          setMapMode('solis');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    },
    [setMapMode, setUserLocation]
  );

  // Auto-request geolocation once if mounted directly in 'real' mode without userLocation
  useEffect(() => {
    if (mapMode === 'real' && !state.userLocation && !hasAttemptedAutoGeoRef.current) {
      hasAttemptedAutoGeoRef.current = true;
      requestGeolocation(false);
    }
  }, [mapMode, state.userLocation, requestGeolocation]);

  const handleSwitchMode = (nextMode: 'real' | 'solis') => {
    setMapMode(nextMode);
    if (nextMode === 'real' && !state.userLocation) {
      hasAttemptedAutoGeoRef.current = true;
      requestGeolocation(true);
    }
  };

  // Place pin helper (works for both Real Leaflet map & Solis Coast SVG)
  const applyPinForMission = useCallback(
    (
      missionId: string,
      coords: { lat?: number; lng?: number; virtualX?: number; virtualY?: number }
    ) => {
      const target = activeLifeMissions.find((m) => m.id === missionId);
      if (!target) return;
      const group = getGroupMeta(target.groupId, missionGroups);
      const fallback = getDeterministicVirtualCoords(target.id);
      const vx = Math.max(
        5,
        Math.min(95, Math.round((coords.virtualX ?? target.mapPin?.virtualX ?? fallback.x) * 10) / 10)
      );
      const vy = Math.max(
        7,
        Math.min(93, Math.round((coords.virtualY ?? target.mapPin?.virtualY ?? fallback.y) * 10) / 10)
      );

      const districtLabel =
        coords.virtualX != null && coords.virtualY != null
          ? resolveNearestDistrict(vx, vy)
          : target.mapPin?.districtLabel || 'Реальная точка';

      const placeName =
        coords.lat != null && coords.lng != null
          ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
          : districtLabel;

      const nextPin: MissionMapPin = {
        placeName,
        districtLabel,
        lat: coords.lat ?? target.mapPin?.lat,
        lng: coords.lng ?? target.mapPin?.lng,
        virtualX: vx,
        virtualY: vy,
        markerCode: target.mapPin?.markerCode || group.mapMarkerCode,
      };

      setLifeMissionMapPin(target.id, nextPin);
      setIsPinMode(false);
      setSelectedMarkerKey(`life:${target.id}`);
      setPinConfirmText(`Точка для «${target.title}» сохранена`);
    },
    [activeLifeMissions, missionGroups, setLifeMissionMapPin]
  );

  // Auto-hide pin confirmation pill
  useEffect(() => {
    if (!pinConfirmText) return;
    const t = window.setTimeout(() => setPinConfirmText(null), 2600);
    return () => window.clearTimeout(t);
  }, [pinConfirmText]);

  // Refs for Leaflet click handlers to avoid recreating the map instance
  const isPinModeRef = useRef(isPinMode);
  isPinModeRef.current = isPinMode;
  const pinTargetMissionIdRef = useRef(pinTargetMissionId);
  pinTargetMissionIdRef.current = pinTargetMissionId;
  const applyPinRef = useRef(applyPinForMission);
  applyPinRef.current = applyPinForMission;

  // Initialize & strictly clean up Leaflet map instance (React StrictMode safe)
  useEffect(() => {
    if (mapMode !== 'real') return;
    const container = leafletContainerRef.current;
    if (!container) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.off();
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
      leafletMarkersLayerRef.current = null;
    }

    const center = userLocationRef.current ?? DEFAULT_REAL_CENTER;
    const map = L.map(container, {
      center: [center.lat, center.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    leafletMapRef.current = map;
    leafletMarkersLayerRef.current = markersLayer;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!isPinModeRef.current || !pinTargetMissionIdRef.current) return;
      applyPinRef.current(pinTargetMissionIdRef.current, {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    });

    const timerId = window.setTimeout(() => {
      map.invalidateSize();
    }, 80);

    return () => {
      window.clearTimeout(timerId);
      map.off();
      map.remove();
      leafletMapRef.current = null;
      leafletMarkersLayerRef.current = null;
    };
  }, [mapMode]);

  // Sync Leaflet markers & user location pulse marker
  useEffect(() => {
    if (mapMode !== 'real') return;
    const layer = leafletMarkersLayerRef.current;
    const map = leafletMapRef.current;
    if (!layer || !map) return;

    layer.clearLayers();
    const baseCenter = state.userLocation ?? DEFAULT_REAL_CENTER;

    if (state.userLocation) {
      const playerIcon = L.divIcon({
        className: 'solis-map-div-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: `
          <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
            <span class="solis-marker-pulse" style="position:absolute;inset:0;border-radius:9999px;background:rgba(0,245,212,0.45);"></span>
            <span style="position:relative;width:14px;height:14px;border-radius:9999px;background:#00F5D4;border:2.5px solid #0E0F11;box-shadow:0 0 12px #00F5D4;"></span>
          </div>
        `,
      });
      L.marker([state.userLocation.lat, state.userLocation.lng], {
        icon: playerIcon,
        interactive: false,
      }).addTo(layer);
    }

    for (const item of filteredMarkers) {
      const [lat, lng] = resolveRealLatLng(item, baseCenter);
      const isSelected = item.key === selectedMarkerKey;
      const safeCode = escapeHtml(item.code);
      const safeTitle = escapeHtml(item.title);
      const ringHtml =
        item.isBig || isSelected
          ? `<span class="solis-marker-pulse" style="position:absolute;inset:-5px;border-radius:14px;border:2px solid ${item.color};"></span>`
          : '';

      const icon = L.divIcon({
        className: 'solis-map-div-icon',
        iconSize: [140, 58],
        iconAnchor: [70, 22],
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;pointer-events:${
            isPinMode ? 'none' : 'auto'
          };cursor:pointer;">
            <div style="position:relative;width:36px;height:36px;border-radius:12px;background:${
              item.color
            };color:#0E0F11;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;border:2px solid ${
              isSelected ? '#FFFFFF' : '#0E0F11'
            };box-shadow:0 6px 18px rgba(0,0,0,0.65),0 0 14px ${item.color}66;transform:${
              isSelected ? 'scale(1.12)' : 'scale(1)'
            };transition:transform 0.15s ease;">
              ${ringHtml}
              <span style="position:relative;z-index:1;">${safeCode}</span>
            </div>
            <div style="margin-top:4px;max-width:136px;padding:2px 7px;border-radius:9999px;background:rgba(14,15,17,0.86);border:1px solid rgba(255,255,255,0.14);color:#F3F4F6;font-size:10px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
              ${safeTitle}
            </div>
          </div>
        `,
      });

      const marker = L.marker([lat, lng], {
        icon,
        interactive: !isPinMode,
      });

      marker.on('click', () => {
        if (isPinModeRef.current) return;
        setSelectedMarkerKey(item.key);
      });

      marker.addTo(layer);
    }
  }, [mapMode, filteredMarkers, selectedMarkerKey, state.userLocation, isPinMode]);

  // Solis Coast pan/zoom handlers
  const handleSolisZoom = (delta: number) => {
    setSolisZoom((prev) => {
      const next = Math.max(1, Math.min(2.4, Math.round((prev + delta) * 100) / 100));
      if (next === 1) setSolisPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleSolisPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragStateRef.current = {
      dragging: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: solisPan.x,
      originY: solisPan.y,
    };
  };

  const handleSolisPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.dragging) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    if (Math.hypot(dx, dy) > 6) {
      dragStateRef.current.moved = true;
    }
    if (!dragStateRef.current.moved) return;

    const vp = solisViewportRef.current;
    const stage = solisStageRef.current;
    const vpW = vp?.clientWidth ?? 0;
    const vpH = vp?.clientHeight ?? 0;
    const stageW = (stage?.offsetWidth ?? vpW) * solisZoom;
    const stageH = (stage?.offsetHeight ?? vpH) * solisZoom;
    const maxOffsetX = Math.max(0, (stageW - vpW) / 2 + 24);
    const maxOffsetY = Math.max(0, (stageH - vpH) / 2 + 24);
    if (maxOffsetX === 0 && maxOffsetY === 0) return;

    setSolisPan({
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, dragStateRef.current.originX + dx)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, dragStateRef.current.originY + dy)),
    });
  };

  const handleSolisPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasMoved = dragStateRef.current.moved;
    dragStateRef.current.dragging = false;

    if (wasMoved || !isPinMode || !pinTargetMissionId) return;
    const stage = solisStageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const vx = ((e.clientX - rect.left) / rect.width) * 100;
    const vy = ((e.clientY - rect.top) / rect.height) * 100;

    applyPinForMission(pinTargetMissionId, {
      virtualX: vx,
      virtualY: vy,
    });
  };

  const handleZoomControl = (delta: number) => {
    if (mapMode === 'real' && leafletMapRef.current) {
      if (delta > 0) leafletMapRef.current.zoomIn();
      else leafletMapRef.current.zoomOut();
    } else {
      handleSolisZoom(delta * 0.3);
    }
  };

  const handleResetView = () => {
    if (mapMode === 'real' && leafletMapRef.current) {
      const target = state.userLocation ?? DEFAULT_REAL_CENTER;
      leafletMapRef.current.flyTo([target.lat, target.lng], 14, { duration: 0.7 });
    } else {
      setSolisZoom(1);
      setSolisPan({ x: 0, y: 0 });
    }
  };

  const handleEnterPinModeForMission = (missionId: string) => {
    setPinTargetMissionId(missionId);
    setSelectedMarkerKey(null);
    setIsPinMode(true);
  };

  const togglePinMode = () => {
    if (isPinMode) {
      setIsPinMode(false);
      return;
    }
    setSelectedMarkerKey(null);
    setIsPinMode(true);
  };

  return (
    <section
      aria-label="Интерактивная карта миссий Solis"
      className="relative w-full h-[calc(100vh-146px)] min-h-[520px] lg:h-[calc(100vh-48px)] rounded-[24px] overflow-hidden border border-white/[0.1] bg-[#060913] shadow-2xl"
    >
      <style>{LEAFLET_CUSTOM_CSS}</style>

      {/* MAP CANVAS LAYER */}
      {mapMode === 'real' ? (
        <div
          ref={leafletContainerRef}
          className={`solis-leaflet-map absolute inset-0 w-full h-full z-0 ${
            isPinMode ? 'cursor-crosshair' : ''
          }`}
        />
      ) : (
        <div
          ref={solisViewportRef}
          onPointerDown={handleSolisPointerDown}
          onPointerMove={handleSolisPointerMove}
          onPointerUp={handleSolisPointerUp}
          onPointerCancel={() => {
            dragStateRef.current.dragging = false;
          }}
          className={`absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center bg-[#050814] touch-none ${
            isPinMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
          }`}
        >
          <div
            ref={solisStageRef}
            className="relative shrink-0 w-[840px] lg:w-[max(100%,1020px)] aspect-[10/7] transition-transform duration-150 ease-out"
            style={{
              transform: `translate3d(${solisPan.x}px, ${solisPan.y}px, 0) scale(${solisZoom})`,
            }}
          >
            <SolisCoastSvg />

            {/* Interactive Solis Coast GTA Markers */}
            {filteredMarkers.map((item) => {
              const isSelected = item.key === selectedMarkerKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPinMode) return;
                    setSelectedMarkerKey(item.key);
                  }}
                  style={{
                    left: `${item.virtualX}%`,
                    top: `${item.virtualY}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center group focus:outline-none ${
                    isPinMode ? 'pointer-events-none opacity-65' : 'pointer-events-auto'
                  }`}
                  aria-label={`${item.title} (${item.placeName})`}
                >
                  <span
                    className={`relative w-9 h-9 rounded-[12px] flex items-center justify-center text-[13px] font-extrabold text-[#0E0F11] border-2 transition-transform ${
                      isSelected
                        ? 'scale-[1.14] border-white'
                        : 'border-[#0E0F11] group-hover:scale-110'
                    }`}
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 6px 18px rgba(0,0,0,0.65), 0 0 16px ${item.color}66`,
                    }}
                  >
                    {(item.isBig || isSelected) && (
                      <span
                        className="solis-marker-pulse absolute -inset-1.5 rounded-[15px] border-2 pointer-events-none"
                        style={{ borderColor: item.color }}
                      />
                    )}
                    <span className="relative z-10">{item.code}</span>
                  </span>

                  <span className="mt-1 max-w-[126px] px-2 py-0.5 rounded-full bg-[#0E0F11]/88 border border-white/[0.14] text-[10px] font-semibold text-[#F3F4F6] truncate shadow-md">
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Subtle top-edge gradient vignette for HUD legibility */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#060913]/80 via-[#060913]/30 to-transparent z-[400]" />

      {/* TOP HUD: Mode Toggle + Actions + Group Filters */}
      <div className="absolute inset-x-3 top-3 md:inset-x-4 md:top-4 z-[500] space-y-2 pointer-events-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* 1-Click Mode Switcher */}
          <div className="pointer-events-auto apple-liquid-glass rounded-full p-1 inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSwitchMode('real')}
              className={`h-8 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 transition ${
                mapMode === 'real'
                  ? 'apple-pill-active text-white'
                  : 'text-[#98989F] hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-[#00F5D4]" />
              <span>Реальная карта</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('solis')}
              className={`h-8 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 transition ${
                mapMode === 'solis'
                  ? 'apple-pill-active text-white'
                  : 'text-[#98989F] hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-[#FF2A85]" />
              <span>Solis Coast</span>
            </button>
          </div>

          {/* Right Action Controls */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => requestGeolocation(true)}
              disabled={isLocating}
              className="h-9 px-3 rounded-full apple-liquid-glass text-[12px] font-semibold text-white inline-flex items-center gap-1.5 hover:bg-white/[0.12] active:scale-95 transition disabled:opacity-60"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 text-[#00F5D4] animate-spin" />
              ) : (
                <Crosshair className="w-3.5 h-3.5 text-[#00F5D4]" />
              )}
              <span className="hidden sm:inline">Моё местоположение</span>
              <span className="sm:hidden">Гео</span>
            </button>

            <button
              type="button"
              onClick={togglePinMode}
              className={`h-9 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition ${
                isPinMode
                  ? 'apple-sunset-cta'
                  : 'apple-liquid-glass text-white hover:bg-white/[0.12]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{isPinMode ? 'Отмена метки' : 'Поставить метку'}</span>
            </button>

            {onOpenCreateMission && (
              <button
                type="button"
                onClick={onOpenCreateMission}
                aria-label="Создать новую миссию"
                className="h-9 w-9 md:w-auto md:px-3 rounded-full apple-liquid-glass text-[12px] font-semibold text-white inline-flex items-center justify-center gap-1 hover:bg-white/[0.12] active:scale-95 transition"
              >
                <Plus className="w-4 h-4 text-[#E5A3BD]" />
                <span className="hidden md:inline">Новая</span>
              </button>
            )}
          </div>
        </div>

        {/* Group Filter Chips */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedGroupFilter('all')}
            className={`shrink-0 h-7 px-3 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 transition ${
              selectedGroupFilter === 'all'
                ? 'bg-white text-[#111214]'
                : 'apple-liquid-glass text-[#D1D5DB] hover:text-white'
            }`}
          >
            <span>Все</span>
            <span className="opacity-70 tabular-nums">{allMarkers.length}</span>
          </button>

          {filterChips.map((chip) => {
            const active = selectedGroupFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedGroupFilter(chip.id)}
                className={`shrink-0 h-7 px-2.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 transition ${
                  active
                    ? 'bg-white text-[#111214]'
                    : 'apple-liquid-glass text-[#D1D5DB] hover:text-white'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full text-[9px] font-extrabold text-[#0E0F11] flex items-center justify-center"
                  style={{ backgroundColor: chip.color }}
                >
                  {chip.mapMarkerCode}
                </span>
                <span>{chip.name}</span>
                <span className="opacity-70 tabular-nums">{chip.count}</span>
              </button>
            );
          })}
        </div>

        {/* Smart Geolocation Fallback Banner */}
        {geoBanner && (
          <div className="pointer-events-auto apple-liquid-glass rounded-[16px] px-3.5 py-2.5 flex items-center justify-between gap-3 max-w-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-[#FFB703] shrink-0" />
              <p className="text-[12px] text-[#F3F4F6] leading-snug">{geoBanner}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => requestGeolocation(true)}
                className="px-2.5 py-1 rounded-full bg-white/[0.1] hover:bg-white/[0.18] text-[11px] font-semibold text-white transition"
              >
                Повторить
              </button>
              <button
                type="button"
                onClick={() => setGeoBanner(null)}
                aria-label="Скрыть уведомление"
                className="w-6 h-6 rounded-full hover:bg-white/[0.1] flex items-center justify-center text-[#98989F] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Pin Placement Mode Prompt Bar */}
        {isPinMode && (
          <div className="pointer-events-auto apple-liquid-glass rounded-[18px] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 max-w-2xl border border-[#E5A3BD]/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-[10px] bg-[#E5A3BD]/20 text-[#E5A3BD] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-white">
                  Привязка миссии к точке на карте
                </div>
                <div className="text-[11px] text-[#98989F]">
                  {activeLifeMissions.length > 0
                    ? 'Выберите миссию и кликните в любое место на карте.'
                    : 'Сначала создайте жизненную миссию, чтобы поставить для неё точку.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeLifeMissions.length > 0 ? (
                <select
                  value={pinTargetMissionId}
                  onChange={(e) => setPinTargetMissionId(e.target.value)}
                  aria-label="Выбрать миссию для привязки"
                  className="h-8 max-w-[210px] px-2.5 rounded-[10px] bg-[#16171B] border border-white/[0.14] text-[12px] text-white focus:outline-none focus:border-[#E5A3BD]"
                >
                  {activeLifeMissions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              ) : (
                onOpenCreateMission && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPinMode(false);
                      onOpenCreateMission();
                    }}
                    className="h-8 px-3 rounded-[10px] apple-sunset-cta text-[12px] font-semibold"
                  >
                    Создать миссию
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => setIsPinMode(false)}
                className="h-8 px-2.5 rounded-[10px] bg-white/[0.08] hover:bg-white/[0.14] text-[12px] text-[#D1D5DB]"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Pill after Pin Drop */}
        {pinConfirmText && (
          <div className="pointer-events-none inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-liquid-glass text-[12px] font-medium text-[#30D158]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{pinConfirmText}</span>
          </div>
        )}
      </div>

      {/* Bottom-Right Map Zoom & Recenter Controls */}
      <div className="absolute right-3 bottom-4 md:right-4 z-[500] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => handleZoomControl(1)}
          aria-label="Приблизить карту"
          className="w-9 h-9 rounded-[12px] apple-liquid-glass flex items-center justify-center text-white hover:bg-white/[0.14] active:scale-95 transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleZoomControl(-1)}
          aria-label="Отдалить карту"
          className="w-9 h-9 rounded-[12px] apple-liquid-glass flex items-center justify-center text-white hover:bg-white/[0.14] active:scale-95 transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleResetView}
          aria-label="Сбросить вид карты"
          className="w-9 h-9 rounded-[12px] apple-liquid-glass flex items-center justify-center text-[#98989F] hover:text-white hover:bg-white/[0.14] active:scale-95 transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom-Left Coordinates / Radar Status Pill (hidden when bottom sheet is open on mobile) */}
      {!selectedMarker && (
        <div className="absolute left-3 bottom-3 md:left-4 md:bottom-4 z-[450] pointer-events-none">
          <div className="apple-liquid-glass rounded-full px-3 py-1.5 inline-flex items-center gap-2 text-[11px] text-[#D1D5DB]">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor:
                  mapMode === 'real'
                    ? state.userLocation
                      ? '#30D158'
                      : '#FFB703'
                    : '#FF2A85',
              }}
            />
            <span className="font-semibold text-white">
              {mapMode === 'real' ? 'GPS-радар' : 'Solis Coast'}
            </span>
            <span className="text-[#98989F] tabular-nums">
              {filteredMarkers.length} мет.
            </span>
          </div>
        </div>
      )}

      {/* SELECTED MARKER BOTTOM SHEET */}
      {selectedMarker && (
        <MarkerBottomSheet
          marker={selectedMarker}
          groupName={getGroupMeta(selectedMarker.groupId, missionGroups).name}
          onClose={() => setSelectedMarkerKey(null)}
          onToggleSubMission={toggleLifeSubMission}
          onCompleteLifeMission={(missionId) => {
            completeLifeMission(missionId);
            const target = lifeMissions.find((m) => m.id === missionId);
            if (!target?.repeatable) {
              setSelectedMarkerKey(null);
            }
          }}
          onStartFitnessMission={(missionId) => {
            setSelectedMarkerKey(null);
            startMission(missionId);
          }}
          onOpenMissionInHub={onOpenMissionInHub}
          onMovePin={handleEnterPinModeForMission}
        />
      )}
    </section>
  );
};
