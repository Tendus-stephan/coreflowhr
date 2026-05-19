---
name: Coreflow
description: AI-first applicant tracking system for in-house and agency recruiters.
colors:
  action: "#111827"
  accent: "#2563eb"
  accent-subtle: "#eff6ff"
  shell: "#f9fafb"
  surface: "#ffffff"
  border-default: "#f3f4f6"
  border-strong: "#e5e7eb"
  text-primary: "#111827"
  text-secondary: "#6b7280"
  text-tertiary: "#9ca3af"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontVariation: "'opsz' 28"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.07em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "#1f2937"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "#f3f4f6"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "#374151"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  nav-item-active:
    backgroundColor: "#f3f4f6"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Coreflow

## 1. Overview

**Creative North Star: "The Steady Hand"**

Coreflow is a precision tool for people already under pressure. In-house recruiters and agency professionals spend hours inside this interface on deadline: moving candidates, scheduling interviews, sending offers, tracking pipeline across dozens of open roles. The design system earns their trust by making itself invisible. No motion that announces itself. No color that decorates rather than communicates. No hierarchy that competes with the work below it.

The aesthetic owes to Attio: flat surfaces, border-only depth, Inter set tight with optical sizing. Everything reads at a glance. The interface is a table, not a theater. Information arrives cleanly, departs cleanly. Cognitive load is the enemy and every design decision is measured against it.

This is not enterprise software dressed down, nor a generic SaaS template dressed up. It shares no DNA with SAP SuccessFactors, BambooHR, or the Tailwind starter with the blue gradient hero and three-column feature grid. It is closer to a trading terminal than a productivity app: specific, fast, serious, and entirely confident in its priorities.

**Key Characteristics:**
- Flat surfaces with border-only elevation. No decorative shadows at any resting state.
- Gray-900 as the primary action color. Blue is reserved exclusively for notification state.
- Inter with tight negative tracking and optical sizing across all text roles.
- Pill-shaped buttons against square-to-gently-rounded containers: a clear interaction grammar.
- Status semantics delivered through badge color, never through animation.
- Breathing room through varied spacing, not through decoration.


## 2. Colors: The Still Palette

A near-achromatic system: the full gray spectrum does structural work, and a single cold blue interrupts only where it means something.

### Primary
- **Action Black** (`#111827`): Every CTA button, primary text, active navigation states. Gray-900, not true black; there is a human warmth at close range that true black erases.

### Secondary
- **Notification Blue** (`#2563eb`): Used in exactly two contexts: notification dot badges on the sidebar, and link-style affordances within data tables. Its rarity is the point. If blue appears elsewhere, it is a mistake, not a design choice.
- **Accent Surface** (`#eff6ff`): The background halo behind blue text in status chips. Never used as a container background.

### Neutral
- **Page Shell** (`#f9fafb`): The app background. Off-white with just enough cool gray to distinguish it from surface panels.
- **Surface White** (`#ffffff`): Cards, sidebar, modals, dropdowns. The highest visual layer in the flat stack.
- **Border Default** (`#f3f4f6`): Default hairline borders. Separates panels without drawing the eye.
- **Border Strong** (`#e5e7eb`): Table rules, dividers, section separators where the edge needs to register.
- **Text Primary** (`#111827`): Headings, active labels, kanban card names.
- **Text Secondary** (`#6b7280`): Body copy, column labels, metadata, pipeline stage names.
- **Text Tertiary** (`#9ca3af`): Placeholder text, disabled states, overline category labels.

### Named Rules
**The One Blue Rule.** Blue (`#2563eb`) appears only on notification badges and data-table link affordances. It does not appear in buttons, hero elements, backgrounds, or decorative accents. Its sole job is "you have a message." Anything else strips the signal of its meaning.


## 3. Typography

**Display / Body Font:** Inter (variable, with optical sizing and negative tracking enabled)

**Character:** Inter at tight negative tracking reads as controlled and precise without coldness. The optical sizing (`font-variation-settings: 'opsz' 28`) gives headings a subtly wider letterform than body text, producing hierarchy through form as much as through scale. The result is a type system that feels designed, not defaulted.

### Hierarchy
- **Display** (700, clamp(1.75rem, 4vw, 2.5rem), line-height 1.1, -0.02em): Page-level titles. Empty states, onboarding headers, and any moment needing authority at scale.
- **Headline** (600, 1.25rem / 20px, line-height 1.2, -0.02em): Section headings. Kanban column titles. Primary modal headers.
- **Title** (600, 1rem / 16px, line-height 1.3, -0.015em): Card headings, form group labels, sidebar subsection headings.
- **Body** (400-500, 0.875rem / 14px, line-height 1.5, normal tracking): All running content. Pipeline card copy, form field text, notification messages. Max line length 65ch.
- **Label** (600, 0.6875rem / 11px, line-height 1.4, +0.07em tracking, UPPERCASE): Navigation section dividers ("MENU"), table column headers, overline category markers. Uppercase is functional, not decorative, and is confined to this role only.

### Named Rules
**The No-Uppercase-Creep Rule.** Uppercase is reserved for `.label-overline` instances: navigation section dividers, table column headers, and static category markers. Button labels, card titles, and body copy are always sentence case. Using uppercase for emphasis in body or UI copy is prohibited; use font-weight 600 or color shift instead.


## 4. Elevation

Flat by default. Structural on lift only.

This system uses borders, not shadows, to establish depth. The `box-shadow` override in `index.css` forces all `shadow-sm` instances to zero. Cards and panels stack through tonal layering: page shell (`#f9fafb`) underneath, surface white (`#ffffff`) on top, separated by a hairline border. Depth is distance from the shell color, not height above it.

Two shadow tiers survive this discipline: modal-class lifts for dialogs that genuinely float above the document, and dropdown lifts for portaled menus.

### Shadow Vocabulary
- **Flat (default):** `box-shadow: none`. Cards, sidebar panels, inline containers. The border carries the edge.
- **Modal lift:** `0 20px 60px -10px rgba(0,0,0,0.16), 0 8px 24px -8px rgba(0,0,0,0.08)`. Dialogs, command palettes, overlays that physically sit above the interface layer.
- **Dropdown lift:** `0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)`. Portaled select panels, context menus, tooltip panels.

### Named Rules
**The Flat-By-Default Rule.** A surface is flat unless it physically floats above the document (modal, portaled dropdown, tooltip). Hover states shift border color from `border-default` to `border-strong`; they do not introduce a shadow. If you find yourself adding `box-shadow` to a card, the answer is almost certainly a border shift instead.


## 5. Components

### Buttons
Pill-shaped throughout. The fully rounded button against the square-to-gently-rounded containers below creates a reliable interaction grammar: pill means "do this," corner radius means "this is content."

- **Shape:** 9999px radius (fully rounded pill) on all variants and sizes
- **Primary (black):** `#111827` background, white text, 10px 20px padding (md size). Hover: `#1f2937`. Active: `#030712`. Micro-press on active: `scale(0.97)`, 150ms ease-out.
- **Secondary:** `#f3f4f6` background, `#111827` text, `1px solid #e5e7eb` border. Hover: `#e5e7eb` background, `#d1d5db` border.
- **Outline:** Transparent background, `1px solid #d1d5db` border, `#374151` text. Hover: border shifts to `#111827`, text shifts to `#111827`, `#f9fafb` background.
- **Ghost:** Transparent, no border, `#6b7280` text. Hover: `#f3f4f6` background, `#111827` text. Used for de-emphasized actions in dense layouts.
- **White:** `#ffffff` background, `1px solid #e5e7eb` border, black text. Used when the surrounding context is colored.
- **Disabled (all variants):** 50% opacity, `cursor-not-allowed`. Scale-press suppressed.

### Status Badges
Pill chips for pipeline stage and system state. The only place semantic color appears in sustained volume.

- **Shape:** `border-radius: 9999px`, 11px text, font-weight 500, 1px border, 2px 8px padding
- **Neutral:** `#f3f4f6` bg / `#374151` text / `#e5e7eb` border. Default or unclassified states.
- **Green:** `#f0fdf4` bg / `#15803d` text / `#bbf7d0` border. Active, hired, offer sent.
- **Blue:** `#eff6ff` bg / `#1d4ed8` text / `#bfdbfe` border. Screening, interview stages.
- **Amber:** `#fffbeb` bg / `#b45309` text / `#fde68a` border. Pending, waitlist, requires action.
- **Red:** `#fef2f2` bg / `#dc2626` text / `#fecaca` border. Rejected, error, expired.

### Cards / Containers
- **Corner Style:** 12px radius (lg) for card containers. 8px (md) for inline panels and sidebar rows. 16px (xl) for modals and popovers.
- **Background:** Surface white (`#ffffff`).
- **Shadow Strategy:** None at rest. See Elevation.
- **Border:** `1px solid #f3f4f6` at rest; `1px solid #e5e7eb` on hover.
- **Internal Padding:** 24px for card interiors. 12px for compact sidebar rows and inline panels.

### Inputs / Fields
- **Style:** White background, `1px solid #e5e7eb` border (border-strong, not border-default), 8px radius. Slightly more presence than resting cards.
- **Focus:** Border shifts to `#9ca3af` (gray-400). No focus ring, no glow, no outline. The shift is sufficient.
- **Placeholder:** Text tertiary (`#9ca3af`).
- **Error:** Red text (`#dc2626`) below the field. Border shifts to `#fca5a5`. No red background fill.
- **Disabled:** 50% opacity, `cursor-not-allowed`.

### Navigation (Sidebar)
- **Container:** 240px fixed-left. `#f9fafb` background, `1px solid #e5e7eb` right border.
- **Nav items:** 13px text, font-weight 500, 8px radius, `8px 12px` padding.
- **Default:** `#6b7280` text, `#9ca3af` icon (14px), transparent background.
- **Hover:** `#374151` text, `#6b7280` icon, `rgba(243,244,246,0.5)` background.
- **Active:** `rgba(243,244,246,0.8)` background, `#111827` text and icon.
- **Section labels:** 10px, 600 weight, `#d1d5db` (gray-300) text, +0.1em tracking, UPPERCASE. Pattern: "MENU" divider before the main nav group.
- **Notification badge:** 18px circle, `#3b82f6` fill, white text at 10px. Inline-right of the nav label. The one place blue appears in the navigation.
- **Profile row:** Avatar + name (13px, 600) + role (11px, `#9ca3af`). Hover: `rgba(243,244,246,0.6)` tint.

### Kanban Pipeline Card (Signature Component)
The primary work surface. Every system decision is measured against legibility here.

- **Container:** Surface white, `1px solid #f3f4f6` border, 8px radius, no shadow at rest.
- **Hover:** Border shifts to `#e5e7eb`. No lift, no shadow introduction.
- **Content hierarchy:** Candidate name in Title weight (600, 1rem), role/company in Body (400, 14px, `#6b7280`), status badge inline-right.
- **Drag state:** Source card at 80% opacity. Destination column receives a subtle `#f3f4f6` background tint. No animation on the drag ghost.


## 6. Do's and Don'ts

### Do:
- **Do** use `#111827` as the primary CTA button color. The product deliberately avoids a blue CTA so blue retains its meaning as a notification signal.
- **Do** use border-only hierarchy: `#f3f4f6` at rest, `#e5e7eb` on hover or for stronger separators. No shadows on resting cards, rows, or panels.
- **Do** set Inter with `letter-spacing: -0.02em` and `font-optical-sizing: auto` on all headings (h1-h4). The tight tracking is load-bearing.
- **Do** use status badge colors (green, amber, red, blue, neutral) exclusively for pipeline stage and system-state communication. They carry semantic weight; diluting them with decorative use breaks the system.
- **Do** keep button shapes as pills (`border-radius: 9999px`) and container shapes as gently rounded rectangles (6-16px). The contrast is the interaction grammar.
- **Do** meet WCAG 2.1 AA minimum contrast. `#111827` on `#ffffff` is 16.1:1. `#6b7280` on `#ffffff` is 4.6:1; that is the floor for secondary text, not the target.
- **Do** respect `prefers-reduced-motion`: replace `transition-all` and `animate-in` with instant state changes. Fade and slide entrances are opt-in, not default.
- **Do** vary spacing for rhythm. The sidebar uses 4px, 8px, 12px, and 24px intentionally. Uniform padding everywhere is monotony.

### Don't:
- **Don't** build screens that look like legacy HR software (SAP SuccessFactors, Oracle HCM, Taleo): dense modal grids with "Save and Continue" pagination, enterprise-grey surfaces (`#cccccc`, `#dddddd`), or multi-step form wizards with no escape. That is the world Coreflow replaces.
- **Don't** build screens that look like generic Tailwind SaaS templates: blue gradient hero sections, three-column icon-heading-text feature grids, testimonial strips, floating action buttons. If a recruiter could confuse a Coreflow screen for any other SaaS product, the design has failed the anti-reference test.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe accent on cards, list items, callouts, or alerts. This is prohibited. Rewrite with a full border, a background tint, or a leading icon instead.
- **Don't** use gradient text (`background-clip: text` with a gradient background). Decorative, never meaningful. Use a solid color and adjust weight or size for emphasis.
- **Don't** add `box-shadow` to cards, sidebar panels, or table rows at any state. Only modals and portaled dropdowns are permitted to lift.
- **Don't** add blue (`#2563eb`) to buttons, backgrounds, hero elements, or decorative patterns. If blue appears outside a notification badge or a data-table link, remove it.
- **Don't** use uppercase text outside `.label-overline` contexts. Uppercase in button labels, headings, or body copy reads as either shouting or cargo-culting a style choice without understanding it.
- **Don't** add glassmorphism (`backdrop-filter: blur`), gradient overlays, or any translucent surface treatment to the product UI. This is not a consumer app and the aesthetic does not fit the user's context.
- **Don't** place animations on layout properties (`height`, `width`, `padding`, `margin`, `top`, `left`). Animate `opacity` and `transform` only.
