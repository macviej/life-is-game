# 🚀 ПЛАН ЗАПУСКА ДЛЯ ОРКЕСТРАТОРА (GEMINI 4 NEON)

> **Роль Argon (Планировщик) выполнена:** вся архитектура, контракты типов TypeScript и модульные ТЗ для дешёвых моделей-исполнителей записаны в проект.  
> **Следующий шаг:** переключите модель в меню Antigravity на **Gemini 4 Neon (High или Medium)** и отправьте ей команду запуска ниже.

---

## 📋 Что скопировать и отправить для Gemini 4 Neon:

```text
Ты — повседневный Оркестратор проекта "Life is Game (GTA 6 Fitness RPG)".
Прочитай AGENTS.md и все 4 спецификации в папке specs/.
Выполни сборку проекта по гибридной схеме с использованием дешёвых сабагентов (Model: "flash"):
1. Инициализируй проект Vite + React + TypeScript + Tailwind CSS + lucide-react и создай базовый контракт src/types/game.ts строго по specs/01-domain-and-types.md.
2. Запусти параллельно 3 сабагента (invoke_subagent с Model: "flash"):
   - Воркер 1: реализовать src/data/*, src/engine/* и src/context/GameContext.tsx по specs/02-engine-and-missions.md.
   - Воркер 2: реализовать src/components/hud/*, src/components/missions/* и src/components/stats/* по specs/03-gta6-hud-and-ui.md.
   - Воркер 3: реализовать src/components/phone/* и src/components/safehouse/* по specs/04-phone-and-rewards.md.
3. После завершения работы воркеров собери всё в src/App.tsx, проверь компиляцию через npm run build, исправь возможные нестыковки и запусти dev-сервер.
```

---

## 🛠️ Чеклист для Оркестратора (Gemini 4 Neon)

Когда ты (Neon) получишь управление, действуй строго по этому алгоритму, не тратя свои токены на рутинную вёрстку:

### Шаг 1. Подготовка фундамента (выполняет сам Neon за 1 минуту)
1. Создать `package.json`, конфигурацию Vite, TypeScript и Tailwind CSS (или инициализировать шаблон).
2. Установить зависимости: `npm install lucide-react clsx tailwind-merge`.
3. Записать файл `src/types/game.ts` напрямую из [`specs/01-domain-and-types.md`](./specs/01-domain-and-types.md). Это гарантирует, что все 3 параллельных сабагента будут писать код под единый неизменный интерфейс.

### Шаг 2. Параллельное делегирование дешёвым исполнителям (`Model: "flash"`)
Вызвать `invoke_subagent` (`TypeName: "self"`, `Model: "flash"`) одновременно для трёх независимых контуров:

- **Subagent 1 (`Role: "Engine & Missions Worker"`):**
  - Читает `src/types/game.ts` и `specs/02-engine-and-missions.md`.
  - Создаёт:
    - `src/data/contacts.ts`
    - `src/data/exercises.ts`
    - `src/data/missions.ts`
    - `src/engine/planGenerator.ts`
    - `src/engine/recoveryEngine.ts`
    - `src/engine/soundEffects.ts`
    - `src/context/GameContext.tsx`

- **Subagent 2 (`Role: "GTA 6 HUD & Missions UI Worker"`):**
  - Читает `src/types/game.ts` и `specs/03-gta6-hud-and-ui.md`.
  - Создаёт:
    - `src/components/hud/TopHudBar.tsx`
    - `src/components/hud/MissionPassedModal.tsx`
    - `src/components/missions/MissionMap.tsx`
    - `src/components/missions/ActiveWorkout.tsx`
    - `src/components/missions/PlanOnboarding.tsx`
    - `src/components/stats/CharacterStatsView.tsx`
    - `src/components/stats/WorkoutCatalog.tsx`

- **Subagent 3 (`Role: "iFruit Phone & Rewards Worker"`):**
  - Читает `src/types/game.ts` и `specs/04-phone-and-rewards.md`.
  - Создаёт:
    - `src/components/phone/NotificationToast.tsx`
    - `src/components/phone/IFruitPhone.tsx`
    - `src/components/safehouse/RewardsShop.tsx`

### Шаг 3. Финальная интеграция и проверка качества (выполняет Neon)
1. Собрать главный шелл приложения `src/App.tsx` с навигацией между вкладками:
   - 🗺️ **КАРТА МИССИЙ** (Сюжетка Турника + Параллельные ветки + Grease the Groove)
   - 📊 **СТАТЫ & ЗДОРОВЬЕ** (Полоски навыков GTA + Матрица восстановления мышц 0–100%)
   - 🏋️ **ВСЕ ТРЕНИРОВКИ** (Каталог всех видов упражнений и свободный режим)
   - 🏆 **УБЕЖИЩЕ & НАГРАДЫ** (Магазин виртуальных и реальных наград + сейвы)
2. Проверить сборку `npm run build` и запустить `npm run dev`.
