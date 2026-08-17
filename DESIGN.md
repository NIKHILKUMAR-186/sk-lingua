---
name: Lingua
description: A managed language-learning platform matching students with mentors.
colors:
  primary: "oklch(0.55 0.2 260)"
  secondary: "oklch(0.94 0.04 285)"
  neutral-bg: "oklch(0.99 0.005 260)"
  neutral-surface: "oklch(1 0 0)"
  neutral-text: "oklch(0.18 0.03 265)"
  neutral-muted: "oklch(0.5 0.03 260)"
  semantic-success: "oklch(0.65 0.16 155)"
  semantic-warning: "oklch(0.78 0.15 75)"
  semantic-destructive: "oklch(0.6 0.22 25)"
  semantic-electric: "oklch(0.5 0.2 250)"
typography:
  display:
    fontFamily: "\"Instrument Serif\", Georgia, serif"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "\"Sora\", system-ui, sans-serif"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  body:
    fontFamily: "\"Inter\", system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "\"Inter\", system-ui, sans-serif"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{label}"
  button-primary-hover:
    backgroundColor: "oklch(0.5 0.2 260)"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{label}"
  card:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
    border: "1px solid {colors.neutral-muted} opacity-0.2"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.neutral-muted}"
    padding: "8px 12px"
    typography: "{body}"
  badge-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "2px 10px"
    typography: "{label}"
---

# Design System: Lingua

## Overview

**Creative North Star: "The Fluent Mind"**

Lingua is designed around clarity, flow, and intellectual warmth. The interface treats language learning as an act of thinking and connection, not transaction. Every screen should feel like a well-lit study: precise, calm, and human-centered.

Brand lives in restraint. The primary accent appears sparingly to guide attention, while the bulk of the surface remains cool and breathable. Depth is conveyed through subtle tonal layering and restrained elevation rather than heavy ornamentation.

**Key Characteristics:**
- Cool-paper surfaces with ink-dark text
- Deep violet-primary used as directional signal, not decoration
- Generous whitespace with 8/16/24px rhythm
- Typography pairing of Instrument Serif, Sora, and Inter
- Subtle motion that supports comprehension without distraction

## Colors

The palette is built on a cool-paper foundation with a deep violet-primary that signals trust, authority, and intellectual clarity.

### Primary
- **Twilight Auth** (`oklch(0.55 0.2 260)`): The signature accent. Used for primary CTAs, active navigation states, streak indicators, and brand moments. Its depth reads as confident without aggressive.

### Secondary
- **Soft Violet Glow** (`oklch(0.94 0.04 285)`): A low-saturation violet tint used for hover states, selected backgrounds, and subtle section dividers. It extends the primary family without competing.

### Neutral
- **Cool Paper** (`oklch(0.99 0.005 260)`): The default background. Slightly cool-tinted white that reduces eye strain during long study sessions.
- **Pure Surface** (`oklch(1 0 0)`): Card and popover backgrounds. Stark white to create clear containment hierarchy.
- **Deep Ink** (`oklch(0.18 0.03 265)`): Primary text. Near-black with a cool cast that keeps headlines crisp.
- **Medium Slate** (`oklch(0.5 0.03 260)`): Muted text, placeholders, and secondary labels. Sufficient contrast for readability without demanding full attention.

### Semantic
- **Vital Green** (`oklch(0.65 0.16 155)`): Success states, streak completion, and positive confirmations.
- **Warm Amber** (`oklch(0.78 0.15 75)`): Warning states and time-sensitive notices.
- **Signal Red** (`oklch(0.6 0.22 25)`): Destructive actions and critical errors.
- **Electric Blue-Violet** (`oklch(0.5 0.2 250)`): Live status indicators, presence dots, and time-sensitive highlights.

### Named Rules
**The Twilight Auth Rule.** Primary appears on ≤15% of any given screen. Its rarity is the point; overuse dilutes direction into decoration.

## Typography

**Display Font:** Instrument Serif (with Georgia, serif fallback)  
**Headline Font:** Sora (with system-ui, sans-serif fallback)  
**Body Font:** Inter (with system-ui, sans-serif fallback)

The pairing balances humanist warmth with geometric precision. Instrument Serif carries editorial authority for hero moments; Sora provides clean hierarchy for section titles; Inter delivers high readability for sustained study and operational tasks.

### Hierarchy
- **Display** (400, clamp/display, 1.0/1.1 line-height): Hero headlines, landing page titles, and major section openers.
- **Headline** (600, section scale, 1.1 line-height, -0.04em spacing): Dashboard titles, card headers, and route-level headings.
- **Body** (400, base/16px, 1.5 line-height): Reading content, session descriptions, notes, and long-form text.
- **Label** (500, 14px, 1.4 line-height): Button text, form labels, navigation items, and status badges.

### Named Rules
**The One Voice Rule.** Every screen uses at most two type families. Instrument Serif is reserved for display; Sora and Inter share the operational voice.

## Layout

The system uses a flexible grid built on Tailwind utilities. Authenticated routes employ a persistent sidebar (270px expanded, 72px collapsed) with a fluid main content area. Landing and marketing surfaces use full-width sections with contained content blocks.

Spacing follows an 8px base grid: 4, 8, 16, 24, 32. This rhythm appears in card padding, section gaps, and form vertical rhythm. Containers typically cap at roughly 1200–1400px for reading comfort, with intentional edge-to-edge moments for immersive landing sections.

Responsive behavior shifts at standard breakpoints. The sidebar collapses to an overlay on mobile. Card grids reflow from multi-column to single-column. Typography scales down modestly rather than reflowing entirely.

## Elevation & Depth

The system is tonal and restrained. Surfaces are flat at rest. Depth is conveyed through background color shifts, subtle borders, and controlled shadow vocabulary rather than heavy layering.

### Shadow Vocabulary
- **Soft Hover** (`box-shadow: 0 4px 20px -8px oklch(0.4 0.15 260 / 0.15)`): Buttons and interactive cards on hover. Diffuse and close to the surface.
- **Lifted Card** (`box-shadow: 0 1px 1px oklch(0.2 0.04 265 / 0.03), 0 8px 30px -10px oklch(0.35 0.12 265 / 0.18)`): Elevated cards and modals. Creates separation without harsh edges.
- **Brand Glow** (`box-shadow: 0 0 60px -18px var(--primary)`): Primary CTAs and active streak indicators. The glow extends the primary color into the surrounding space.
- **Electric Glow** (`box-shadow: 0 0 60px -14px var(--electric)`): Live session indicators and presence dots. Cooler temperature than the brand glow.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, elevation, focus).

## Shapes

Corners are consistently rounded using a coherent radius scale. The base radius is 12px, with variants from 8px to 20px.

- **Buttons and inputs:** 8px (`rounded-md`) — tight enough to feel precise, open enough to avoid harshness.
- **Cards and containers:** 16px (`rounded-xl`) — the signature shape of the system. Conveys containment without aggressive geometry.
- **Modals and sheets:** 12px (`rounded-lg`) — halfway between control and container.
- **Pills and badges:** 8px (`rounded-md`) — consistent with buttons.

Borders are subtle: 1px strokes using the neutral palette at low opacity. Clipping is avoided except in avatar and image contexts, where `overflow-hidden` with matching radius preserves alignment.

## Components

### Buttons
- **Shape:** Gently rounded (8px)
- **Primary:** Twilight Auth background (`oklch(0.55 0.2 260)`) with Cool Paper text. Medium weight label typography. 8px vertical / 16px horizontal padding.
- **Hover / Focus:** Darkens 5% on hover. Focus ring uses the ring token for accessibility.
- **Secondary:** Cool Paper surface with Deep Ink text and subtle shadow.
- **Ghost:** Transparent background with accent hover treatment.
- **Destructive:** Signal Red background with Cool Paper text.

### Cards / Containers
- **Corner Style:** Gently rounded (16px)
- **Background:** Pure surface white (`oklch(1 0 0)`) on Cool Paper; sidebar uses Very Light Cool Gray (`oklch(0.985 0.005 260)`).
- **Shadow Strategy:** Flat at rest; lifted shadow on hover for interactive cards.
- **Border:** 1px stroke using neutral-muted at very low opacity.
- **Internal Padding:** 16px (md) for card content, 24px (lg) for card header/footer.

### Inputs / Fields
- **Style:** Stroke-only with transparent background. 8px radius. 1px border in neutral-muted.
- **Focus:** Ring treatment using primary color. No background shift on focus.
- **Error / Disabled:** Error state uses Signal Red border. Disabled state reduces opacity to 50%.

### Navigation
- **Style:** Sidebar-based for authenticated routes. Icon + label layout with compact vertical rhythm.
- **Active state:** Primary background tint with primary-foreground text.
- **Hover:** Soft violet glow background.
- **Mobile:** Collapses to a triggerable overlay. Backdrop blur on the overlay surface.

### Badges / Chips
- **Style:** Inline-flex, 8px radius, 2px vertical / 10px horizontal padding.
- **Primary variant:** Twilight Auth background with Cool Paper text.
- **Secondary variant:** Cool Paper surface with Deep Ink text.
- **Destructive variant:** Signal Red background with Cool Paper text.

## Do's and Don'ts

### Do:
- **Do** use Twilight Auth on primary actions only. Let its rarity create urgency.
- **Do** keep body text on Cool Paper or Pure Surface. Never place long-form text on tinted backgrounds.
- **Do** use the 8px spacing grid. 4px increments exist for tight controls; 24px and 32px for section breathing room.
- **Do** pair Instrument Serif with Sora or Inter, never alone. Serif is display-only.
- **Do** use the shadow vocabulary as described. Do not invent new shadows.

### Don't:
- **Don't** place Twilight Auth text on non-white backgrounds without verifying contrast.
- **Don't** stack multiple accent colors in a single component. One accent per element.
- **Don't** use border-heavy outlines for primary interaction. Use shadow and tonal shift instead.
- **Don't** break the 8px rhythm with arbitrary spacing values like 7px, 13px, or 19px.
- **Don't** use decorative gradients on operational surfaces. Gradients are reserved for landing page hero moments only.
