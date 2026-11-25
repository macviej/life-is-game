import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Crosshair,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  RotateCcw,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { LifeMission, MissionGroup, MissionGroupId } from '../../types/game';
import { InitialMapPinInput } from '../missions/MissionBuilderModal';

export interface SolisWorldMapProps {
  onOpenMissionInHub?: (missionId: string) => void;
  onOpenCreateMission?: (pin?: InitialMapPinInput) => void;
}

interface PinnedMissionItem {
  id: string;
  mission: LifeMission;
  groupId: MissionGroupId;
  code: string;
  color: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  placeName: string;
}

const DEFAULT_CENTER = { lat: 55.7558, lng: 37.6173 }; // Москва по умолчанию до получения GPS

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
  street_events: { name: 'События', color: '#FF2A85', mapMarkerCode: '?' },
};

const LEAFLET_CUSTOM_CSS = `
  .life-leaflet-map .leaflet-tile-pane {
    filter: brightness(0.96) contrast(1.1) saturate(1.22);
  }
  .life-leaflet-map .leaflet-control-attribution {
    background: rgba(14, 15, 17, 0.72) !important;
    color: rgba(142, 144, 152, 0.85) !important;
    font-size: 10px !important;
    border-top-left-radius: 8px;
    padding: 2px 6px !important;
  }
  .life-leaflet-map .leaflet-control-attribution a {
    color: rgba(229, 163, 189, 0.85) !important;
  }
  .life-map-div-icon {
    background: transparent !important;
    border: none !important;
  }
  @keyframes lifeMarkerPulse {
    0%, 100% { transform: scale(1); opacity: 0.75; }
    50% { transform: scale(1.48); opacity: 0; }
  }
  @keyframes lifeSheetFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .life-marker-pulse {
    animation: lifeMarkerPulse 2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }
  .life-sheet-enter {
    animation: lifeSheetFadeIn 0.18s ease-out both;
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
      color: '#FF6B9D',
      mapMarkerCode: '★',
    }
  );
}

export const SolisWorldMap: React.FC<SolisWorldMapProps> = ({
  onOpenMissionInHub,
  onOpenCreateMission,
}) => {
  const {
    state,
    setUserLocation,
    setLifeMissionMapPin,
    toggleLifeSubMission,
    completeLifeMission,
  } = useGame();

  const { lifeMissions, missionGroups, userLocation } = state;

  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [pendingSpot, setPendingSpot] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingPlaceName, setPendingPlaceName] = useState('');
  const [attachMissionId, setAttachMissionId] = useState<string>('');
  const [showAttachPicker, setShowAttachPicker] = useState(false);

  const [isLocating, setIsLocating] = useState(false);
  const [geoBanner, setGeoBanner] = useState<string | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pendingMarkerRef = useRef<L.Marker | null>(null);
  const autoLocatedRef = useRef(false);

  const activeLifeMissions = useMemo(
    () => lifeMissions.filter((m) => m.status === 'active'),
    [lifeMissions]
  );

  // Keep attach selector synced
  useEffect(() => {
    if (activeLifeMissions.length === 0) {
      setAttachMissionId('');
      return;
    }
    if (!activeLifeMissions.some((m) => m.id === attachMissionId)) {
      const unpinned = activeLifeMissions.find(
        (m) => typeof m.mapPin?.lat !== 'number' || typeof m.mapPin?.lng !== 'number'
      );
      setAttachMissionId((unpinned ?? activeLifeMissions[0]).id);
    }
  }, [activeLifeMissions, attachMissionId]);

  const showQuickToast = useCallback((text: string) => {
    setToastText(text);
    window.setTimeout(() => {
      setToastText((prev) => (prev === text ? null : prev));
    }, 2800);
  }, []);

  // Only missions that explicitly have real GPS coordinates
  const pinnedMissions = useMemo<PinnedMissionItem[]>(() => {
    return activeLifeMissions
      .filter(
        (m): m is LifeMission & { mapPin: { lat: number; lng: number; placeName: string; markerCode?: string } } =>
          typeof m.mapPin?.lat === 'number' && typeof m.mapPin?.lng === 'number'
      )
      .map((m) => {
        const meta = getGroupMeta(m.groupId, missionGroups);
        return {
          id: m.id,
          mission: m,
          groupId: m.groupId,
          code: m.mapPin.markerCode || meta.mapMarkerCode,
          color: meta.color,
          title: m.title,
          subtitle: m.subtitle,
          lat: m.mapPin.lat,
          lng: m.mapPin.lng,
          placeName: m.mapPin.placeName || 'Точка на карте',
        };
      });
  }, [activeLifeMissions, missionGroups]);

  const filteredPins = useMemo(() => {
    if (selectedGroupFilter === 'all') return pinnedMissions;
    return pinnedMissions.filter((p) => p.groupId === selectedGroupFilter);
  }, [pinnedMissions, selectedGroupFilter]);

  const selectedPin = useMemo(
    () => pinnedMissions.find((p) => p.id === selectedMissionId) ?? null,
    [pinnedMissions, selectedMissionId]
  );

  const filterChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pinnedMissions) {
      counts.set(p.groupId, (counts.get(p.groupId) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([groupId, count]) => {
      const meta = getGroupMeta(groupId, missionGroups);
      return { id: groupId, ...meta, count };
    });
  }, [pinnedMissions, missionGroups]);

  const requestGeolocation = useCallback(
    (showFeedback = false) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        if (showFeedback) {
          setGeoBanner('Браузер не поддерживает геолокацию — можно кликнуть в любое место на карте.');
        }
        return;
      }

      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
          setGeoBanner(null);
          setIsLocating(false);
          leafletMapRef.current?.flyTo([coords.lat, coords.lng], 14, { duration: 0.9 });
        },
        () => {
          setIsLocating(false);
          if (showFeedback) {
            setGeoBanner('Доступ к геолокации отключён — вы всё равно можете ставить метки в любом месте карты.');
          }
        },
        { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
      );
    },
    [setUserLocation]
  );

  // Initialize Leaflet Real Dark Map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || leafletMapRef.current) return;

    const initialCenter = userLocation ?? DEFAULT_CENTER;
    const map = L.map(container, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: userLocation ? 14 : 12,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    leafletMapRef.current = map;

    map.on('click', (evt: L.LeafletMouseEvent) => {
      const { lat, lng } = evt.latlng;
      setSelectedMissionId(null);
      setShowAttachPicker(false);
      setPendingPlaceName('');
      setPendingSpot({ lat, lng });
    });

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      leafletMapRef.current = null;
      markersLayerRef.current = null;
      pendingMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gently request geolocation once if unknown
  useEffect(() => {
    if (!userLocation && !autoLocatedRef.current) {
      autoLocatedRef.current = true;
      requestGeolocation(false);
    }
  }, [userLocation, requestGeolocation]);

  // Render Mission Markers & User GPS Dot
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'life-map-div-icon',
        html: `
          <div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;">
            <span class="life-marker-pulse" style="position:absolute;inset:0;border-radius:9999px;background:rgba(50,173,230,0.45);"></span>
            <span style="position:relative;width:12px;height:12px;border-radius:9999px;background:#32ADE6;border:2.5px solid #0E0F11;box-shadow:0 0 12px rgba(50,173,230,0.9);"></span>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        interactive: false,
      }).addTo(layer);
    }

    for (const item of filteredPins) {
      const isSelected = selectedMissionId === item.id;
      const pulseHtml = isSelected
        ? `<span class="life-marker-pulse" style="position:absolute;inset:-5px;border-radius:14px;border:2px solid ${item.color};"></span>`
        : '';

      const icon = L.divIcon({
        className: 'life-map-div-icon',
        html: `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
            <div style="position:relative;width:36px;height:36px;border-radius:12px;background:#12141B;border:2px solid ${item.color};box-shadow:0 8px 20px rgba(0,0,0,0.65),0 0 14px ${item.color}55;display:flex;align-items:center;justify-content:center;color:${item.color};font-weight:800;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;transform:${isSelected ? 'scale(1.14)' : 'scale(1)'};transition:transform 0.15s ease;">
              ${pulseHtml}
              <span style="position:relative;z-index:2;">${escapeHtml(item.code)}</span>
            </div>
            <div style="margin-top:4px;padding:2px 7px;border-radius:9999px;background:rgba(14,15,17,0.86);border:1px solid rgba(255,255,255,0.12);color:#fff;font-size:10px;font-weight:600;white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis;">
              ${escapeHtml(item.title)}
            </div>
          </div>
        `,
        iconSize: [120, 58],
        iconAnchor: [60, 20],
      });

      const marker = L.marker([item.lat, item.lng], { icon }).addTo(layer);
      marker.on('click', (evt) => {
        L.DomEvent.stopPropagation(evt);
        setPendingSpot(null);
        setSelectedMissionId(item.id);
        leafletMapRef.current?.panTo([item.lat, item.lng], { animate: true });
      });
    }
  }, [filteredPins, selectedMissionId, userLocation]);

  // Render temporary Pending Pin when user clicks anywhere on map
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    if (pendingMarkerRef.current) {
      pendingMarkerRef.current.remove();
      pendingMarkerRef.current = null;
    }

    if (!pendingSpot) return;

    const pendingIcon = L.divIcon({
      className: 'life-map-div-icon',
      html: `
        <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
          <span class="life-marker-pulse" style="position:absolute;inset:-4px;border-radius:9999px;border:2px solid #FF375F;"></span>
          <div style="position:relative;width:32px;height:32px;border-radius:9999px;background:linear-gradient(135deg,#FF375F,#FF7A45);border:2px solid #fff;box-shadow:0 8px 22px rgba(255,55,95,0.55);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:18px;line-height:1;">
            +
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    pendingMarkerRef.current = L.marker([pendingSpot.lat, pendingSpot.lng], {
      icon: pendingIcon,
      interactive: false,
    }).addTo(map);
  }, [pendingSpot]);

  const handleCreateMissionAtSpot = () => {
    if (!pendingSpot || !onOpenCreateMission) return;
    const pin: InitialMapPinInput = {
      lat: pendingSpot.lat,
      lng: pendingSpot.lng,
      placeName: pendingPlaceName.trim() || undefined,
    };
    setPendingSpot(null);
    setPendingPlaceName('');
    onOpenCreateMission(pin);
  };

  const handleAttachExistingMission = () => {
    if (!pendingSpot || !attachMissionId) return;
    const target = activeLifeMissions.find((m) => m.id === attachMissionId);
    if (!target) return;
    const meta = getGroupMeta(target.groupId, missionGroups);
    setLifeMissionMapPin(target.id, {
      placeName: pendingPlaceName.trim() || 'Точка на карте',
      districtLabel: meta.name,
      lat: pendingSpot.lat,
      lng: pendingSpot.lng,
      virtualX: 50,
      virtualY: 50,
      markerCode: meta.mapMarkerCode,
    });
    setPendingSpot(null);
    setPendingPlaceName('');
    setShowAttachPicker(false);
    setSelectedMissionId(target.id);
    showQuickToast(`Метка поставлена для «${target.title}»`);
  };

  const handleRemovePinFromMission = (missionId: string) => {
    setLifeMissionMapPin(missionId, undefined);
    setSelectedMissionId(null);
    showQuickToast('Точка убрана с карты (миссия сохранена)');
  };

  const handleZoomControl = (delta: number) => {
    const map = leafletMapRef.current;
    if (!map) return;
    if (delta > 0) map.zoomIn();
    else map.zoomOut();
  };

  const handleResetView = () => {
    const map = leafletMapRef.current;
    if (!map) return;
    const center = userLocation ?? DEFAULT_CENTER;
    map.flyTo([center.lat, center.lng], userLocation ? 14 : 12, { duration: 0.7 });
  };

  const selectedGroupMeta = selectedPin
    ? getGroupMeta(selectedPin.groupId, missionGroups)
    : null;

  return (
    <section
      aria-label="Интерактивная карта миссий"
      className="relative w-full h-[calc(100vh-148px)] md:h-[calc(100vh-106px)] min-h-[520px] rounded-[28px] overflow-hidden border border-white/[0.1] bg-[#0B0D12] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)]"
    >
      <style>{LEAFLET_CUSTOM_CSS}</style>

      {/* REAL DARK GTA-STYLE LEAFLET MAP */}
      <div
        ref={mapContainerRef}
        className="life-leaflet-map w-full h-full z-[10] cursor-crosshair"
      />

      {/* Subtle top-edge gradient vignette */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#060913]/80 via-[#060913]/25 to-transparent z-[400]" />

      {/* TOP HUD */}
      <div className="absolute inset-x-3 top-3 md:inset-x-4 md:top-4 z-[500] space-y-2 pointer-events-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status Badge */}
          <div className="pointer-events-auto apple-liquid-glass rounded-full px-3.5 h-9 inline-flex items-center gap-2 text-[12px] font-semibold text-white">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: userLocation ? '#30D158' : '#FFD60A' }}
            />
            <span>Карта города</span>
            <span className="text-white/40">·</span>
            <span className="text-[#98989F] tabular-nums">{filteredPins.length} мет.</span>
          </div>

          {/* Right Controls */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => requestGeolocation(true)}
              disabled={isLocating}
              className="h-9 px-3 rounded-full apple-liquid-glass text-[12px] font-semibold text-white inline-flex items-center gap-1.5 hover:bg-white/[0.12] active:scale-95 transition disabled:opacity-60"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 text-[#32ADE6] animate-spin" />
              ) : (
                <Crosshair className="w-3.5 h-3.5 text-[#32ADE6]" />
              )}
              <span className="hidden sm:inline">Моё местоположение</span>
              <span className="sm:hidden">GPS</span>
            </button>

            {onOpenCreateMission && (
              <button
                type="button"
                onClick={() => onOpenCreateMission()}
                className="h-9 px-3.5 rounded-full apple-sunset-cta text-[12px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Новая миссия</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips (shown when there are pinned missions) */}
        {filterChips.length > 0 && (
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
              <span className="opacity-70 tabular-nums">{pinnedMissions.length}</span>
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
        )}

        {/* Geolocation Warning */}
        {geoBanner && (
          <div className="pointer-events-auto apple-liquid-glass rounded-[16px] px-3.5 py-2.5 flex items-center justify-between gap-3 max-w-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-[#FFD60A] shrink-0" />
              <p className="text-[12px] text-[#F3F4F6] leading-snug">{geoBanner}</p>
            </div>
            <button
              type="button"
              onClick={() => setGeoBanner(null)}
              aria-label="Скрыть уведомление"
              className="w-6 h-6 rounded-full hover:bg-white/[0.1] flex items-center justify-center text-[#98989F] hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Toast */}
        {toastText && (
          <div className="pointer-events-none inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-liquid-glass text-[12px] font-medium text-[#30D158]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{toastText}</span>
          </div>
        )}
      </div>

      {/* Bottom-Right Zoom & Recenter Controls */}
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

      {/* Subtle Bottom Hint (when no sheet or spot is open) */}
      {!selectedPin && !pendingSpot && (
        <div className="absolute left-3 right-14 bottom-4 md:left-4 md:right-auto z-[450] pointer-events-none">
          <div className="apple-liquid-glass rounded-full px-3.5 py-2 inline-flex items-center gap-2 text-[12px] text-[#D1D5DB]">
            <MapPin className="w-3.5 h-3.5 text-[#FF6B9D] shrink-0" />
            <span className="truncate">
              Нажми на любое место на карте, чтобы добавить туда миссию
            </span>
          </div>
        </div>
      )}

      {/* CLICK-TO-ADD MISSION PROMPT SHEET */}
      {pendingSpot && (
        <div className="life-sheet-enter absolute inset-x-3 bottom-3 md:left-4 md:right-auto md:w-[400px] z-[600]">
          <div className="rounded-[24px] apple-liquid-glass p-4 space-y-3 border border-white/[0.16]">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-[#FF375F] to-[#FF7A45] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-white">
                    Добавить миссию сюда?
                  </div>
                  <div className="text-[11px] text-[#98989F] tabular-nums">
                    {pendingSpot.lat.toFixed(5)}, {pendingSpot.lng.toFixed(5)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPendingSpot(null);
                  setShowAttachPicker(false);
                }}
                aria-label="Закрыть"
                className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/75"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              type="text"
              value={pendingPlaceName}
              onChange={(e) => setPendingPlaceName(e.target.value)}
              placeholder="Название места (опционально, напр. Парк, Спортзал)"
              className="w-full h-10 px-3.5 rounded-[12px] bg-black/45 border border-white/[0.12] text-[13px] text-white placeholder-[#8E8E93] focus:outline-none focus:border-[#FF6B9D]/60"
            />

            {!showAttachPicker ? (
              <div className="flex flex-wrap items-center gap-2">
                {onOpenCreateMission && (
                  <button
                    type="button"
                    onClick={handleCreateMissionAtSpot}
                    className="flex-1 min-w-[160px] h-10 px-4 rounded-[13px] apple-sunset-cta text-[#111214] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Создать миссию здесь</span>
                  </button>
                )}

                {activeLifeMissions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAttachPicker(true)}
                    className="h-10 px-3.5 rounded-[13px] bg-white/[0.09] hover:bg-white/[0.15] border border-white/[0.1] text-[12px] font-semibold text-white active:scale-[0.98] transition"
                  >
                    Привязать свою
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-0.5">
                <select
                  value={attachMissionId}
                  onChange={(e) => setAttachMissionId(e.target.value)}
                  className="w-full h-10 px-3 rounded-[12px] bg-[#14151A] border border-white/[0.14] text-[13px] text-white focus:outline-none focus:border-[#FF6B9D]"
                >
                  {activeLifeMissions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAttachExistingMission}
                    className="flex-1 h-9 rounded-[11px] apple-sunset-cta text-[#111214] text-[12px] font-semibold active:scale-[0.98] transition"
                  >
                    Поставить метку
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAttachPicker(false)}
                    className="h-9 px-3 rounded-[11px] bg-white/[0.08] text-[12px] text-[#D1D5DB]"
                  >
                    Назад
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SELECTED MISSION PIN BOTTOM SHEET */}
      {selectedPin && selectedGroupMeta && (
        <div className="life-sheet-enter absolute inset-x-3 bottom-3 md:left-4 md:right-auto md:w-[410px] z-[600]">
          <div className="rounded-[24px] apple-liquid-glass p-4 space-y-3 border border-white/[0.16] max-h-[65vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.06em] text-[#0E0F11]"
                    style={{ backgroundColor: selectedGroupMeta.color }}
                  >
                    {selectedGroupMeta.name}
                  </span>
                  <span className="text-[11px] text-[#98989F] truncate">
                    {selectedPin.placeName}
                  </span>
                </div>
                <h3 className="mt-1.5 text-[16px] font-bold text-white leading-snug">
                  {selectedPin.title}
                </h3>
                {selectedPin.subtitle && (
                  <p className="text-[12px] text-[#98989F] mt-0.5">{selectedPin.subtitle}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedMissionId(null)}
                aria-label="Закрыть карточку"
                className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/75 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Interactive Checklist */}
            {selectedPin.mission.subMissions.length > 0 && (
              <div className="rounded-[16px] bg-black/40 border border-white/[0.07] divide-y divide-white/[0.06] overflow-hidden">
                {selectedPin.mission.subMissions.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => toggleLifeSubMission(selectedPin.id, sub.id)}
                    className="w-full px-3 py-2.5 flex items-center gap-2.5 text-left hover:bg-white/[0.04] transition"
                  >
                    {sub.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#30D158] shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-[#636366] shrink-0" />
                    )}
                    <span
                      className={`text-[13px] flex-1 ${
                        sub.completed ? 'line-through text-[#8E8E93]' : 'text-white/95'
                      }`}
                    >
                      {sub.title}
                    </span>
                    {sub.quantity && (
                      <span className="text-[11px] text-[#98989F] shrink-0">{sub.quantity}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Rewards + Actions */}
            <div className="flex items-center justify-between text-[12px] text-[#98989F] tabular-nums px-0.5">
              <span>Награда:</span>
              <span className="font-semibold text-[#30D158]">
                +{selectedPin.mission.rewardRespect} XP ·{' '}
                <span className="text-[#FFD60A]">+${selectedPin.mission.rewardCash}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  completeLifeMission(selectedPin.id);
                  if (!selectedPin.mission.repeatable) {
                    setSelectedMissionId(null);
                  }
                }}
                className="flex-1 min-w-[140px] h-10 px-4 rounded-[13px] apple-sunset-cta text-[#111214] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
              >
                <Check className="w-4 h-4" />
                <span>Завершить</span>
              </button>

              <a
                href={`https://yandex.ru/maps/?pt=${selectedPin.lng},${selectedPin.lat}&z=16&l=map`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-3 rounded-[13px] bg-white/[0.09] hover:bg-white/[0.15] border border-white/[0.1] text-[12px] font-semibold text-white inline-flex items-center gap-1.5 transition"
                title="Открыть в Яндекс Картах"
              >
                <Navigation className="w-3.5 h-3.5 text-[#32ADE6]" />
                <span>Маршрут</span>
              </a>

              {onOpenMissionInHub && (
                <button
                  type="button"
                  onClick={() => onOpenMissionInHub(selectedPin.id)}
                  className="h-10 w-10 rounded-[13px] bg-white/[0.09] hover:bg-white/[0.15] border border-white/[0.1] text-white inline-flex items-center justify-center transition"
                  title="Открыть в списке миссий"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleRemovePinFromMission(selectedPin.id)}
                className="h-10 w-10 rounded-[13px] bg-white/[0.06] hover:bg-[#FF375F]/20 border border-white/[0.08] text-[#98989F] hover:text-[#FF6B8B] inline-flex items-center justify-center transition"
                title="Убрать точку с карты (миссия останется)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
