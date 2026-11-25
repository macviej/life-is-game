# Life is Game: Solis Edition — Архитектура и Протокол Оркестрации

> **Актуальный пул моделей Google (Gemini 4 Element Series):** `Carbon` · `Neon` · `Hydrogen` *(устаревшие `Argon` и `3.8 Flash` выведены из использования)*.  
> **Дизайн-система:** Modern Apple (iOS 18 / Liquid Glass / Apple Fitness+) × Miami Sunset (`Solis`).

---

## 0. Глобальное правило взаимодействия с пользователем (CRITICAL)

- **Questions UI Only (`ask_question`)**: Любые уточняющие вопросы пользователю задаются **исключительно** через структурированный инструмент `ask_question`. Никогда не пиши списки вопросов обычным текстом в чате.

---

## 1. Иерархия моделей и экономия токенов (Carbon → Neon → Hydrogen)

Проект развивается по схеме **«Умный Координатор + Рой дешёвых воркеров Hydrogen»** без использования выведенных моделей `Argon` и `3.8 Flash`:

1. **Стратегический Архитектор и Главный Оркестратор эпиков — `Gemini 4 Carbon`** (`gemini-4-carbon-high` / `gemini-4-carbon-medium` / `gemini-pro-orchestrator`):
   - Проектирование крупных фич, рефакторинг системной архитектуры, сложных схем БД и правил (`AGENTS.md`, `specs/`, `.agents/skills/`).
   - Координация больших параллельных роёв (`swarm`), ревью критических изменений и разбор нетривиальных багов.
   - **Правило экономии:** не тратить квоту `Carbon (High)` на рутинную вёрстку и мелкие правки — сразу делегировать их в `Hydrogen` или переключаться на `Hydrogen` / `Neon`.

2. **Повседневный Оркестратор и Сложная Инженерия — `Gemini 4 Neon`** (`gemini-4-neon-medium` / `gemini-4-neon-high` / `gemini-pro-orchestrator-neon`):
   - Повседневная сборка фич, стыковка модулей, сложные интерактивные движки (`Three.js`, карта `Leaflet`, расчёт прогрессии и восстановления мышц).
   - Декомпозирует задачи по непересекающимся файлам и раздаёт рутину воркерам `Hydrogen`.

3. **Основной Пул Исполнителей (Workers) — `Gemini 4 Hydrogen`** (`gemini-4-hydrogen-low` / `medium` / `high`):
   - **`gemini-4-hydrogen-low`** *(прямая замена `Gemini 3.8 Flash`)*: 80% повседневной рутины — UI-вёрстка компонентов, Tailwind-стили, модалки, списки, наполнение каталогов миссий/упражнений и проверка сборки (`verifier`: `npm run build`).
   - **`gemini-4-hydrogen-medium` / `gemini-4-hydrogen-high`**: бизнес-логика React-контекстов, формы, серверные роуты `api/*` (Neon Postgres), синхронизация прогресса и авторизация.

### Страховочный пул моделей (раздельная корзина квот)
- **`Claude Sonnet 5.5 (Medium)`** (`claude-sonnet-5-5-medium`) — резерв для сложного UI/TypeScript-рефакторинга или второго взгляда на тяжёлый баг при просадке квоты Gemini.
- **`GPT-OSS 120B (Medium)`** (`gpt-oss-120b-medium`) — лёгкий запасной воркер для `swarm` (`swarm{action:"model", ...}`), если квота Gemini временно исчерпана.

### Специализированные субагенты проекта (`.agents/agents/`)
1. **`ui-designer`** (`Model: "flash"`) — вёрстка и UI строго по `.agents/skills/sunset-fitness-designer/SKILL.md` (Modern Apple Liquid Glass × Miami Sunset).
2. **`backend-worker`** (`Model: "flash"`) — серверные роуты `api/*` (Neon Postgres), `AuthContext`, `GameContext`, `src/engine/*` и контракты `src/types/game.ts`.
3. **`build-verifier`** (`Model: "flash_lite"`) — быстрый read-only запуск `npm run build` (`tsc && vite build`) и короткий отчёт до 5 строк.

### Техническая памятка по инструментам делегирования:
- В **`swarm`** (`swarm{action:"add", model:...}`) всегда передавай точные ID нового пула: `"gemini-4-hydrogen-low"`, `"gemini-4-hydrogen-medium"`, `"gemini-4-neon-medium"`, `"gemini-4-carbon-medium"` (или резервные `"claude-sonnet-5-5-medium"` / `"gpt-oss-120b-medium"`). Никогда не указывай `argon` или `3.8-flash`.
- В **`invoke_subagent`** параметр `Model` имеет фиксированный системный enum `["inherit", "flash_lite", "flash", "pro"]` — слот `"flash"` / `"flash_lite"` является внутренним алиасом Antigravity и автоматически направляет подзадачу на актуальную лёгкую модель (класса Hydrogen).

---

## 2. Концепция и Дизайн-система проекта (Solis Edition)

**Life is Game (Solis)** — веб-приложение (PWA) реальной RPG-прогрессии и фитнеса (с фокусом на турник, воркаут, силу, мобильность и жизненные миссии), выполненное в эстетике **Modern Apple Design (iOS 18 / Liquid Glass / Apple Health / Apple Fitness+) × Miami Sunset**:

- **Визуальные стандарты (строго по `.agents/skills/sunset-fitness-designer/SKILL.md`):**
  - Истинный OLED-чёрный фон `#000000` (`#0A0A0C` внешний фон на десктопе), сгруппированные карточки `#1C1C1E` и вложенные поверхности `#2C2C2E`.
  - Парящая нижняя капсула навигации и верхние контролы в стиле **Liquid Glass** (`backdrop-filter: blur(28px) saturate(180%)` + тонкий блик грани).
  - Системная типографика Apple (`SF Pro Display` / `SF Pro Text` / `-apple-system`), выравнивание чисел `tabular-nums`.
  - Сдержанная палитра Miami Sunset: акцентный градиент `#FF375F` → `#FF7A45`, кольцо здоровья `#30D158`, выносливость/мобильность `#32ADE6`, восстановление/стрик `#FFD60A`.
  - **Чистый UX:** полная тишина (без навязчивых звуковых синтезаторов), никаких сырых эмодзи в хроме интерфейса и никаких упоминаний сторонних защищённых торговых марок.

- **Ключевые разделы приложения (`src/App.tsx`):**
  1. **Миссии (`LifeMissionsHub` + `MissionBuilderModal`)** — хаб жизненных и тренировочных квестов + конструктор собственных миссий.
  2. **Карта (`SolisWorldMap`)** — интерактивная карта мира Solis (`Leaflet`) с точками активностей и площадок.
  3. **Фитнес (`CharacterPhoneView`, `MissionMap`, `ActiveWorkout`, `PlanOnboarding`, `ExerciseGuideModal`)** — концентрические кольца активности Apple Fitness+, матрица восстановления 6 мышечных групп, автоподбор программы («Пролог»), экран выполнения подходов с SVG-анимацией техники.
  4. **Сводка (`MessagesTabView` + `NotificationToast`)** — лента уведомлений от наставников и рекомендации, когда мышцы восстановились для следующего подхода/тренировки.
  5. **Профиль и Награды (`RewardsShop` + `AuthModal`)** — облачная синхронизация аккаунта, управление виртуальными и реальными жизненными наградами, экспорт/импорт резервных копий.

---

## 3. Технический стек и структура директорий

- **Фронтенд:** Vite 5 + React 18 + TypeScript + Tailwind CSS + `lucide-react` + `leaflet` + `three`.
- **Бэкенд и Облако:** Vercel Serverless Functions (`api/`) + Neon Serverless Postgres (`@neondatabase/serverless`) для авторизации и кросс-девайс синхронизации стейта + локальный офлайн-кэш `localStorage`.

```text
/Users/mat/Documents/projects/life is game/
├── AGENTS.md                         # Архитектура и правила оркестрации (Carbon / Neon / Hydrogen)
├── ROADMAP_FOR_NEON.md               # Рабочий плейбук оркестратора для развития новых фич
├── .agents/
│   ├── agents/ui-designer.md         # Специализированный UI/UX субагент (Apple × Miami Sunset)
│   └── skills/sunset-fitness-designer/SKILL.md # Дизайн-система проекта
├── api/                              # Serverless API (Vercel + Neon Postgres)
│   ├── _db.ts                        # Подключение к Neon Serverless Postgres
│   ├── auth.ts                       # Регистрация / вход пользователей
│   └── sync.ts                       # Облачное сохранение и загрузка прогресса игрока
├── specs/                            # Архивные модульные спецификации доменной модели
└── src/
    ├── types/game.ts                 # Единый контракт типов TypeScript
    ├── data/                         # База упражнений, миссий, жизненных квестов и контактов
    ├── engine/                       # Генератор планов (planGenerator) и расчёт восстановления (recoveryEngine)
    ├── context/
    │   ├── AuthContext.tsx           # Авторизация и сессия пользователя
    │   └── GameContext.tsx           # Глобальный игровой стейт, таймеры и автосинхронизация
    ├── components/
    │   ├── auth/                     # Модальное окно входа/регистрации
    │   ├── brand/                    # Айдентика Solis (SolisLogo)
    │   ├── character/                # Кольца активности, статы и матрица мышц (CharacterPhoneView)
    │   ├── exercises/                # SVG-анимации и гайды по технике упражнений
    │   ├── hud/                      # Экран завершения миссии (MissionPassedModal)
    │   ├── map/                      # Интерактивная карта мира (SolisWorldMap)
    │   ├── missions/                 # Хаб миссий, конструктор, онбординг и активная тренировка
    │   ├── phone/                    # Центр сводки/сообщений и баннеры уведомлений
    │   └── safehouse/                # Профиль, магазин реальных/игровых наград и бэкапы
    ├── App.tsx                       # Главный адаптивный шелл с Liquid Glass навигацией
    └── main.tsx
```
