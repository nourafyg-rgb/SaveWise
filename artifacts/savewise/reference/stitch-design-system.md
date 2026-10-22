---
name: SaveWise Arcade Fintech
colors:
  surface: '#faf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#faf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f0'
  surface-container: '#efeeea'
  surface-container-high: '#e9e8e4'
  surface-container-highest: '#e3e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#3f4850'
  inverse-surface: '#2f312e'
  inverse-on-surface: '#f2f1ed'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#565d79'
  on-secondary: '#ffffff'
  secondary-container: '#d8deff'
  on-secondary-container: '#5a627e'
  tertiary: '#825100'
  on-tertiary: '#ffffff'
  tertiary-container: '#a36700'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#bec5e5'
  on-secondary-fixed: '#131a33'
  on-secondary-fixed-variant: '#3e4660'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e3e2df'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 54px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 34px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-arcade:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-data:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system pairs the clean, trustworthy architecture of top-tier consumer fintech with the tactile, punchy charm of late-90s arcade gamification. Geared toward students, Gen Z young adults, and teens making intentional purchasing decisions, the experience must never feel juvenile, condescending, or cluttered. Instead, it feels energetic, crisp, and intrinsically rewarding.

### Visual Aesthetic & Philosophy
- **Modern Fintech Skeleton:** Built on pristine white structured cards, warm paper-tinted canvas backings, razor-sharp 1px low-contrast structural borders, and generous air.
- **Micro-Arcade Flourishes:** Gamified mechanics are expressed through subtle 8-bit accents, pixel-edged achievement badges, modular level trackers, and glowing streak flames. These retro touches serve as precision rewards rather than full-blown skeuomorphism.
- **Tactile High-Contrast Engagement:** Interactive states feature distinct down-press offsets, vibrant cyan-to-sky glow halos, and punchy amber callouts to make pausing before a spontaneous purchase feel like winning a stage boss encounter.

## Colors

The palette balances clean utility with luminous highlights.

- **Primary (`#0284C7` / `#38BDF8`):** Electric Sky. Used for primary interactive triggers, focal action points, active streak paths, and subtle back-glows.
- **Secondary (`#0B132B` / `#1C2541`):** Deep Navy & Midnight. Anchors the visual hierarchy with authoritative headline text, primary navigation bars, and deep-toned status chips.
- **Tertiary (`#F59E0B` / `#EAB308`):** Arcade Gold / Streak Flame. Reserved for milestone notifications, XP multipliers, streak flames, and "cool-off" challenge timers.
- **Neutral Canvas (`#FAF9F5` / `#F3F0E6`):** Warm Cream. Delivers organic warmth that prevents clinical coldness while allowing white surfaces to pop cleanly.
- **Surface Elevation (`#FFFFFF`):** High-clarity white card backgrounds with crisp border containment.
- **Text Neutral (`#111827`):** Deep charcoal providing accessible, comfortable contrast against cream and white surfaces.

## Typography

The type scale combines **Plus Jakarta Sans** for humanist clarity and fluid numbers, with **Space Grotesk** for numerical tallies, badges, stats, and arcade tags.

- **Headlines:** Use tight letter-spacing (`-0.02em` to `-0.03em`) and heavy weights (`700` to `800`) to evoke a punchy, app-first feel without sacrificing readability.
- **Body:** Standardized on `Plus Jakarta Sans` regular and medium cuts for effortless reading across financial ledgers, wishlists, and item breakdowns.
- **Labels & Micro-Accents:** `Space Grotesk` introduces technical rigor into level markers, streaks, countdown clocks, and coin balances, reinforcing the subtle arcade motif.

## Layout & Spacing

This design system uses a strict 8pt modular scale with responsive layout rules:

- **Mobile Viewport (Primary):** Single column fluid container with a minimum `margin-mobile` of `1rem` (16px) and internal card padding of `1rem` (`space-md`). 
- **Desktop & Web Dashboard:** 12-column responsive fluid grid pinned to a maximum content container of `1200px`. Gutters scale from `12px` on mobile up to `24px` on desktop layouts.
- **Vertical Rhythm:** 
  - Micro-element spacing (icons to text, chip inner spacing) relies strictly on `space-xs` (4px) and `space-sm` (8px).
  - Module cards stack with `space-md` (16px) or `space-lg` (24px) for distinct sectioning.
  - Category sections and major flows maintain `space-xl` (40px) breathing room to ensure zero clutter.

## Elevation & Depth

Visual depth combines physical tactile planes with luminous game accents:

- **Base Cards & Containers:** Grounded flat on `#FFFFFF` atop the `#FAF9F5` canvas, framed by a delicate 1px border (`rgba(17, 24, 39, 0.08)`).
- **Subtle Ambient Lift:** Cards leverage a diffuse dual shadow to float smoothly without mud: `0 4px 16px -2px rgba(11, 19, 43, 0.04), 0 1px 2px rgba(11, 19, 43, 0.02)`.
- **Arcade Tactical Glows:** Key CTA elements, active streak flame cards, and pending purchase timers use soft neon back-diffusions:
  - Primary Action Glow: `0 8px 24px -4px rgba(2, 132, 199, 0.35)`.
  - Gold Flame/Alert Glow: `0 8px 24px -4px rgba(245, 158, 11, 0.30)`.
- **Button Depress Depth:** Interactive arcade-style buttons feature a 2px physical bottom shadow (`#0369A1` on `#0284C7`), shifting down on active tap state (`transform: translateY(2px)`).

## Shapes

The shape hierarchy combines rounded utility with sharp pixel badges:

- **Containers & Cards:** Use Level `2` (`0.5rem` / 8px for inner elements, scaling up to `1rem` / 16px for primary financial cards). This maintains modern fintech elegance while avoiding oversized, childlike bubbles.
- **Controls & Buttons:** Standardized at `0.75rem` (12px) to provide balanced, finger-friendly hit surfaces.
- **Gamified Badges & XP Chips:** Contrast the soft cards with stepped corners or micro-chamfers (`0.25rem` / 4px or true 2px stepped corners) to reinforce the 8-bit retro reward aesthetic.

## Components

### Buttons
- **Primary Arcade Action ("Wait & Save / Lock It In"):** Deep sky blue fill (`#0284C7`), pure white bold typography, 2px bottom rim (`#0369A1`), and subtle cyan glow on hover. On click: `translateY(2px)` with shadow collapse.
- **Secondary / Ghost ("View Breakdown"):** White surface with 1px border (`#E2E8F0`), `#1C2541` text, transitioning to `#F1F5F9` on hover.
- **Streak / Level Up Button:** Solid midnight navy (`#0B132B`) with amber accent icons and glowing flame borders.

### Cards & Wishlist Blocks
- **Impulse Delay Card:** High-contrast white container housing product thumbnail, dynamic purchase cost vs. hours-worked calculation, and an animated radial or segmented countdown timer.
- **Streak & Level Widget:** Deep navy surface variant displaying pixelated flame badges, level XP progress bar with amber fill (`#F59E0B`), and mono-spaced stat figures in Space Grotesk.

### Chips & Badges
- **Status Chips:** High-saturation pill chips. "Cooling Off" (Amber light fill, amber border), "Saved!" (Emerald green tint), "Impulse Blocked" (Sky blue tint).
- **Pixel Milestone Badges:** Stepped-edge badges containing 8-bit icon motifs (pixel coin, flame, safe box) used exclusively for money-saving tiers and weekly streaks.

### Input Fields & Sliders
- **Goal & Price Inputs:** Warm cream background with high-contrast active borders (`#0284C7`) and oversized numeric display (`Plus Jakarta Sans Bold`).
- **Cooldown Duration Slider:** Segmented 24h / 48h / 7d slider with tactile snapping steps and retro click audio-haptic feedback.

### Checkboxes & Segmented Controls
- **Toggle Switches:** Arcade-toggle inspired sliders with bright contrasting knobs and glowing active tracks.
- **Checkboxes:** Squared with slightly rounded corners (4px), using a solid sky-blue checkmark reveal with a micro spring animation.