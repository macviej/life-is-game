import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  Dumbbell,
  Flame,
  Hammer,
  Heart,
  HelpCircle,
  Home,
  MapPin,
  Play,
  Plus,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  Wrench,
  ArrowUpRight,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import {
  LifeMission,
  LifeSubMission,
  MissionGroup,
} from '../../types/game';
import { MissionBuilderModal } from './MissionBuilderModal';

interface LifeMissionsHubProps {
  initialSelectedMissionId?: string | null;
  onOpenFitnessTab?: () => void;
  onFocusOnMap?: (missionId: string) => void;
}

type HubSubTab = 'active' | 'completed';

const LUCIDE_GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Dumbbell,
  ShoppingBag,
  ShoppingCart,
  Hammer,
  Wrench,
  Home,
  Briefcase,
  BookOpen,
  Users,
  Heart,
  Wallet,
  HelpCircle,
  Sparkles,
  Flame,
};

function renderGroupIcon(icon: string, className = 'w-4 h-4') {
  const IconComp = LUCIDE_GROUP_ICONS[icon];
  if (IconComp) {
    return <IconComp className={className} />;
  }
  return <span className="text-[14px] leading-none">{icon || '🎯'}</span>;
}

const SHOPPING_QUICK_TAGS = ['Белок', 'Овощи', 'База', 'Фрукты', 'Напитки', 'Быт'];

interface SubMissionAddDraft {
  title: string;
  quantity: string;
  tag: string;
}

export const LifeMissionsHub: React.FC<LifeMissionsHubProps> = ({
  initialSelectedMissionId,
  onOpenFitnessTab,
  onFocusOnMap,
}) => {
  const {
    state,
    deleteLifeMission,
    toggleLifeSubMission,
    addLifeSubMission,
    removeLifeSubMission,
    reopenLifeMission,
    deleteMissionGroup,
  } = useGame();

  const missionGroups = state.missionGroups ?? [];
  const lifeMissions = state.lifeMissions ?? [];

  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [subTab, setSubTab] = useState<HubSubTab>('active');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderInitialTab, setBuilderInitialTab] = useState<'mission' | 'group'>('mission');
  const [highlightedMissionId, setHighlightedMissionId] = useState<string | null>(null);
  const [addOpenId, setAddOpenId] = useState<string | null>(null);
  const [draftsByMissionId, setDraftsByMissionId] = useState<Record<string, SubMissionAddDraft>>({});

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const groupMap = useMemo(() => {
    const map = new Map<string, MissionGroup>();
    missionGroups.forEach((g) => map.set(g.id, g));
    return map;
  }, [missionGroups]);

  // Focus & scroll to initialSelectedMissionId if provided
  useEffect(() => {
    if (!initialSelectedMissionId) return;
    const found = lifeMissions.find((m) => m.id === initialSelectedMissionId);
    if (!found) return;

    setSubTab(found.status === 'completed' ? 'completed' : 'active');
    if (selectedGroupId !== 'all' && selectedGroupId !== found.groupId) {
      setSelectedGroupId(found.groupId);
    }
    setHighlightedMissionId(found.id);

    const timer = window.setTimeout(() => {
      cardRefs.current[found.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    const clearHighlight = window.setTimeout(() => {
      setHighlightedMissionId((curr) => (curr === found.id ? null : curr));
    }, 2800);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearHighlight);
    };
  }, [initialSelectedMissionId]);

  const activeLifeCountByGroup = useMemo(() => {
    const counts = new Map<string, number>();
    lifeMissions.forEach((m) => {
      if (m.status === 'active') {
        counts.set(m.groupId, (counts.get(m.groupId) ?? 0) + 1);
      }
    });
    return counts;
  }, [lifeMissions]);

  const filteredActiveMissions = useMemo(
    () =>
      lifeMissions.filter(
        (m) =>
          m.status === 'active' &&
          (selectedGroupId === 'all' || m.groupId === selectedGroupId)
      ),
    [lifeMissions, selectedGroupId]
  );

  const filteredCompletedMissions = useMemo(
    () =>
      lifeMissions.filter(
        (m) =>
          m.status === 'completed' &&
          (selectedGroupId === 'all' || m.groupId === selectedGroupId)
      ),
    [lifeMissions, selectedGroupId]
  );

  const totalActiveCount = useMemo(
    () =>
      lifeMissions.filter(
        (m) => m.status === 'active' && (selectedGroupId === 'all' || m.groupId === selectedGroupId)
      ).length,
    [lifeMissions, selectedGroupId]
  );

  const totalCompletedCount = useMemo(
    () =>
      lifeMissions.filter(
        (m) =>
          m.status === 'completed' &&
          (selectedGroupId === 'all' || m.groupId === selectedGroupId)
      ).length,
    [lifeMissions, selectedGroupId]
  );

  const getDraft = (missionId: string): SubMissionAddDraft =>
    draftsByMissionId[missionId] ?? { title: '', quantity: '', tag: '' };

  const setDraft = (missionId: string, patch: Partial<SubMissionAddDraft>) => {
    setDraftsByMissionId((prev) => ({
      ...prev,
      [missionId]: {
        ...(prev[missionId] ?? { title: '', quantity: '', tag: '' }),
        ...patch,
      },
    }));
  };

  const handleQuickAddSubMission = (mission: LifeMission) => {
    const draft = getDraft(mission.id);
    const cleanTitle = draft.title.trim();
    if (!cleanTitle) return;
    addLifeSubMission(
      mission.id,
      cleanTitle,
      draft.quantity.trim() || undefined,
      draft.tag.trim() || (mission.kind === 'shopping' ? 'Прочее' : undefined)
    );
    setDraft(mission.id, { title: '', quantity: '' });
  };

  const openNewMissionModal = () => {
    setBuilderInitialTab('mission');
    setBuilderOpen(true);
  };

  const _openNewGroupModal = () => {
    setBuilderInitialTab('group');
    setBuilderOpen(true);
  };

  const selectedGroupObj =
    selectedGroupId !== 'all' ? groupMap.get(selectedGroupId) : undefined;

  const renderSubMissionRow = (mission: LifeMission, sub: LifeSubMission) => (
    <div
      key={sub.id}
      className="group px-4 min-h-[48px] py-2.5 flex items-center justify-between gap-2.5 hover:bg-white/[0.025] transition"
    >
      <button
        type="button"
        onClick={() => toggleLifeSubMission(mission.id, sub.id)}
        className="flex-1 min-w-0 flex items-start gap-3 text-left"
      >
        <span
          className={`mt-0.5 w-5 h-5 rounded-[7px] border flex items-center justify-center shrink-0 transition ${
            sub.completed
              ? 'bg-[#30D158] border-[#30D158] text-[#0E0F11]'
              : 'border-white/25 text-transparent hover:border-[#FF375F]'
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[2.8]" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`text-[14px] leading-snug ${
                sub.completed ? 'text-[#636366] line-through' : 'text-white'
              }`}
            >
              {sub.title}
            </span>
            {sub.quantity && (
              <span className="px-2 py-0.5 rounded-md bg-white/[0.07] text-[12px] font-medium text-[#98989F] tabular-nums">
                {sub.quantity}
              </span>
            )}
            {sub.categoryTag && mission.kind !== 'shopping' && (
              <span className="px-2 py-0.5 rounded-md bg-white/[0.07] text-[12px] font-medium text-[#98989F]">
                {sub.categoryTag}
              </span>
            )}
          </div>
          {sub.note && (
            <p className="mt-0.5 text-[12px] text-[#98989F] leading-snug">{sub.note}</p>
          )}
        </div>
      </button>

      {mission.status === 'active' && (
        <button
          type="button"
          onClick={() => removeLifeSubMission(mission.id, sub.id)}
          className="shrink-0 w-9 h-9 rounded-full opacity-70 sm:opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] text-[#98989F] hover:text-[#FF6B8B] flex items-center justify-center transition"
          aria-label="Удалить пункт"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  const renderShoppingGroupedList = (mission: LifeMission) => {
    const groupsMap = new Map<string, LifeSubMission[]>();
    mission.subMissions.forEach((sub) => {
      const cat = sub.categoryTag?.trim() || 'Прочее';
      const arr = groupsMap.get(cat) ?? [];
      arr.push(sub);
      groupsMap.set(cat, arr);
    });

    return (
      <div className="space-y-2.5">
        {Array.from(groupsMap.entries()).map(([category, items]) => {
          const catDone = items.filter((i) => i.completed).length;
          return (
            <div
              key={category}
              className="rounded-[16px] bg-white/[0.04] overflow-hidden"
            >
              <div className="px-4 py-2 border-b border-white/[0.07] flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#98989F]">
                  {category}
                </span>
                <span className="text-[11px] font-medium text-[#98989F] tabular-nums">
                  {catDone}/{items.length}
                </span>
              </div>
              <div className="divide-y divide-white/[0.07]">
                {items.map((sub) => renderSubMissionRow(mission, sub))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMissionCard = (mission: LifeMission) => {
    const group = groupMap.get(mission.groupId);
    const accentColor = group?.color ?? '#FF375F';
    const markerCode = group?.mapMarkerCode ?? '?';
    const doneSubs = mission.subMissions.filter((s) => s.completed).length;
    const totalSubs = mission.subMissions.length;
    const progressPct =
      totalSubs > 0
        ? Math.round((doneSubs / totalSubs) * 100)
        : mission.status === 'completed'
        ? 100
        : 0;
    const allSubsDone = totalSubs > 0 && doneSubs >= totalSubs;
    const isHighlighted = highlightedMissionId === mission.id;
    const draft = getDraft(mission.id);

    return (
      <article
        key={mission.id}
        ref={(el) => {
          cardRefs.current[mission.id] = el as HTMLDivElement | null;
        }}
        className={`rounded-[22px] p-5 space-y-4 transition-all ${
          isHighlighted
            ? 'apple-card-active ring-2 ring-[#FF375F]/60'
            : 'apple-card'
        }`}
      >
        {/* Top Metadata Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-[13px] flex items-center justify-center text-[14px] font-bold shrink-0 border"
              style={{
                backgroundColor: `${accentColor}1F`,
                borderColor: `${accentColor}55`,
                color: accentColor,
              }}
              title={group?.name}
            >
              {markerCode}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12px] font-semibold text-[#98989F]">
                  {group?.name ?? 'Миссия'}
                </span>

                {mission.isBigMission && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF375F]/15 text-[12px] font-semibold text-[#FF6B8B]">
                    <Heart className="w-3 h-3" />
                    Большая миссия
                  </span>
                )}

                {mission.timesCompleted > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[11px] font-medium text-[#98989F] tabular-nums">
                    ×{mission.timesCompleted}
                  </span>
                )}
              </div>

              <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-white leading-snug">
                {mission.title}
              </h3>

              {mission.subtitle && (
                <p className="text-[13px] text-[#98989F] leading-relaxed">
                  {mission.subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Удалить миссию «${mission.title}»?`)) deleteLifeMission(mission.id);
            }}
            className="shrink-0 w-11 h-11 -mr-2 -mt-2 rounded-full hover:bg-white/[0.07] text-[#636366] hover:text-[#FF6B8B] flex items-center justify-center transition"
            aria-label={`Удалить миссию ${mission.title}`}
            title="Удалить миссию"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Map Pin & Health Bonus Row */}
        {(mission.rewardHealth > 0 || mission.mapPin) && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium tabular-nums">
              {mission.rewardHealth > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-white/[0.07] text-white">
                  +{mission.rewardHealth} HP
                </span>
              )}
            </div>

            {mission.mapPin && (
            <button
              type="button"
              onClick={() => onFocusOnMap?.(mission.id)}
              className="h-10 px-3.5 rounded-full apple-card-elevated hover:bg-[#32343B] text-[13px] font-medium text-white inline-flex items-center gap-1.5 active:scale-95 transition"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[160px]">{mission.mapPin.placeName}</span>
              <span className="text-white/60">· На карте</span>
            </button>
          )}
          </div>
        )}

        {/* Sub-missions List */}
        {mission.subMissions.length > 0 && (
          mission.kind === 'shopping' ? (
            renderShoppingGroupedList(mission)
          ) : (
            <div className="rounded-[16px] bg-white/[0.04] divide-y divide-white/[0.07] overflow-hidden">
              {mission.subMissions.map((sub) => renderSubMissionRow(mission, sub))}
            </div>
          )
        )}

        {/* Inline Quick Add Item (Active Missions Only) */}
        {mission.status === 'active' && addOpenId !== mission.id && (
          <button
            type="button"
            onClick={() => setAddOpenId(mission.id)}
            className="w-full h-11 rounded-[14px] text-[14px] font-medium text-[#98989F] hover:text-white inline-flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{mission.kind === 'shopping' ? 'Добавить продукт' : 'Добавить шаг'}</span>
          </button>
        )}
        {mission.status === 'active' && addOpenId === mission.id && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft(mission.id, { title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickAddSubMission(mission);
                  }
                }}
                placeholder={
                  mission.kind === 'shopping'
                    ? '+ Добавить продукт в список'
                    : '+ Добавить шаг'
                }
                className="flex-1 min-w-0 h-11 px-3.5 rounded-[12px] bg-white/[0.06] text-[15px] text-white placeholder-[#636366] focus:outline-none focus:ring-1 focus:ring-[#FF375F]/60"
              />
              <input
                type="text"
                value={draft.quantity}
                onChange={(e) => setDraft(mission.id, { quantity: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickAddSubMission(mission);
                  }
                }}
                placeholder={mission.kind === 'shopping' ? 'Кол-во' : 'Время/шт'}
                className="w-20 sm:w-24 h-11 px-3 rounded-[12px] bg-white/[0.06] text-[14px] text-white placeholder-[#636366] focus:outline-none focus:ring-1 focus:ring-[#FF375F]/60"
              />
              <button
                type="button"
                onClick={() => handleQuickAddSubMission(mission)}
                disabled={!draft.title.trim()}
                className="h-11 px-3.5 rounded-[12px] apple-card-elevated hover:bg-[#32343B] text-[13px] font-semibold text-white disabled:opacity-40 inline-flex items-center gap-1 active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Добавить</span>
              </button>
            </div>

            {mission.kind === 'shopping' && draft.title.trim().length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12px] text-[#98989F]">Категория:</span>
                {SHOPPING_QUICK_TAGS.map((tag) => {
                  const selected = draft.tag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setDraft(mission.id, { tag: selected ? '' : tag })
                      }
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${
                        selected
                          ? 'apple-sunset-cta text-[#111214]'
                          : 'bg-white/[0.06] text-[#98989F] hover:text-white'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Progress Bar & Action Button */}
        <div className="pt-1 space-y-3">
          {totalSubs > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[12px] tabular-nums">
                <span className="text-[#98989F]">Выполнено</span>
                <span className="font-semibold text-white">
                  {doneSubs} из {totalSubs}
                </span>
              </div>
              <div className="h-[5px] w-full rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progressPct}%`,
                    background: allSubsDone ? '#30D158' : 'linear-gradient(90deg,#FF375F,#FF7A45)',
                  }}
                />
              </div>
            </div>
          )}

          {mission.status === 'active' ? (
            allSubsDone ? (
              <p className="text-center text-[13px] text-[#98989F]">Все пункты отмечены</p>
            ) : null
          ) : (
            <button
              type="button"
              onClick={() => reopenLifeMission(mission.id)}
              className="w-full h-11 rounded-[14px] apple-card-elevated hover:bg-[#32343B] text-[14px] font-semibold text-white hover:text-white inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Вернуть в активные</span>
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="px-5 md:px-0 pt-5 pb-10 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] md:text-[32px] font-semibold tracking-[-0.025em] text-white leading-tight">
            Миссии
          </h1>
          <p className="mt-1 text-[14px] text-[#98989F]">
            Одна миссия — список пунктов. Пока не отмечено всё, она не закрыта.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewMissionModal}
          className="h-11 px-5 rounded-full apple-sunset-cta text-[#111214] text-[14px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition"
        >
          <Plus className="w-4 h-4 stroke-[2.4]" />
          <span>Новая миссия</span>
        </button>
      </header>

      {/* Horizontal Mission Groups Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-5 px-5 md:mx-0 md:px-0">
        <button
          type="button"
          onClick={() => setSelectedGroupId('all')}
          className={`shrink-0 h-11 px-4 rounded-full text-[14px] font-semibold inline-flex items-center gap-2 transition active:scale-95 ${
            selectedGroupId === 'all'
              ? 'bg-white text-[#111214]'
              : 'apple-card text-white/80 hover:text-white'
          }`}
        >
          <span>Все</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[11px] tabular-nums ${
              selectedGroupId === 'all'
                ? 'bg-[#111214]/15 text-[#111214]'
                : 'bg-white/[0.08] text-[#98989F]'
            }`}
          >
            {lifeMissions.filter((m) => m.status === 'active').length}
          </span>
        </button>

        {missionGroups.map((group) => {
          const isSelected = selectedGroupId === group.id;
          const count = activeLifeCountByGroup.get(group.id) ?? 0;

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setSelectedGroupId(group.id)}
              className={`shrink-0 h-11 px-4 rounded-full text-[14px] font-medium inline-flex items-center gap-2 transition active:scale-95 ${
                isSelected
                  ? 'bg-white text-[#111214] font-semibold'
                  : 'apple-card text-white/80 hover:text-white'
              }`}
            >
              <span className={isSelected ? 'text-[#111214]' : 'text-white/80'}>
                {renderGroupIcon(group.icon, 'w-3.5 h-3.5')}
              </span>
              <span>{group.name}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] tabular-nums ${
                    isSelected
                      ? 'bg-[#111214]/15 text-[#111214]'
                      : 'bg-white/[0.08] text-[#98989F]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

      </div>

      {/* Selected Custom Group Banner (with optional delete) */}
      {selectedGroupObj && (
        <div className="rounded-[18px] apple-card px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: `${selectedGroupObj.color}20`,
                borderColor: `${selectedGroupObj.color}55`,
                color: selectedGroupObj.color,
              }}
            >
              {renderGroupIcon(selectedGroupObj.icon, 'w-4 h-4')}
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-white truncate">
                {selectedGroupObj.name}
              </div>
              <div className="text-[12px] text-[#98989F] truncate">
                {selectedGroupObj.description}
              </div>
            </div>
          </div>

          {selectedGroupObj.isCustom && (
            <button
              type="button"
              onClick={() => {
                deleteMissionGroup(selectedGroupObj.id);
                setSelectedGroupId('all');
              }}
              className="shrink-0 h-8 px-2.5 rounded-full bg-white/[0.05] hover:bg-[#FF6B8B]/15 text-[12px] text-[#98989F] hover:text-[#FF6B8B] inline-flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Удалить миссию</span>
            </button>
          )}
        </div>
      )}

      {/* Sub-tabs: Активные · Шаблоны · Выполненные */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[16px] bg-white/[0.06] max-w-md">
        {(
          [
            { id: 'active', label: 'Активные', count: totalActiveCount },
            { id: 'completed', label: 'Выполненные', count: totalCompletedCount },
          ] as Array<{ id: HubSubTab; label: string; count: number }>
        ).map((tab) => {
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`h-11 px-2 rounded-[12px] text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 transition ${
                active ? 'apple-pill-active text-white' : 'text-[#98989F] hover:text-white'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              <span className="text-[11px] text-[#98989F] tabular-nums">{tab.count}</span>
            </button>
          );
        })}
      </div>


      {/* ACTIVE TAB */}
      {subTab === 'active' && (
        <section className="space-y-4">
          {filteredActiveMissions.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {filteredActiveMissions.map((mission) => renderMissionCard(mission))}
            </div>
          ) : (
              <div className="rounded-[24px] apple-card p-8 text-center space-y-4">
                <div className="space-y-1">
                  <h3 className="text-[18px] font-semibold text-white">
                    Миссий пока нет
                  </h3>
                  <p className="text-[13px] text-[#98989F] max-w-md mx-auto">
                    Например: «Сходить в магазин» и пункты — молоко, хлеб, яйца. Миссия закроется, когда отметишь каждый.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewMissionModal}
                  className="h-10 px-4 rounded-full apple-sunset-cta text-[#111214] text-[13px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Создать миссию</span>
                </button>
              </div>
          )}
        </section>
      )}


      {/* COMPLETED TAB */}
      {subTab === 'completed' && (
        <section className="space-y-4">
          {filteredCompletedMissions.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {filteredCompletedMissions.map((mission) => renderMissionCard(mission))}
            </div>
          ) : (
            <div className="rounded-[24px] apple-card p-8 text-center space-y-2">
              <h3 className="text-[17px] font-semibold text-white">
                Пока нет выполненных миссий
              </h3>
              <p className="text-[13px] text-[#98989F]">
                Завершённые миссии появятся здесь — их можно будет в любой момент вернуть в активные.
              </p>
            </div>
          )}
        </section>
      )}

      <MissionBuilderModal
        isOpen={builderOpen}
        defaultGroupId={selectedGroupId !== 'all' ? selectedGroupId : undefined}
        initialTab={builderInitialTab}
        onClose={() => setBuilderOpen(false)}
      />
    </div>
  );
};
