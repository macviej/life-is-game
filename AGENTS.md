# Life is Game: Solis Edition — правила проекта

> Пул моделей и правила оркестрации — **только** в глобальном `~/.gemini/config/rules/AGENTS.md` (здесь не дублировать).
> Плейбук и шаблоны промптов — `ROADMAP_FOR_NEON.md`. Архитектура и структура папок — `specs/00-architecture.md` (читать по необходимости).

## 0. Взаимодействие (CRITICAL)
- Вопросы пользователю — только через `ask_question`.
- «Закоммить / запушь в main / покажи изменения» = деплой на Vercel `npx -y vercel --prod --yes` + боевая ссылка Vercel. Локальные ссылки не давать.

## 1. Продукт
PWA реальной RPG-прогрессии и фитнеса (турник, воркаут, сила, мобильность, жизненные миссии). Разделы в `src/App.tsx`: Миссии · Карта (`Leaflet`) · Фитнес (кольца, восстановление мышц, тренировка) · Сводка (уведомления) · Профиль и награды (синхронизация, бэкапы).

## 2. Стек
Vite 5 + React 18 + TypeScript + Tailwind + `lucide-react` + `leaflet` + `three`. Vercel Serverless (`api/`) + Neon Postgres (`@neondatabase/serverless`) + офлайн-кэш `localStorage`. Контракт типов — `src/types/game.ts`.

## 3. Дизайн (детали — `.agents/skills/sunset-fitness-designer/SKILL.md`, обязателен перед любой вёрсткой)
Modern Apple (iOS 18 / Liquid Glass / Fitness+) × Miami Sunset: фон `#000000`, карточки `#1C1C1E`/`#2C2C2E`, акцент `#FF375F → #FF7A45`, SF Pro, `tabular-nums`. Без звуков, без эмодзи в хроме, без чужих торговых марок.

## 4. Зоны владения (для параллельной работы без конфликтов)
| Зона | Файлы | Исполнитель |
|---|---|---|
| UI | `src/components/*`, `src/index.css`, `tailwind.config.js` | Дизайнер — всегда `Claude Sonnet 5.5` (правки делает сам агент на этой модели; `ui-designer` на `flash` не использовать — у него нет прав записи) |
| Данные и логика | `api/*`, `src/context/*`, `src/engine/*`, `src/types/game.ts` | `backend-worker` (`flash`) |
| Каталоги | `src/data/*` | `flash` / `gemini-4-hydrogen-low` |
| Сложные движки | `three`-сцены, `SolisWorldMap`, периодизация | `pro` / `gemini-4-neon-medium` |
| Проверка | `npm run build` (`tsc && vite build`) | `build-verifier` (`flash_lite`), один раз в конце |

`src/types/game.ts` меняет только один исполнитель за раз — остальные ждут его контракт.
