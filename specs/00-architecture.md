# 00 — Архитектура, концепция и структура (перенесено из AGENTS.md)

## 1. Концепция и Дизайн-система проекта (Solis Edition)

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

## 2. Технический стек и структура директорий

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
