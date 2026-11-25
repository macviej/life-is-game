import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Hammer,
  Loader2,
  MapPin,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { LifeMissionKind, LifeSubMission, MissionMapPin } from '../../types/game';
import {
  GTA_MAP_STYLE,
  loadMapLibre,
  MapLibreMapInstance,
  MapLibreMarkerInstance,
} from '../map/gtaMapStyle';

export interface InitialMapPinInput {
  lat: number;
  lng: number;
  placeName?: string;
}

interface MissionBuilderModalProps {
  isOpen: boolean;
  defaultGroupId?: string;
  initialTab?: 'mission' | 'group';
  initialMapPin?: InitialMapPinInput | null;
  onClose: () => void;
}

type MissionTemplate = 'custom' | 'shopping' | 'repair';

interface QuickOptionPreset {
  id: string;
  label: string;
  title: string;
  items: string[];
}

const REPAIR_OPTIONS: QuickOptionPreset[] = [
  {
    id: 'plumbing',
    label: 'Кран / сантехника',
    title: 'Починить кран / сантехнику',
    items: ['Перекрыть воду и осмотреть узел', 'Заменить прокладку / деталь', 'Проверить герметичность'],
  },
  {
    id: 'shelf',
    label: 'Повесить полку',
    title: 'Повесить полку / картину',
    items: ['Сделать разметку по уровню', 'Просверлить и вставить дюбели', 'Закрепить и проверить'],
  },
  {
    id: 'electric',
    label: 'Розетка / свет',
    title: 'Заменить розетку / светильник',
    items: ['Отключить автомат в щитке', 'Установить и подключить', 'Проверить работу'],
  },
  {
    id: 'furniture',
    label: 'Собрать мебель',
    title: 'Собрать мебель',
    items: ['Разложить детали и фурнитуру', 'Собрать каркас', 'Установить на место и убрать упаковку'],
  },
  {
    id: 'paint',
    label: 'Подклеить / покрасить',
    title: 'Подклеить / подкрасить участок',
    items: ['Подготовить поверхность', 'Нанести клей / краску', 'Дать высохнуть и убрать инструмент'],
  },
  {
    id: 'general',
    label: 'Мелкий ремонт',
    title: 'Мелкий ремонт по дому',
    items: ['Осмотреть участок', 'Выполнить ремонт', 'Убрать инструмент'],
  },
];

const SHOPPING_OPTIONS: QuickOptionPreset[] = [
  {
    id: 'groceries',
    label: 'Продукты',
    title: 'Купить продукты',
    items: ['Белок (мясо / яйца)', 'Крупы и гарнир', 'Овощи и зелень', 'Вода'],
  },
  {
    id: 'household',
    label: 'Бытовая химия',
    title: 'Купить бытовую химию',
    items: ['Средство для стирки / посуды', 'Бумажные полотенца', 'Пакеты'],
  },
  {
    id: 'hardware',
    label: 'Хозтовары',
    title: 'Заехать в хозмаг',
    items: ['Крепёж и расходники', 'Инструмент / мелочи для дома'],
  },
  {
    id: 'pharmacy',
    label: 'Аптека',
    title: 'Зайти в аптеку',
    items: ['Витамины / аптечка'],
  },
];

const DEFAULT_MAP_CENTER = { lat: 55.7558, lng: 37.6173 };

function inferKindFromTemplate(template: MissionTemplate, groupId: string): LifeMissionKind {
  if (template === 'shopping') return 'shopping';
  if (template === 'repair') return 'home_repair';
  if (groupId === 'shopping') return 'shopping';
  if (groupId === 'home_repair') return 'home_repair';
  if (groupId === 'health_routine') return 'routine';
  return 'checklist';
}

export const MissionBuilderModal: React.FC<MissionBuilderModalProps> = ({
  isOpen,
  defaultGroupId,
  initialMapPin = null,
  onClose,
}) => {
  const { state, createLifeMission } = useGame();
  const groups = state.missionGroups ?? [];

  const resolvedDefaultGroupId = useMemo(() => {
    if (defaultGroupId && defaultGroupId !== 'all' && groups.some((g) => g.id === defaultGroupId)) {
      return defaultGroupId;
    }
    return groups.find((g) => g.id !== 'fitness')?.id ?? groups[0]?.id ?? 'tasks';
  }, [defaultGroupId, groups]);

  const [template, setTemplate] = useState<MissionTemplate>('custom');
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string>(resolvedDefaultGroupId);
  const [title, setTitle] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [subMissions, setSubMissions] = useState<LifeSubMission[]>([]);
  const [subTitle, setSubTitle] = useState('');

  // Inline Map Picker state
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [draftPinCoords, setDraftPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapLibreMapInstance | null>(null);
  const markerRef = useRef<MapLibreMarkerInstance | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTemplate('custom');
    setSelectedRepairId(null);
    setSelectedShopId(null);
    setGroupId(resolvedDefaultGroupId);
    setTitle('');
    setSubMissions([]);
    setSubTitle('');
    setIsMapPickerOpen(false);
    if (initialMapPin) {
      setPinCoords({ lat: initialMapPin.lat, lng: initialMapPin.lng });
      setPlaceName(initialMapPin.placeName ?? '');
    } else {
      setPinCoords(null);
      setPlaceName('');
    }
  }, [isOpen, resolvedDefaultGroupId, initialMapPin]);

  // Initialize MapLibre picker when opened
  useEffect(() => {
    if (!isOpen || !isMapPickerOpen || !mapContainerRef.current) return;

    let cancelled = false;
    setIsMapLoading(true);
    const startCenter = pinCoords ?? state.userLocation ?? DEFAULT_MAP_CENTER;
    setDraftPinCoords(pinCoords ?? null);

    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || !mapContainerRef.current) return;

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: GTA_MAP_STYLE,
          center: [startCenter.lng, startCenter.lat],
          zoom: 13.5,
          attributionControl: false,
        });

        mapInstanceRef.current = map;

        const placeMarker = (lat: number, lng: number) => {
          if (markerRef.current) {
            markerRef.current.setLngLat([lng, lat]);
          } else {
            const el = document.createElement('div');
            el.style.width = '28px';
            el.style.height = '28px';
            el.style.borderRadius = '9999px';
            el.style.background = 'linear-gradient(145deg, #FF375F 0%, #FF7A45 100%)';
            el.style.border = '3px solid #FFFFFF';
            el.style.boxShadow = '0 6px 18px rgba(255, 55, 95, 0.55)';
            markerRef.current = new maplibregl.Marker({ element: el })
              .setLngLat([lng, lat])
              .addTo(map);
          }
        };

        if (pinCoords) {
          placeMarker(pinCoords.lat, pinCoords.lng);
        }

        map.on('load', () => {
          if (!cancelled) setIsMapLoading(false);
        });

        map.on('click', (e: { lngLat: { lat: number; lng: number } }) => {
          const next = { lat: e.lngLat.lat, lng: e.lngLat.lng };
          setDraftPinCoords(next);
          placeMarker(next.lat, next.lng);
        });
      })
      .catch(() => {
        if (!cancelled) setIsMapLoading(false);
      });

    return () => {
      cancelled = true;
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, isMapPickerOpen]);

  if (!isOpen) return null;

  const selectedGroup = groups.find((g) => g.id === groupId);

  const handleSelectTemplate = (next: MissionTemplate) => {
    setTemplate(next);
    setSelectedRepairId(null);
    setSelectedShopId(null);

    if (next === 'shopping') {
      const shopGroup = groups.find((g) => g.id === 'shopping');
      if (shopGroup) setGroupId(shopGroup.id);
    } else if (next === 'repair') {
      const repairGroup = groups.find((g) => g.id === 'home_repair');
      if (repairGroup) setGroupId(repairGroup.id);
    }
  };

  const handleSelectRepairOption = (opt: QuickOptionPreset) => {
    setSelectedRepairId(opt.id);
    setTitle(opt.title);
    setSubMissions(
      opt.items.map((item, idx) => ({
        id: `sub_rep_${Date.now()}_${idx}`,
        title: item,
        completed: false,
      }))
    );
  };

  const handleSelectShopOption = (opt: QuickOptionPreset) => {
    setSelectedShopId(opt.id);
    setTitle(opt.title);
    setSubMissions(
      opt.items.map((item, idx) => ({
        id: `sub_shop_${Date.now()}_${idx}`,
        title: item,
        completed: false,
      }))
    );
  };

  const handleAddSubMission = () => {
    const clean = subTitle.trim();
    if (!clean) return;
    setSubMissions((prev) => [
      ...prev,
      {
        id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: clean,
        completed: false,
      },
    ]);
    setSubTitle('');
  };

  const handleRemoveSubMission = (id: string) => {
    setSubMissions((prev) => prev.filter((item) => item.id !== id));
  };

  const canSubmit =
    template === 'shopping' || template === 'repair' || title.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const fallbackTitle =
      template === 'shopping'
        ? 'Поход в магазин'
        : template === 'repair'
        ? 'Ремонт по дому'
        : '';

    const cleanTitle = title.trim() || fallbackTitle;
    if (!cleanTitle) return;

    const effectiveSubMissions: LifeSubMission[] =
      subMissions.length > 0
        ? subMissions
        : [
            {
              id: `sub_main_${Date.now()}`,
              title: cleanTitle,
              completed: false,
            },
          ];

    const cleanPlace = placeName.trim();
    const mapPin: MissionMapPin | undefined = pinCoords
      ? {
          placeName: cleanPlace || 'Точка на карте',
          districtLabel: selectedGroup?.name ?? 'Карта',
          lat: pinCoords.lat,
          lng: pinCoords.lng,
          virtualX: 50,
          virtualY: 50,
          markerCode: selectedGroup?.mapMarkerCode ?? '★',
        }
      : undefined;

    createLifeMission({
      groupId,
      title: cleanTitle,
      subtitle: '',
      kind: inferKindFromTemplate(template, groupId),
      isBigMission: false,
      subMissions: effectiveSubMissions,
      rewardRespect: 200,
      rewardCash: 150,
      rewardHealth: 5,
      mapPin,
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Новая миссия"
    >
      <div className="w-full sm:max-w-[520px] max-h-[90vh] flex flex-col rounded-t-[28px] sm:rounded-[28px] bg-[#16171B] border border-white/[0.1] shadow-[0_24px_80px_rgba(0,0,0,0.65)] overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <h2 className="text-[18px] font-bold tracking-[-0.02em] text-white">
            {isMapPickerOpen ? 'Выбери точку на карте' : 'Новая миссия'}
          </h2>
          <button
            type="button"
            onClick={isMapPickerOpen ? () => setIsMapPickerOpen(false) : onClose}
            className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/[0.12] flex items-center justify-center text-[#A1A3AA] hover:text-white transition"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inline Interactive Map Picker */}
        {isMapPickerOpen ? (
          <div className="flex-1 flex flex-col min-h-[420px]">
            <div className="relative flex-1 min-h-[340px] bg-[#0E0F11]">
              <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
              {isMapLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 pointer-events-none">
                  <Loader2 className="w-6 h-6 text-[#FF85AE] animate-spin" />
                </div>
              )}
              <div className="absolute top-3 left-3 right-3 pointer-events-none flex justify-center">
                <span className="px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[12px] font-medium text-white">
                  Нажми на карту, чтобы поставить точку
                </span>
              </div>
            </div>

            <div className="shrink-0 p-4 border-t border-white/[0.08] bg-[#16171B] flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsMapPickerOpen(false)}
                className="h-11 px-4 rounded-[14px] bg-[#25262B] hover:bg-[#2F3137] text-[14px] font-semibold text-white/90 transition"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!draftPinCoords}
                onClick={() => {
                  if (draftPinCoords) {
                    setPinCoords(draftPinCoords);
                  }
                  setIsMapPickerOpen(false);
                }}
                className="flex-1 h-11 rounded-[14px] apple-sunset-cta text-[#111214] text-[14px] font-bold disabled:opacity-40 transition active:scale-[0.98]"
              >
                {draftPinCoords ? 'Выбрать эту точку' : 'Коснись карты'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Template Selector */}
            <div className="space-y-2">
              <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#8E9098]">
                Шаблон задания
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('custom')}
                  className={`h-11 rounded-[14px] border text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                    template === 'custom'
                      ? 'bg-[#FF375F]/15 border-[#FF375F]/60 text-white'
                      : 'bg-[#222328] border-white/[0.07] text-[#A1A3AA] hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#FF85AE]" />
                  <span>Своё</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('shopping')}
                  className={`h-11 rounded-[14px] border text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                    template === 'shopping'
                      ? 'bg-[#FFB703]/15 border-[#FFB703]/60 text-white'
                      : 'bg-[#222328] border-white/[0.07] text-[#A1A3AA] hover:text-white'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-[#FFB703]" />
                  <span>Магазин</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('repair')}
                  className={`h-11 rounded-[14px] border text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                    template === 'repair'
                      ? 'bg-[#FF7A45]/15 border-[#FF7A45]/60 text-white'
                      : 'bg-[#222328] border-white/[0.07] text-[#A1A3AA] hover:text-white'
                  }`}
                >
                  <Hammer className="w-4 h-4 text-[#FF7A45]" />
                  <span>Ремонт</span>
                </button>
              </div>
            </div>

            {/* Pop-up Quick Options for Repair */}
            {template === 'repair' && (
              <div className="space-y-2">
                <div className="text-[12px] font-medium text-[#98989F]">
                  Какой ремонт сделать? (можно просто выбрать)
                </div>
                <div className="flex flex-wrap gap-2">
                  {REPAIR_OPTIONS.map((opt) => {
                    const active = selectedRepairId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectRepairOption(opt)}
                        className={`px-3 py-2 rounded-full text-[13px] font-medium border inline-flex items-center gap-1.5 transition active:scale-95 ${
                          active
                            ? 'bg-[#FF7A45]/20 border-[#FF7A45]/70 text-white'
                            : 'bg-[#222328] border-white/[0.08] text-white/85 hover:bg-[#2A2B32]'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5 text-[#FF7A45]" />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pop-up Quick Options for Shopping */}
            {template === 'shopping' && (
              <div className="space-y-2">
                <div className="text-[12px] font-medium text-[#98989F]">
                  Что купить? (необязательно — можно сразу создать)
                </div>
                <div className="flex flex-wrap gap-2">
                  {SHOPPING_OPTIONS.map((opt) => {
                    const active = selectedShopId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectShopOption(opt)}
                        className={`px-3 py-2 rounded-full text-[13px] font-medium border inline-flex items-center gap-1.5 transition active:scale-95 ${
                          active
                            ? 'bg-[#FFB703]/20 border-[#FFB703]/70 text-white'
                            : 'bg-[#222328] border-white/[0.08] text-white/85 hover:bg-[#2A2B32]'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5 text-[#FFB703]" />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Title (only required for Custom; optional for Shopping/Repair) */}
            <div className="space-y-1.5">
              <label
                htmlFor="mission-title-input"
                className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#8E9098]"
              >
                {template === 'custom' ? 'Название миссии' : 'Название (необязательно)'}
              </label>
              <input
                id="mission-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  template === 'shopping'
                    ? 'Поход в магазин'
                    : template === 'repair'
                    ? 'Ремонт по дому'
                    : 'Например: Разобрать рабочий стол'
                }
                className="w-full h-11 px-3.5 rounded-[14px] bg-[#222328] border border-white/[0.08] text-[14px] text-white placeholder:text-[#636366] focus:outline-none focus:border-[#FF6B9D]/60 transition"
              />
            </div>

            {/* Category / Group pills (only for Custom) */}
            {template === 'custom' && groups.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#8E9098]">
                  Категория
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {groups
                    .filter((g) => g.id !== 'fitness')
                    .map((g) => {
                      const active = g.id === groupId;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGroupId(g.id)}
                          className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition ${
                            active
                              ? 'bg-white/15 border-white/30 text-white'
                              : 'bg-[#222328] border-white/[0.06] text-[#98989F] hover:text-white'
                          }`}
                        >
                          {g.name}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Map Point Picker */}
            <div className="space-y-2">
              <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#8E9098]">
                Точка на карте
              </label>

              {pinCoords ? (
                <div className="rounded-[14px] bg-[#222328] border border-white/[0.08] p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#FF375F]/15 text-[#FF85AE] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-white truncate">
                        {placeName.trim() || 'Точка выбрана'}
                      </div>
                      <div className="text-[11px] text-[#8E9098] tabular-nums">
                        {pinCoords.lat.toFixed(4)}, {pinCoords.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsMapPickerOpen(true)}
                      className="px-2.5 py-1.5 rounded-[10px] bg-white/[0.08] hover:bg-white/[0.14] text-[12px] font-medium text-white transition"
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      onClick={() => setPinCoords(null)}
                      className="w-8 h-8 rounded-[10px] bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-[#98989F] hover:text-white transition"
                      aria-label="Убрать точку"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsMapPickerOpen(true)}
                  className="w-full h-11 px-4 rounded-[14px] bg-[#222328] hover:bg-[#2A2B32] border border-white/[0.08] text-[13px] font-semibold text-white inline-flex items-center justify-center gap-2 transition active:scale-[0.99]"
                >
                  <MapPin className="w-4 h-4 text-[#FF85AE]" />
                  <span>Выбрать точку на карте</span>
                </button>
              )}
            </div>

            {/* Optional Steps / Checklist */}
            <div className="space-y-2">
              <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#8E9098]">
                Шаги (необязательно)
              </label>

              {subMissions.length > 0 && (
                <div className="space-y-1.5">
                  {subMissions.map((item) => (
                    <div
                      key={item.id}
                      className="px-3 py-2 rounded-[12px] bg-[#222328] border border-white/[0.06] flex items-center justify-between gap-2"
                    >
                      <span className="text-[13px] text-white/90 truncate">{item.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubMission(item.id)}
                        className="text-[#8E9098] hover:text-[#FF6B9D] transition"
                        aria-label="Удалить шаг"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubMission();
                    }
                  }}
                  placeholder="Добавить шаг..."
                  className="flex-1 h-10 px-3.5 rounded-[12px] bg-[#222328] border border-white/[0.08] text-[13px] text-white placeholder:text-[#636366] focus:outline-none focus:border-[#FF6B9D]/60 transition"
                />
                <button
                  type="button"
                  onClick={handleAddSubMission}
                  disabled={!subTitle.trim()}
                  className="w-10 h-10 rounded-[12px] bg-[#2A2B32] hover:bg-[#34363F] disabled:opacity-40 flex items-center justify-center text-white transition"
                  aria-label="Добавить шаг"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full h-12 rounded-[16px] apple-sunset-cta text-[#111214] text-[15px] font-bold disabled:opacity-40 transition active:scale-[0.98]"
              >
                Создать миссию
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
