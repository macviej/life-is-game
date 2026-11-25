import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Check,
  Hammer,
  Heart,
  Layers,
  MapPin,
  Navigation,
  Palette,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { LifeMissionKind, LifeSubMission, MissionMapPin } from '../../types/game';

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

type RewardTier = 'light' | 'medium' | 'big';

const REWARD_PRESETS: Record<
  RewardTier,
  {
    label: string;
    hint: string;
    respect: number;
    cash: number;
    health: number;
  }
> = {
  light: {
    label: 'Лёгкая',
    hint: 'Быстрое дело на 10–20 мин',
    respect: 120,
    cash: 100,
    health: 2,
  },
  medium: {
    label: 'Средняя',
    hint: 'Заметный прогресс за день',
    respect: 260,
    cash: 250,
    health: 5,
  },
  big: {
    label: 'Большая',
    hint: 'Крупный этап и весомый трофей',
    respect: 520,
    cash: 550,
    health: 10,
  },
};

const GROUP_COLORS = [
  '#E5A3BD',
  '#8AE5C3',
  '#7ED484',
  '#E5C97B',
  '#64D2FF',
  '#BF5AF2',
  '#FF8A65',
  '#FF6B8B',
];

const GROUP_EMOJIS = ['🎯', '🛒', '🛠️', '🏡', '💼', '📚', '🤝', '❤️', '💰', '🚗', '⚡', '🎸'];

const GROUP_MARKER_PRESETS = ['M', 'A', '★', '$', 'H', 'R', 'W', '?'];

const SHOPPING_QUICK_ITEMS: Array<{ title: string; quantity: string; categoryTag: string }> = [
  { title: 'Куриная грудка / индейка', quantity: '1 кг', categoryTag: 'Белок' },
  { title: 'Яйца С0', quantity: '10 шт', categoryTag: 'Белок' },
  { title: 'Гречка / овсянка', quantity: '2 уп', categoryTag: 'База' },
  { title: 'Брокколи, огурцы и зелень', quantity: '600 г', categoryTag: 'Овощи' },
  { title: 'Питьевая вода', quantity: '5 л', categoryTag: 'Напитки' },
];

const REPAIR_QUICK_ITEMS: Array<{ title: string; quantity: string; categoryTag: string }> = [
  { title: 'Осмотреть участок и снять замеры', quantity: '15 мин', categoryTag: 'Подготовка' },
  { title: 'Докупить крепёж и расходники', quantity: '1 компл.', categoryTag: 'Материалы' },
  { title: 'Выполнить основной монтаж / ремонт', quantity: '1 этап', categoryTag: 'Работа' },
  { title: 'Проверить результат и убрать инструмент', quantity: '10 мин', categoryTag: 'Финал' },
];

function inferKindFromGroup(groupId: string): LifeMissionKind {
  if (groupId === 'shopping') return 'shopping';
  if (groupId === 'home_repair') return 'home_repair';
  if (groupId === 'health_routine') return 'routine';
  return 'checklist';
}

export const MissionBuilderModal: React.FC<MissionBuilderModalProps> = ({
  isOpen,
  defaultGroupId,
  initialTab = 'mission',
  initialMapPin = null,
  onClose,
}) => {
  const { state, createLifeMission, createMissionGroup, setUserLocation } = useGame();
  const groups = state.missionGroups ?? [];

  const resolvedDefaultGroupId = useMemo(() => {
    if (defaultGroupId && defaultGroupId !== 'all' && groups.some((g) => g.id === defaultGroupId)) {
      return defaultGroupId;
    }
    return groups.find((g) => g.id !== 'fitness')?.id ?? groups[0]?.id ?? 'tasks';
  }, [defaultGroupId, groups]);

  const [activeTab, setActiveTab] = useState<'mission' | 'group'>(initialTab);

  // Mission form state
  const [groupId, setGroupId] = useState<string>(resolvedDefaultGroupId);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [kind, setKind] = useState<LifeMissionKind>(inferKindFromGroup(resolvedDefaultGroupId));
  const [placeName, setPlaceName] = useState('');
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocatingPin, setIsLocatingPin] = useState(false);
  const [rewardTier, setRewardTier] = useState<RewardTier>('medium');
  const [subMissions, setSubMissions] = useState<LifeSubMission[]>([]);

  // Sub-mission builder inputs
  const [subTitle, setSubTitle] = useState('');
  const [subQty, setSubQty] = useState('');
  const [subTag, setSubTag] = useState('');

  // Group form state
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupColor, setGroupColor] = useState(GROUP_COLORS[0]);
  const [groupIcon, setGroupIcon] = useState(GROUP_EMOJIS[0]);
  const [groupMarkerCode, setGroupMarkerCode] = useState('M');

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setGroupId(resolvedDefaultGroupId);
    setKind(inferKindFromGroup(resolvedDefaultGroupId));
    if (initialMapPin) {
      setPinCoords({ lat: initialMapPin.lat, lng: initialMapPin.lng });
      setPlaceName(initialMapPin.placeName ?? '');
    } else {
      setPinCoords(null);
      setPlaceName('');
    }
  }, [isOpen, initialTab, resolvedDefaultGroupId, initialMapPin]);

  if (!isOpen) return null;

  const selectedGroup = groups.find((g) => g.id === groupId);

  const handleSelectGroup = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    setKind(inferKindFromGroup(nextGroupId));
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
        quantity: subQty.trim() || undefined,
        categoryTag: subTag.trim() || undefined,
      },
    ]);
    setSubTitle('');
    setSubQty('');
    setSubTag('');
  };

  const handleRemoveSubMission = (id: string) => {
    setSubMissions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleFillShopping = () => {
    const shoppingGroup = groups.find((g) => g.id === 'shopping');
    if (shoppingGroup) setGroupId(shoppingGroup.id);
    setKind('shopping');
    if (!title.trim()) setTitle('Закупка провизии');
    if (!subtitle.trim()) setSubtitle('Пополнить холодильник и запасы на неделю');
    if (!placeName.trim()) setPlaceName('Магазин у дома');
    setSubMissions(
      SHOPPING_QUICK_ITEMS.map((item, idx) => ({
        id: `sub_shop_${Date.now()}_${idx}`,
        title: item.title,
        quantity: item.quantity,
        categoryTag: item.categoryTag,
        completed: false,
      }))
    );
  };

  const handleFillRepair = () => {
    const repairGroup = groups.find((g) => g.id === 'home_repair');
    if (repairGroup) setGroupId(repairGroup.id);
    setKind('home_repair');
    if (!title.trim()) setTitle('Мелкий ремонт и апгрейд');
    if (!subtitle.trim()) setSubtitle('Привести убежище в порядок по чеклисту');
    if (!placeName.trim()) setPlaceName('Дом / Убежище');
    setSubMissions(
      REPAIR_QUICK_ITEMS.map((item, idx) => ({
        id: `sub_rep_${Date.now()}_${idx}`,
        title: item.title,
        quantity: item.quantity,
        categoryTag: item.categoryTag,
        completed: false,
      }))
    );
  };

  const resetMissionForm = () => {
    setTitle('');
    setSubtitle('');
    setPlaceName('');
    setPinCoords(null);
    setRewardTier('medium');
    setSubMissions([]);
    setSubTitle('');
    setSubQty('');
    setSubTag('');
  };

  const handleUseCurrentGps = () => {
    if (state.userLocation) {
      setPinCoords(state.userLocation);
      if (!placeName.trim()) setPlaceName('Моё местоположение');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setIsLocatingPin(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setPinCoords(coords);
        if (!placeName.trim()) setPlaceName('Моё местоположение');
        setIsLocatingPin(false);
      },
      () => {
        setIsLocatingPin(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const resetGroupForm = () => {
    setGroupName('');
    setGroupDesc('');
    setGroupColor(GROUP_COLORS[0]);
    setGroupIcon(GROUP_EMOJIS[0]);
    setGroupMarkerCode('M');
  };

  const handleSubmitMission = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
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

    const reward = REWARD_PRESETS[rewardTier];
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
      subtitle: subtitle.trim() || (cleanPlace ? cleanPlace : 'Личная миссия'),
      kind,
      isBigMission: false,
      isCustom: true,
      subMissions: effectiveSubMissions,
      mapPin,
      rewardRespect: reward.respect,
      rewardCash: reward.cash,
      rewardHealth: reward.health,
      repeatable: kind === 'shopping' || kind === 'routine',
    });

    resetMissionForm();
    onClose();
  };

  const handleSubmitGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = groupName.trim();
    if (!cleanName) return;

    createMissionGroup({
      name: cleanName,
      description: groupDesc.trim() || 'Личная категория миссий',
      icon: groupIcon.trim() || '🎯',
      color: groupColor,
      mapMarkerCode: (groupMarkerCode.trim() || cleanName[0] || '★').slice(0, 2).toUpperCase(),
    });

    resetGroupForm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0E0F11]/85 backdrop-blur-xl flex items-end sm:items-center justify-center sm:p-6 animate-modal-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[600px] max-h-[92vh] rounded-t-[28px] sm:rounded-[28px] apple-liquid-glass flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.08] flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E5A3BD]">
              Конструктор миссий
            </span>
            <h2 className="mt-1 text-[21px] font-bold tracking-[-0.02em] text-white">
              {activeTab === 'mission' ? 'Создать миссию' : 'Новая группа миссий'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full apple-card-elevated flex items-center justify-center text-[#98989F] hover:text-white active:scale-95 transition"
            aria-label="Закрыть конструктор"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Control */}
        <div className="shrink-0 px-5 pt-3.5 pb-1">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[16px] bg-[#131417] border border-white/[0.07]">
            <button
              type="button"
              onClick={() => setActiveTab('mission')}
              className={`h-9 rounded-[12px] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition ${
                activeTab === 'mission'
                  ? 'apple-pill-active text-white'
                  : 'text-[#8E9098] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E5A3BD]" />
              <span>Новая миссия</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('group')}
              className={`h-9 rounded-[12px] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition ${
                activeTab === 'group'
                  ? 'apple-pill-active text-white'
                  : 'text-[#8E9098] hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#8AE5C3]" />
              <span>Новая группа</span>
            </button>
          </div>
        </div>

        {activeTab === 'mission' ? (
          <form onSubmit={handleSubmitMission} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Group Selector */}
              <div className="space-y-2">
                <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8E9098]">
                  Группа миссий
                </label>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => {
                    const selected = g.id === groupId;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelectGroup(g.id)}
                        className={`px-3 py-1.5 rounded-full text-[13px] font-medium inline-flex items-center gap-2 transition active:scale-95 ${
                          selected
                            ? 'bg-white text-[#111214] font-semibold'
                            : 'apple-card-elevated text-[#D1D3D9] hover:bg-[#32343B]'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: g.color }}
                        />
                        <span>{g.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title, Subtitle, Joke Quote */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#98989F] mb-1.5">
                    Название миссии *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Например: Собрать шкаф или Закупиться на неделю"
                    className="w-full h-11 px-3.5 rounded-[14px] bg-[#131417] border border-white/[0.09] text-[14px] text-white placeholder-[#636366] focus:outline-none focus:border-[#E5A3BD]/60 transition"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#98989F] mb-1.5">
                    Краткое описание
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Что нужно сделать и какой результат ждём"
                    className="w-full h-11 px-3.5 rounded-[14px] bg-[#131417] border border-white/[0.09] text-[14px] text-white placeholder-[#636366] focus:outline-none focus:border-[#E5A3BD]/60 transition"
                  />
                </div>
              </div>

              <p className="text-[13px] text-[#8E9098]">
                Добавь пункты списком. «Люсии это понравится» придёт, когда отмечены все.
              </p>

              {/* SubMissions Constructor */}
              <div className="rounded-[20px] apple-card p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[14px] font-semibold text-white">
                      Подмиссии и чеклист ({subMissions.length})
                    </h3>
                    <p className="text-[12px] text-[#8E9098]">
                      Добавь шаги или пункты покупок с количеством
                    </p>
                  </div>
                </div>

                {/* Quick Fill Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleFillShopping}
                    className="h-9 px-3 rounded-[12px] apple-card-elevated hover:bg-[#32343B] text-[12px] font-medium text-[#8AE5C3] inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Заполнить как список покупок</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleFillRepair}
                    className="h-9 px-3 rounded-[12px] apple-card-elevated hover:bg-[#32343B] text-[12px] font-medium text-[#E5C97B] inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span>Заполнить как ремонт</span>
                  </button>
                </div>

                {/* Add SubMission Row */}
                <div className="grid grid-cols-12 gap-2">
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
                    placeholder="Пункт (напр. Покрасить стену)"
                    className="col-span-12 sm:col-span-5 h-10 px-3 rounded-[12px] bg-[#131417] border border-white/[0.08] text-[13px] text-white placeholder-[#636366] focus:outline-none focus:border-[#E5A3BD]/60"
                  />
                  <input
                    type="text"
                    value={subQty}
                    onChange={(e) => setSubQty(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubMission();
                      }
                    }}
                    placeholder="2 шт / 1 кг"
                    className="col-span-5 sm:col-span-3 h-10 px-3 rounded-[12px] bg-[#131417] border border-white/[0.08] text-[13px] text-white placeholder-[#636366] focus:outline-none focus:border-[#E5A3BD]/60"
                  />
                  <input
                    type="text"
                    value={subTag}
                    onChange={(e) => setSubTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubMission();
                      }
                    }}
                    placeholder="Тег (Белок)"
                    className="col-span-5 sm:col-span-3 h-10 px-3 rounded-[12px] bg-[#131417] border border-white/[0.08] text-[13px] text-white placeholder-[#636366] focus:outline-none focus:border-[#E5A3BD]/60"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubMission}
                    className="col-span-2 sm:col-span-1 h-10 rounded-[12px] apple-sunset-cta flex items-center justify-center active:scale-95 transition"
                    aria-label="Добавить пункт"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* SubMissions List */}
                {subMissions.length > 0 && (
                  <div className="rounded-[14px] bg-[#131417] border border-white/[0.06] divide-y divide-white/[0.06] max-h-48 overflow-y-auto">
                    {subMissions.map((item) => (
                      <div
                        key={item.id}
                        className="px-3 py-2 flex items-center justify-between gap-2 text-[13px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E5A3BD] shrink-0" />
                          <span className="text-white truncate">{item.title}</span>
                          {item.quantity && (
                            <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/[0.07] text-[11px] text-[#C8CAD0]">
                              {item.quantity}
                            </span>
                          )}
                          {item.categoryTag && (
                            <span className="shrink-0 px-2 py-0.5 rounded-md bg-[#8AE5C3]/15 text-[11px] text-[#8AE5C3]">
                              {item.categoryTag}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubMission(item.id)}
                          className="shrink-0 w-7 h-7 rounded-full hover:bg-white/[0.08] text-[#8E9098] hover:text-[#FF6B8B] flex items-center justify-center transition"
                          aria-label="Удалить пункт"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional Map Pin */}
              <div className="rounded-[18px] apple-card p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[12px] font-medium text-[#D1D3D9] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#5CE1E6]" />
                    <span>Точка на карте (опционально)</span>
                  </label>

                  {pinCoords ? (
                    <button
                      type="button"
                      onClick={() => setPinCoords(null)}
                      className="text-[11px] font-medium text-[#FF6B8B] hover:underline"
                    >
                      Убрать точку
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleUseCurrentGps}
                      disabled={isLocatingPin}
                      className="h-7 px-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-[11px] font-semibold text-[#5CE1E6] inline-flex items-center gap-1 transition disabled:opacity-50"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>{isLocatingPin ? 'Поиск GPS...' : 'Моё место (GPS)'}</span>
                    </button>
                  )}
                </div>

                {pinCoords ? (
                  <div className="space-y-2">
                    <div className="px-3 py-1.5 rounded-[10px] bg-[#30D158]/12 border border-[#30D158]/25 text-[11px] font-medium text-[#30D158] tabular-nums">
                      Точка выбрана: {pinCoords.lat.toFixed(5)}, {pinCoords.lng.toFixed(5)}
                    </div>
                    <input
                      type="text"
                      value={placeName}
                      onChange={(e) => setPlaceName(e.target.value)}
                      placeholder="Название места (например: Магазин, Спортзал, Дом)"
                      className="w-full h-10 px-3.5 rounded-[12px] bg-[#131417] border border-white/[0.09] text-[13px] text-white placeholder-[#636366] focus:outline-none focus:border-[#5CE1E6]/60 transition"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-[#8E9098] leading-snug">
                    Можно оставить без карты — миссия всё равно полностью работает. Либо привяжите к GPS или выберите место прямо в приложении «Карта».
                  </p>
                )}
              </div>

              {/* Reward Tier */}
              <div className="space-y-2">
                <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8E9098]">
                  Награда за миссию
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(REWARD_PRESETS) as RewardTier[]).map((tier) => {
                    const preset = REWARD_PRESETS[tier];
                    const selected = rewardTier === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setRewardTier(tier)}
                        className={`p-3 rounded-[16px] border text-left transition active:scale-[0.98] ${
                          selected
                            ? 'apple-card-active bg-[#25262B]'
                            : 'apple-card hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[13px] font-semibold text-white">
                            {preset.label}
                          </span>
                          <Award
                            className={`w-3.5 h-3.5 ${
                              selected ? 'text-[#E5A3BD]' : 'text-[#636366]'
                            }`}
                          />
                        </div>
                        <div className="mt-1.5 text-[11px] font-medium text-[#8AE5C3] tabular-nums">
                          +{preset.respect} XP · +${preset.cash}
                        </div>
                        <div className="text-[11px] text-[#8E9098] tabular-nums">
                          +{preset.health} HP
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 py-4 border-t border-white/[0.08] flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-12 px-5 rounded-[16px] apple-card-elevated text-[14px] font-semibold text-[#D1D3D9] hover:text-white active:scale-[0.98] transition"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="flex-1 h-12 rounded-[16px] apple-sunset-cta text-[#111214] text-[15px] font-semibold disabled:opacity-40 active:scale-[0.98] transition"
              >
                Создать миссию
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitGroup} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Live Group Preview */}
              <div className="rounded-[20px] apple-card p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[18px] font-bold shrink-0 border border-white/15"
                    style={{
                      backgroundColor: `${groupColor}22`,
                      color: groupColor,
                    }}
                  >
                    {groupIcon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-white truncate">
                      {groupName.trim() || 'Название группы'}
                    </div>
                    <div className="text-[12px] text-[#8E9098] truncate">
                      {groupDesc.trim() || 'Описание категории миссий'}
                    </div>
                  </div>
                </div>

                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 border-2 shadow-lg"
                  style={{
                    backgroundColor: '#131417',
                    borderColor: groupColor,
                    color: groupColor,
                  }}
                  title="Маркер на карте"
                >
                  {(groupMarkerCode.trim() || 'M').slice(0, 2).toUpperCase()}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#98989F] mb-1.5">
                    Название группы *
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Например: Гараж и авто, Хобби, Музыка"
                    className="w-full h-11 px-3.5 rounded-[14px] bg-[#131417] border border-white/[0.09] text-[14px] text-white placeholder-[#636366] focus:outline-none focus:border-[#8AE5C3]/60 transition"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#98989F] mb-1.5">
                    Описание
                  </label>
                  <input
                    type="text"
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="Для чего эта ветка миссий"
                    className="w-full h-11 px-3.5 rounded-[14px] bg-[#131417] border border-white/[0.09] text-[14px] text-white placeholder-[#636366] focus:outline-none focus:border-[#8AE5C3]/60 transition"
                  />
                </div>
              </div>

              {/* Color Picker */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8E9098]">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Акцентный цвет</span>
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {GROUP_COLORS.map((hex) => {
                    const active = groupColor === hex;
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setGroupColor(hex)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 ${
                          active ? 'ring-2 ring-white ring-offset-2 ring-offset-[#191a1d]' : ''
                        }`}
                        style={{ backgroundColor: hex }}
                        aria-label={`Цвет ${hex}`}
                      >
                        {active && <Check className="w-4 h-4 text-[#111214] stroke-[2.6]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emoji Icon Picker */}
              <div className="space-y-2">
                <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8E9098]">
                  Иконка / эмодзи
                </label>
                <div className="flex flex-wrap gap-2">
                  {GROUP_EMOJIS.map((emoji) => {
                    const active = groupIcon === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setGroupIcon(emoji)}
                        className={`w-10 h-10 rounded-[12px] text-[18px] flex items-center justify-center transition active:scale-95 ${
                          active
                            ? 'bg-white text-[#111214]'
                            : 'apple-card-elevated hover:bg-[#32343B]'
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                  <input
                    type="text"
                    value={groupIcon}
                    maxLength={4}
                    onChange={(e) => setGroupIcon(e.target.value)}
                    className="w-14 h-10 px-2 text-center rounded-[12px] bg-[#131417] border border-white/[0.1] text-[16px] text-white focus:outline-none focus:border-[#E5A3BD]/60"
                    aria-label="Свой эмодзи"
                  />
                </div>
              </div>

              {/* Map Marker Code */}
              <div className="space-y-2">
                <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8E9098]">
                  1-буквенный код маркера на карте
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {GROUP_MARKER_PRESETS.map((code) => {
                    const active = groupMarkerCode === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setGroupMarkerCode(code)}
                        className={`w-9 h-9 rounded-full text-[13px] font-bold flex items-center justify-center transition active:scale-95 ${
                          active
                            ? 'bg-white text-[#111214]'
                            : 'apple-card-elevated text-[#D1D3D9] hover:bg-[#32343B]'
                        }`}
                      >
                        {code}
                      </button>
                    );
                  })}
                  <input
                    type="text"
                    value={groupMarkerCode}
                    maxLength={2}
                    onChange={(e) => setGroupMarkerCode(e.target.value.toUpperCase())}
                    placeholder="M"
                    className="w-16 h-9 px-2 text-center rounded-[12px] bg-[#131417] border border-white/[0.1] text-[13px] font-bold text-white uppercase focus:outline-none focus:border-[#E5A3BD]/60"
                    aria-label="Свой код маркера"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 py-4 border-t border-white/[0.08] flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-12 px-5 rounded-[16px] apple-card-elevated text-[14px] font-semibold text-[#D1D3D9] hover:text-white active:scale-[0.98] transition"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!groupName.trim()}
                className="flex-1 h-12 rounded-[16px] apple-sunset-cta text-[#111214] text-[15px] font-semibold disabled:opacity-40 active:scale-[0.98] transition"
              >
                Создать группу
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
