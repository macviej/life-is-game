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
import { MISSION_TEMPLATES } from '../../data/lifeMissions';
import {
  LifeMission,
  LifeSubMission,
  MissionGroup,
  MissionTemplate,
} from '../../types/game';
import { MissionBuilderModal } from './MissionBuilderModal';

interface LifeMissionsHubProps {
  initialSelectedMissionId?: string | null;
  onOpenFitnessTab?: () => void;
  onFocusOnMap?: (missionId: string) => void;
}

type HubSubTab = 'active' | 'templates' | 'completed';

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
    startMission,
    addLifeMissionFromTemplate,
    deleteLifeMission,
    toggleLifeSubMission,
    addLifeSubMission,
    removeLifeSubMission,
    completeLifeMission,
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

  const activeFitnessMissions = useMemo(
    () =>
      state.missions.filter(
        (m) => m.isUnlocked && m.type !== 'grease_the_groove'
      ),
    [state.missions]
  );

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

  const templatesBySection = useMemo(() => {
    const pool =
      selectedGroupId === 'all'
        ? MISSION_TEMPLATES
        : MISSION_TEMPLATES.filter((t) => t.groupId === selectedGroupId);

    return {
      homeRepair: pool.filter((t) => t.groupId === 'home_repair'),
      shopping: pool.filter((t) => t.groupId === 'shopping'),
      lifeAndEvents: pool.filter(
        (t) => t.groupId !== 'home_repair' && t.groupId !== 'shopping'
      ),
    };
  }, [selectedGroupId]);

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

  const openNewGroupModal = () => {
    setBuilderInitialTab('group');
    setBuilderOpen(true);
  };

  const selectedGroupObj =
    selectedGroupId !== 'all' ? groupMap.get(selectedGroupId) : undefined;

  const renderSubMissionRow = (mission: LifeMission, sub: LifeSubMission) => (
    <div
      key={sub.id}
      className="group px-3.5 py-2.5 flex items-center justify-between gap-2.5 hover:bg-white/[0.025] transition"
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
              : 'border-white/25 bg-[#131417] text-transparent hover:border-[#E5A3BD]'
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
              <span className="px-2 py-0.5 rounded-md bg-white/[0.07] text-[11px] font-medium text-[#C8CAD0] tabular-nums">
                {sub.quantity}
              </span>
            )}
            {sub.categoryTag && mission.kind !== 'shopping' && (
              <span className="px-2 py-0.5 rounded-md bg-[#8AE5C3]/12 text-[11px] font-medium text-[#8AE5C3]">
                {sub.categoryTag}
              </span>
            )}
          </div>
          {sub.note && (
            <p className="mt-0.5 text-[12px] text-[#8E9098] leading-snug">{sub.note}</p>
          )}
        </div>
      </button>

      {mission.status === 'active' && (
        <button
          type="button"
          onClick={() => removeLifeSubMission(mission.id, sub.id)}
          className="shrink-0 w-7 h-7 rounded-full opacity-70 sm:opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] text-[#8E9098] hover:text-[#FF6B8B] flex items-center justify-center transition"
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
              className="rounded-[16px] bg-[#131417] border border-white/[0.06] overflow-hidden"
            >
              <div className="px-3.5 py-2 bg-white/[0.03] border-b border-white/[0.05] flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8AE5C3]">
                  {category}
                </span>
                <span className="text-[11px] font-medium text-[#8E9098] tabular-nums">
                  {catDone}/{items.length}
                </span>
              </div>
              <div className="divide-y divide-white/[0.05]">
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
    const accentColor = group?.color ?? '#E5A3BD';
    const markerCode = group?.mapMarkerCode ?? '?';
    const doneSubs = mission.subMissions.filter((s) => s.completed).length;
    const totalSubs = mission.subMissions.length;
    const progressPct =
      totalSubs > 0
        ? Math.round((doneSubs / totalSubs) * 100)
        : mission.status === 'completed'
        ? 100
        : 0;
    const allSubsDone = totalSubs === 0 || doneSubs >= totalSubs;
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
            ? 'apple-card-active ring-2 ring-[#E5A3BD]/60'
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
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.09em]"
                  style={{ color: accentColor }}
                >
                  {group?.name ?? 'Миссия'}
                </span>

                {mission.isBigMission && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E5A3BD]/15 border border-[#E5A3BD]/35 text-[11px] font-semibold text-[#E5A3BD]">
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
            onClick={() => deleteLifeMission(mission.id)}
            className="shrink-0 w-8 h-8 rounded-full hover:bg-white/[0.07] text-[#636366] hover:text-[#FF6B8B] flex items-center justify-center transition"
            aria-label={`Удалить миссию ${mission.title}`}
            title="Удалить миссию"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Joke Quote */}
        {mission.jokeQuote && (
          <div className="px-3.5 py-2.5 rounded-[14px] bg-[#131417] border border-white/[0.06] text-[12px] italic text-[#C8CAD0] leading-relaxed">
            «{mission.jokeQuote}»
          </div>
        )}

        {/* Map Pin & Rewards Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium tabular-nums">
            <span className="px-2.5 py-1 rounded-full bg-[#E5A3BD]/12 text-[#E5A3BD]">
              +{mission.rewardRespect} Respect
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#7ED484]/12 text-[#7ED484]">
              +${mission.rewardCash}
            </span>
            {mission.rewardHealth > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-[#8AE5C3]/12 text-[#8AE5C3]">
                +{mission.rewardHealth} HP
              </span>
            )}
          </div>

          {mission.mapPin && (
            <button
              type="button"
              onClick={() => onFocusOnMap?.(mission.id)}
              className="h-8 px-3 rounded-full apple-card-elevated hover:bg-[#32343B] text-[12px] font-medium text-[#8AE5C3] inline-flex items-center gap-1.5 active:scale-95 transition"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[160px]">{mission.mapPin.placeName}</span>
              <span className="text-white/60">· На карте</span>
            </button>
          )}
        </div>

        {/* Sub-missions List */}
        {mission.subMissions.length > 0 && (
          mission.kind === 'shopping' ? (
            renderShoppingGroupedList(mission)
          ) : (
            <div className="rounded-[16px] bg-[#131417] border border-white/[0.06] divide-y divide-white/[0.06] overflow-hidden">
              {mission.subMissions.map((sub) => renderSubMissionRow(mission, sub))}
            </div>
          )
        )}

        {/* Inline Quick Add Item (Active Missions Only) */}
        {mission.status === 'active' && (
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
                className="flex-1 min-w-0 h-9 px-3 rounded-[12px] bg-[#131417] border border-white/[0.08] text-[13px] text-white placeholder-[#636366] focus:outline-none focus:border-[#E5A3BD]/60"
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
                className="w-20 sm:w-24 h-9 px-2.5 rounded-[12px] bg-[#131417] border border-white/[0.08] text-[12px] text-white placeholder-[#636366] focus:outline-none focus:border-[#E5A3BD]/60"
              />
              <button
                type="button"
                onClick={() => handleQuickAddSubMission(mission)}
                disabled={!draft.title.trim()}
                className="h-9 px-3 rounded-[12px] apple-card-elevated hover:bg-[#32343B] text-[12px] font-semibold text-white disabled:opacity-40 inline-flex items-center gap-1 active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Добавить</span>
              </button>
            </div>

            {mission.kind === 'shopping' && draft.title.trim().length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[#8E9098]">Категория:</span>
                {SHOPPING_QUICK_TAGS.map((tag) => {
                  const selected = draft.tag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setDraft(mission.id, { tag: selected ? '' : tag })
                      }
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition ${
                        selected
                          ? 'bg-[#8AE5C3] text-[#111214]'
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
                <span className="text-[#8E9098]">Прогресс подмиссий</span>
                <span className="font-semibold text-white">
                  {doneSubs} / {totalSubs}
                </span>
              </div>
              <div className="h-[5px] w-full rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: allSubsDone ? '#30D158' : accentColor,
                  }}
                />
              </div>
            </div>
          )}

          {mission.status === 'active' ? (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => completeLifeMission(mission.id)}
                className={`w-full h-11 rounded-[15px] text-[14px] font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition ${
                  allSubsDone
                    ? 'apple-sunset-cta text-[#111214]'
                    : 'apple-card-elevated text-white hover:bg-[#32343B]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Завершить миссию</span>
              </button>
              {mission.isBigMission && (
                <p className="text-center text-[11px] text-[#E5A3BD]/90">
                  Большая миссия: после завершения придёт поощрение («Люсии это понравится»)
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => reopenLifeMission(mission.id)}
              className="w-full h-10 rounded-[14px] apple-card-elevated hover:bg-[#32343B] text-[13px] font-semibold text-[#D1D3D9] hover:text-white inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Вернуть в активные</span>
            </button>
          )}
        </div>
      </article>
    );
  };

  const renderTemplateCard = (tpl: MissionTemplate) => {
    const group = groupMap.get(tpl.groupId);
    const accentColor = group?.color ?? '#E5A3BD';
    const markerCode = group?.mapMarkerCode ?? '?';

    const activeMatch = lifeMissions.some(
      (m) => m.isFromTemplateId === tpl.id && m.status === 'active'
    );
    const completedNonRepeatable =
      !tpl.repeatable &&
      lifeMissions.some(
        (m) => m.isFromTemplateId === tpl.id && m.status === 'completed'
      );
    const alreadyInList = activeMatch || completedNonRepeatable;

    return (
      <article
        key={tpl.id}
        className="rounded-[22px] apple-card p-5 flex flex-col justify-between gap-4"
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-[12px] flex items-center justify-center text-[13px] font-bold shrink-0 border"
                style={{
                  backgroundColor: `${accentColor}1F`,
                  borderColor: `${accentColor}55`,
                  color: accentColor,
                }}
              >
                {markerCode}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8E9098] truncate">
                  {tpl.badgeLabel || group?.name}
                </div>
                <h3 className="text-[16px] font-semibold text-white leading-snug">
                  {tpl.title}
                </h3>
              </div>
            </div>

            {tpl.isBigMission && (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E5A3BD]/15 border border-[#E5A3BD]/35 text-[11px] font-semibold text-[#E5A3BD]">
                <Heart className="w-3 h-3" />
                Большая
              </span>
            )}
          </div>

          <p className="text-[13px] text-[#98989F] leading-relaxed">{tpl.subtitle}</p>

          {tpl.jokeQuote && (
            <div className="px-3 py-2 rounded-[12px] bg-[#131417] border border-white/[0.06] text-[12px] italic text-[#C8CAD0]">
              «{tpl.jokeQuote}»
            </div>
          )}

          {tpl.defaultSubMissions.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#636366]">
                Пункты ({tpl.defaultSubMissions.length})
              </div>
              <ul className="space-y-1 text-[12px] text-[#D1D3D9]">
                {tpl.defaultSubMissions.slice(0, 4).map((s, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2">
                    <span className="truncate">• {s.title}</span>
                    {s.quantity && (
                      <span className="shrink-0 text-[11px] text-[#8E9098]">
                        {s.quantity}
                      </span>
                    )}
                  </li>
                ))}
                {tpl.defaultSubMissions.length > 4 && (
                  <li className="text-[11px] text-[#8E9098]">
                    + ещё {tpl.defaultSubMissions.length - 4} шт.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium tabular-nums">
            <span className="px-2 py-0.5 rounded-full bg-[#E5A3BD]/12 text-[#E5A3BD]">
              +{tpl.rewardRespect} Respect
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#7ED484]/12 text-[#7ED484]">
              +${tpl.rewardCash}
            </span>
            {tpl.rewardHealth > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#8AE5C3]/12 text-[#8AE5C3]">
                +{tpl.rewardHealth} HP
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={alreadyInList}
            onClick={() => addLifeMissionFromTemplate(tpl.id)}
            className={`w-full h-10 rounded-[14px] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition ${
              alreadyInList
                ? 'bg-[#30D158]/15 text-[#7ED484] border border-[#30D158]/30 cursor-default'
                : 'apple-sunset-cta text-[#111214] active:scale-[0.98]'
            }`}
          >
            {alreadyInList ? (
              <>
                <Check className="w-4 h-4" />
                <span>Уже в списке</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Добавить в мои миссии</span>
              </>
            )}
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="px-5 md:px-0 pt-5 pb-10 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[12px] font-medium text-[#E5A3BD]">
            Life is Game · Solis 2.0
          </span>
          <h1 className="mt-0.5 text-[28px] md:text-[32px] font-semibold tracking-[-0.025em] text-white leading-tight">
            Центр миссий
          </h1>
          <p className="mt-1 text-[13px] text-[#8E9098]">
            Все цели жизни на одном радаре: от турника и закупок до ремонта убежища.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewMissionModal}
          className="h-10 px-4 rounded-full apple-sunset-cta text-[#111214] text-[13px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition"
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
          className={`shrink-0 h-10 px-3.5 rounded-full text-[13px] font-semibold inline-flex items-center gap-2 transition active:scale-95 ${
            selectedGroupId === 'all'
              ? 'bg-white text-[#111214]'
              : 'apple-card text-[#C8CAD0] hover:text-white'
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
          const count =
            group.id === 'fitness'
              ? activeFitnessMissions.length
              : activeLifeCountByGroup.get(group.id) ?? 0;

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setSelectedGroupId(group.id)}
              className={`shrink-0 h-10 px-3.5 rounded-full text-[13px] font-medium inline-flex items-center gap-2 transition active:scale-95 ${
                isSelected
                  ? 'bg-white text-[#111214] font-semibold'
                  : 'apple-card text-[#D1D3D9] hover:text-white'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: group.color }}
              />
              <span className={isSelected ? 'text-[#111214]' : 'text-[#C8CAD0]'}>
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

        <button
          type="button"
          onClick={openNewGroupModal}
          className="shrink-0 h-10 px-3.5 rounded-full apple-card-elevated hover:bg-[#32343B] text-[13px] font-semibold text-[#8AE5C3] inline-flex items-center gap-1.5 active:scale-95 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Группа</span>
        </button>
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
              <div className="text-[12px] text-[#8E9098] truncate">
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
              className="shrink-0 h-8 px-2.5 rounded-full bg-white/[0.05] hover:bg-[#FF6B8B]/15 text-[12px] text-[#8E9098] hover:text-[#FF6B8B] inline-flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Удалить группу</span>
            </button>
          )}
        </div>
      )}

      {/* Sub-tabs: Активные · Шаблоны · Выполненные */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-[16px] bg-[#131417] border border-white/[0.07] max-w-md">
        {(
          [
            { id: 'active', label: 'Активные', count: totalActiveCount },
            { id: 'templates', label: 'Шаблоны', count: MISSION_TEMPLATES.length },
            { id: 'completed', label: 'Выполненные', count: totalCompletedCount },
          ] as Array<{ id: HubSubTab; label: string; count: number }>
        ).map((tab) => {
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`h-9 px-2 rounded-[12px] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition ${
                active ? 'apple-pill-active text-white' : 'text-[#8E9098] hover:text-white'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              <span className="text-[11px] text-[#8E9098] tabular-nums">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* Embedded Fitness Block when group === 'fitness' */}
      {selectedGroupId === 'fitness' && subTab !== 'templates' && (
        <section className="rounded-[24px] apple-card-active p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E5A3BD]">
                Фитнес-кампания Solis
              </span>
              <h2 className="mt-0.5 text-[20px] font-semibold text-white">
                Тренировочные миссии
              </h2>
            </div>

            {onOpenFitnessTab && (
              <button
                type="button"
                onClick={onOpenFitnessTab}
                className="h-9 px-3.5 rounded-full apple-card-elevated hover:bg-[#32343B] text-[12px] font-semibold text-white inline-flex items-center gap-1.5 active:scale-95 transition"
              >
                <span>Перейти в Фитнес-хаб</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#E5A3BD]" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeFitnessMissions.map((m) => (
              <div
                key={m.id}
                className="rounded-[18px] bg-[#131417] border border-white/[0.07] p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#E5A3BD]/15 text-[11px] font-bold text-[#E5A3BD]">
                      {m.code}
                    </span>
                    <span className="text-[11px] text-[#8E9098] tabular-nums">
                      Упражнений: {m.tasks.length} · Выполнено: {m.timesCompleted}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-white">{m.title}</h3>
                  <p className="text-[12px] text-[#8E9098] line-clamp-2">{m.subtitle}</p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="text-[12px] font-medium text-[#8AE5C3] tabular-nums">
                    +{m.rewards.respectXp} XP · +${m.rewards.cash}
                  </div>
                  <button
                    type="button"
                    onClick={() => startMission(m.id)}
                    className="h-9 px-3.5 rounded-[12px] apple-sunset-cta text-[#111214] text-[12px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Начать тренировку</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ACTIVE TAB */}
      {subTab === 'active' && (
        <section className="space-y-4">
          {filteredActiveMissions.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {filteredActiveMissions.map((mission) => renderMissionCard(mission))}
            </div>
          ) : (
            selectedGroupId !== 'fitness' && (
              <div className="rounded-[24px] apple-card p-8 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-white/[0.06] flex items-center justify-center text-[#E5A3BD]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[18px] font-semibold text-white">
                    В этой группе пока нет активных миссий
                  </h3>
                  <p className="text-[13px] text-[#8E9098] max-w-md mx-auto">
                    Создай свою миссию в конструкторе или выбери готовый сценарий во вкладке «Шаблоны».
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={openNewMissionModal}
                    className="h-10 px-4 rounded-full apple-sunset-cta text-[#111214] text-[13px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Создать миссию</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('templates')}
                    className="h-10 px-4 rounded-full apple-card-elevated hover:bg-[#32343B] text-[13px] font-semibold text-white active:scale-95 transition"
                  >
                    Открыть шаблоны
                  </button>
                </div>
              </div>
            )
          )}
        </section>
      )}

      {/* TEMPLATES TAB */}
      {subTab === 'templates' && (
        <section className="space-y-8">
          {templatesBySection.homeRepair.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E5C97B]">
                    Сюжетная линия убежища
                  </span>
                  <h2 className="text-[20px] font-semibold text-white">
                    Ремонт убежища · Глава I
                  </h2>
                </div>
                <span className="text-[12px] text-[#8E9098]">
                  Выбирай нужные этапы
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templatesBySection.homeRepair.map(renderTemplateCard)}
              </div>
            </div>
          )}

          {templatesBySection.shopping.length > 0 && (
            <div className="space-y-3.5">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8AE5C3]">
                  Провизия и быт
                </span>
                <h2 className="text-[20px] font-semibold text-white">
                  Магазин и Провизия
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templatesBySection.shopping.map(renderTemplateCard)}
              </div>
            </div>
          )}

          {templatesBySection.lifeAndEvents.length > 0 && (
            <div className="space-y-3.5">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E5A3BD]">
                  Дела, рост и случайные вызовы
                </span>
                <h2 className="text-[20px] font-semibold text-white">
                  Жизнь и События
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templatesBySection.lifeAndEvents.map(renderTemplateCard)}
              </div>
            </div>
          )}

          {templatesBySection.homeRepair.length === 0 &&
            templatesBySection.shopping.length === 0 &&
            templatesBySection.lifeAndEvents.length === 0 && (
              <div className="rounded-[24px] apple-card p-8 text-center space-y-3">
                <p className="text-[14px] text-[#98989F]">
                  Для выбранной группы нет готовых шаблонов.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGroupId('all')}
                    className="h-10 px-4 rounded-full apple-card-elevated text-[13px] font-semibold text-white"
                  >
                    Показать все шаблоны
                  </button>
                  <button
                    type="button"
                    onClick={openNewMissionModal}
                    className="h-10 px-4 rounded-full apple-sunset-cta text-[#111214] text-[13px] font-semibold"
                  >
                    Создать вручную
                  </button>
                </div>
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
              <p className="text-[13px] text-[#8E9098]">
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
