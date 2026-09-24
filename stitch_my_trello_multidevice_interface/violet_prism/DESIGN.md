---
name: Violet Prism
colors:
  surface: '#161121'
  surface-dim: '#161121'
  surface-bright: '#3c3648'
  surface-container-lowest: '#100b1c'
  surface-container-low: '#1e192a'
  surface-container: '#221d2e'
  surface-container-high: '#2d2739'
  surface-container-highest: '#383244'
  on-surface: '#e9def6'
  on-surface-variant: '#ccc3d8'
  inverse-surface: '#e9def6'
  inverse-on-surface: '#332d3f'
  outline: '#958da1'
  outline-variant: '#4a4455'
  surface-tint: '#d2bbff'
  primary: '#d2bbff'
  on-primary: '#3f008e'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#732ee4'
  secondary: '#cebdff'
  on-secondary: '#381385'
  secondary-container: '#4f319c'
  on-secondary-container: '#bea8ff'
  tertiary: '#ffafd3'
  on-tertiary: '#620040'
  tertiary-container: '#ae397b'
  on-tertiary-container: '#ffdce9'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#e8ddff'
  secondary-fixed-dim: '#cebdff'
  on-secondary-fixed: '#21005e'
  on-secondary-fixed-variant: '#4f319c'
  tertiary-fixed: '#ffd8e7'
  tertiary-fixed-dim: '#ffafd3'
  on-tertiary-fixed: '#3d0026'
  on-tertiary-fixed-variant: '#85145a'
  background: '#161121'
  on-background: '#e9def6'
  surface-variant: '#383244'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system defines an atmospheric, hyper-refined workspace tailored for high-focus collaborative work, technical project execution, and product roadmapping. It blends purposeful utility with an immersive, luminous glassmorphism aesthetic.

### Visual Signature
- **Style Definition**: Sophisticated dark glassmorphism. Surfaces do not feel merely simulated; they behave like calibrated optics—translucent layers floating in atmospheric purple depths.
- **Tone**: Focused, crystalline, precise, and technologically advanced. It rejects flat utilitarian drabness while avoiding gimmicky over-stylization.
- **Lighting & Diffusion**: Dual-axis subtle directional highlights across card tops, paired with radial atmospheric glow anchors that emphasize focus, board hierarchy, and active cursor interactions.

## Colors

The palette is engineered around deep violet space, radiant active boundaries, and crisp white signals. 

### Palette Structure
- **Canvas Root**: Deepest void violet (`#090514` to `#0F0A1E`), providing infinite contrast for optical blur layers.
- **Glass Surfaces**:
  - `Surface 0 (Column Base)`: `rgba(26, 16, 49, 0.55)` with 20px blur.
  - `Surface 1 (Card Default)`: `rgba(45, 27, 84, 0.42)` with 16px blur and `1px solid rgba(167, 139, 250, 0.12)`.
  - `Surface 2 (Card Hover / Modal)`: `rgba(76, 29, 149, 0.52)` with 24px blur and `1px solid rgba(196, 181, 253, 0.28)`.
- **Accents**:
  - `Primary Violet` (`#7C3AED`): Key actions, brand markers, and selected states.
  - `Luminous Lavender` (`#A78BFA`): Borders, high-legibility icons, and muted tags.
  - `Crisp White` (`#FFFFFF`): High-priority typography, interactive targets, and top-tier counters.
  - `Telemetry Rose` (`#F472B6`): Blockers, urgent milestones, and high-priority flags.
  - `Telemetry Mint` (`#34D399`): Completed items, passing pipelines, and done statuses.

## Typography

The typography couples geometric personality with analytical legibility:
- **Headlines & Badges (`Plus Jakarta Sans`)**: Delivers friendly, modern authority with tight geometry and open counters that remain sharp against frosted glass backgrounds.
- **Interface & Prose (`Inter`)**: Neutral, highly legible at micro-sizes (11–13px) for dense task metadata, checklists, and descriptions.
- **Code & IDs (`JetBrains Mono`)**: Provides clear mono-spacing for task keys, git commit references, and sprint IDs.

## Layout & Spacing

A disciplined 8pt vertical cadence paired with fluid horizontal lanes designed specifically for high-throughput kanban boards.

### Viewport Structures
- **Desktop (1024px+)**:
  - Fixed horizontal canvas scroll with sticky column headers.
  - Column Width: `304px` locked width, `gutter-desktop` (24px) column spacing.
  - Board padding: `margin-desktop` (32px) around all workspace perimeters.
- **Tablet (768px – 1023px)**:
  - Snap-scrolling columns at `280px` width.
  - Side margins drop to 20px; gutter drops to 16px.
- **Mobile (<768px)**:
  - Single-column visible at 88vw width with edge peaking for adjacent columns.
  - Bottom navigation bar floating with 16px safe-area offsets.

## Elevation & Depth

Depth is established through backdrop blur variations, layered refraction lines, and radial purple atmospheric glows rather than opaque drop shadows.

### Glassmorphism & Shadow Stack
1. **Level 0 (App Shell & Lanes)**:
   - `background`: `rgba(18, 11, 36, 0.65)`
   - `backdrop-filter`: `blur(24px)`
   - `border`: `1px solid rgba(255, 255, 255, 0.05)`
   - `box-shadow`: None.
2. **Level 1 (Kanban Cards & List Elements)**:
   - `background`: `rgba(45, 27, 84, 0.40)`
   - `backdrop-filter`: `blur(14px)`
   - `border-top`: `1px solid rgba(255, 255, 255, 0.16)`
   - `border-sides-bottom`: `1px solid rgba(124, 58, 237, 0.18)`
   - `box-shadow`: `0 4px 20px -2px rgba(9, 5, 20, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.12)`
3. **Level 2 (Active Dragging / Focused Overlays)**:
   - `background`: `rgba(76, 29, 149, 0.65)`
   - `backdrop-filter`: `blur(20px)`
   - `border`: `1px solid rgba(167, 139, 250, 0.45)`
   - `box-shadow`: `0 16px 36px -4px rgba(0, 0, 0, 0.65), 0 0 24px 2px rgba(124, 58, 237, 0.40)`
4. **Level 3 (Modals & Command Center)**:
   - `background`: `rgba(20, 11, 40, 0.85)`
   - `backdrop-filter`: `blur(32px)`
   - `border`: `1px solid rgba(196, 181, 253, 0.22)`
   - `box-shadow`: `0 24px 60px -8px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.2)`

## Shapes

The interface embraces a balanced rounded silhouette (Scale 2), reinforcing a tactile, pebble-smooth feel across all glass planes.

- **Kanban Cards**: `12px` (0.75rem) corner radius.
- **Board Columns / Containers**: `16px` (1rem) corner radius.
- **Pills, Badges & Chips**: Fully circular (`9999px`) for high-contrast tag readability.
- **Action Buttons & Inputs**: `8px` (0.5rem) to preserve structured alignment in toolbars.

## Components

### 1. Kanban Cards
- **Structure**: Multi-layered card featuring top label pill container, card title, task checklist progress ring, member avatar stack, and metadata footer (due date, attachment counts).
- **Surface**: Translucent base (`rgba(45, 27, 84, 0.35)`), changing to violet tint (`rgba(109, 40, 217, 0.35)`) on hover.
- **Dragging State**: Scaled to `1.02`, rotated `1.5deg`, dynamic purple bloom shadow (`0 0 20px rgba(124, 58, 237, 0.45)`).

### 2. Column Containers
- **Header**: Sticky glass panel with column title, task counter chip (`label-sm`), and icon quick-actions.
- **Body**: Scrollable lane with custom translucent scroll track.
- **Footer**: Inline Ghost button for quick task generation.

### 3. Metadata Badges & Chips
- **Sizing**: Fixed `22px` height, `8px` horizontal padding.
- **Priority Variant (Urgent)**: `rgba(244, 114, 182, 0.15)` fill, `1px solid rgba(244, 114, 182, 0.35)`, `#F472B6` text.
- **Tag Variant (Violet)**: `rgba(124, 58, 237, 0.20)` fill, `1px solid rgba(167, 139, 250, 0.30)`, `#DDD6FE` text.
- **Due Date Indicator**: If overdue, border shifts to intense crimson glow; if impending, amber glow; normal dates remain muted lavender.

### 4. Interactive Buttons
- **Primary Action**: Gradient fill (`linear-gradient(135deg, #7C3AED, #6D28D9)`), white text, top inner bevel line (`inset 0 1px 0 rgba(255,255,255,0.3)`).
- **Secondary Glass**: `rgba(255, 255, 255, 0.06)` fill, `1px solid rgba(255, 255, 255, 0.12)`, text `#FFFFFF`. Hover transitions to `rgba(255, 255, 255, 0.12)` fill with violet border glow.

### 5. Inputs & Inline Editors
- **States**: Resting has no outer border, only glass fill. Focus invokes an outer ring of `2px solid #7C3AED` and a soft purple halo (`box-shadow: 0 0 12px rgba(124, 58, 237, 0.3)`).

### 6. Avatar Stacks
- Overlapping circle units with `-8px` margin.
- Each avatar is bordered with a `2px solid #090514` knock-out edge to maintain separation over dynamic backgrounds.