---
name: sunset-fitness-designer
description: >-
  Elite UI/UX design system for "Life is Game" fusing Modern Apple Design Language
  (iOS 18 / iOS 26 Liquid Glass, Apple Health, Apple Fitness+ Activity Rings, SF Pro typography)
  with warm Miami Sunset character art and real-life RPG progression. Always load before styling UI.
---

# 🍎 Modern Apple × Miami Sunset Design System (Life is Game)

## 1. Visual Philosophy — True Modern Apple Craft (iOS 18 / Liquid Glass / Apple Fitness+)
- **Apple OLED Black + Layered Vibrancy Materials:**
  - Base canvas: true Apple OLED black `#000000` (with `#0A0A0C` outer backdrop on desktop).
  - Grouped Health surfaces: `#1C1C1E` with subtle top-edge glass sheen (`inset 0 0.5px 0 rgba(255,255,255,0.12)`), nested controls `#2C2C2E`, grouped list dividers `rgba(255,255,255,0.08)` (never bulky double borders around every tiny element).
  - **Liquid Glass Chrome:** Floating translucent bottom Tab Bar pill, floating top controls over hero art, and iOS notification banners use `backdrop-filter: blur(28px) saturate(180%)`, subtle multi-stop specular rim (`border: 1px solid rgba(255,255,255,0.16)`), and inner top gloss (`inset 0 1px 0 rgba(255,255,255,0.22)`).
- **Apple System Typography:**
  - Native Apple stack first: `'-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif'`.
  - Apple Large Titles (`34px`, `font-bold`, `tracking-[-0.03em]`, `leading-[1.08]`), crisp `17px` semibold card headers, `15px` body, `13px` secondary (`#8E8E93`), `11px` uppercase tracked captions.
  - Strict `tabular-nums` for all counters, timers, reps, HP, XP, and currency.
- **Restrained Luminous Color Palette (Apple Fitness+ × Miami Sunset):**
  - Primary Sunset Accent: Apple System Coral-Orange gradient `#FF375F` → `#FF7A45` (used with extreme restraint: primary CTA button, active pill tint, key highlights).
  - Apple Vitality Ring Green: `#30D158` / `#A4FF00` (Health HP & 100% muscle recovery).
  - Apple Fitness Cyan: `#32ADE6` / `#00D4FF` (Mobility / Endurance ring).
  - Apple Warm Amber: `#FFD60A` (Recovering state / Streak).
  - Everything else: Pure White `#FFFFFF`, Label Secondary `#98989F`, Label Tertiary `#636366`.

## 2. Signature Modern Apple Interaction Patterns
- **Floating Liquid Glass Tab Bar:** Detached rounded-full floating capsule at the bottom (`mx-4 mb-3 rounded-[30px]`) with an active glass highlight pill behind the selected tab.
- **Apple Fitness+ Concentric Activity Rings:** Crisp glowing multi-ring SVG widget on the Character screen (Health HP outer ring, Daily Progress / Respect middle ring, Muscle Readiness inner ring) with luminous rounded caps.
- **Apple Health Inset Grouped Lists:** Clean full-width rows inside rounded `[24px]` `#1C1C1E` containers separated by crisp `1px` inset hairlines (`divide-y divide-white/[0.07]`), right-aligned values + subtle chevrons.
- **Silent, Tactile, Zero-Clutter UX:** Zero noisy sound effects, zero raw cartoon emojis inside UI chrome, zero trademarked third-party game references.
