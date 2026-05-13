---
name: Indigo SaaS Core
colors:
  surface: '#fcf8ff'
  surface-dim: '#dcd8e5'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2ff'
  surface-container: '#f0ecf9'
  surface-container-high: '#eae6f4'
  surface-container-highest: '#e4e1ee'
  on-surface: '#1b1b24'
  on-surface-variant: '#464555'
  inverse-surface: '#302f39'
  inverse-on-surface: '#f3effc'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#fcf8ff'
  on-background: '#1b1b24'
  surface-variant: '#e4e1ee'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 24px
  container-max: 1280px
---

## Brand & Style

The design system is engineered for high-growth SaaS environments where clarity and professional authority are paramount. The aesthetic follows a **Modern Corporate** direction, blending minimalist efficiency with a sophisticated indigo-led color theory. 

The visual language emphasizes high information density without sacrificing legibility. It leverages a rigorous mathematical approach to layout and a restricted color palette to evoke a sense of reliability and technical excellence. The target audience expects a tool that feels like an extension of their workflow: unobtrusive, high-performing, and aesthetically polished.

## Colors

The palette is anchored by a deep Indigo primary, specifically chosen for its high-contrast accessibility against white backgrounds. The neutral scale utilizes refined Slates, which contain a subtle blue undertone to maintain harmony with the indigo primary.

- **Primary (#4F46E5):** Used for main actions, active states, and brand-critical indicators.
- **Secondary (#6366F1):** Utilized for hover states of primary elements and supporting UI accents to provide depth.
- **Neutrals (#0F172A to #F8FAFC):** A 10-step slate scale. #0F172A is reserved for primary headings and "Ink" text, while #F8FAFC serves as the foundation for background surfaces.
- **High Contrast:** Text-to-background ratios must strictly adhere to WCAG AA standards, favoring Slate 900 for body text on white surfaces.

## Typography

This design system exclusively utilizes **Inter** to leverage its exceptional legibility in digital interfaces and its utilitarian, professional character. 

The type hierarchy is built on a tight scale to maintain a systematic feel. Headlines utilize slightly tighter letter-spacing and heavier weights to create a strong visual anchor. Body text is optimized for long-form reading with a generous 1.5x line height. Labels and small metadata use medium or semi-bold weights to ensure they remain legible even at reduced scales.

## Layout & Spacing

The layout is governed by a **fixed-fluid hybrid grid**. Main content areas are constrained to a 1280px container, while internal dashboards utilize a 12-column fluid system with 24px gutters.

The spacing rhythm is strictly based on a 4px baseline. All padding, margins, and component heights must be multiples of 4px. This ensures vertical rhythm and consistent density across different screen sizes. For complex SaaS tables and data-heavy views, the "md" (16px) spacing unit serves as the standard padding for cells and containers.

## Elevation & Depth

Hierarchy in this design system is established through **Tonal Layering** and **Ambient Shadows**. Instead of heavy borders, depth is created by placing elements on slightly different neutral planes (e.g., a white card on a Slate 50 background).

- **Level 0 (Base):** Slate 50 background.
- **Level 1 (Cards/Surface):** White background with a subtle 1px border in Slate 200.
- **Level 2 (Popovers/Modals):** White background with a highly diffused, low-opacity shadow (Color: Slate 900, Alpha: 0.08, Blur: 20px).
- **Level 3 (Dropdowns):** Sharp, small-radius shadows to indicate immediate proximity to the surface below.

## Shapes

The shape language is defined as **Rounded**, providing a approachable yet disciplined look. 

- **Standard Elements (Buttons, Inputs):** 8px (0.5rem) corner radius.
- **Small Elements (Checkboxes, Tags):** 4px (0.25rem) corner radius.
- **Large Elements (Cards, Modals):** 16px (1rem) corner radius.

Avoid fully pill-shaped buttons for primary actions to maintain the professional, structured aesthetic of the grid. Reserve pill shapes only for status indicators (Badges) and specialized "copy-to-clipboard" chips.

## Components

The component library prioritizes functional clarity and interaction feedback.

- **Buttons:** Primary buttons use the Indigo #4F46E5 background with White text. Secondary buttons use a Slate 100 background or a ghost-style Slate 200 border. Use 16px horizontal and 10px vertical padding for standard sizes.
- **Input Fields:** Use a white background with a 1px Slate 300 border. On focus, the border transitions to Indigo #4F46E5 with a subtle 2px Indigo glow (alpha 0.1).
- **Chips & Badges:** Subtle backgrounds (e.g., Indigo 50) with Indigo 700 text. Use the `label-sm` typography style for these elements.
- **Cards:** White fill, 1px Slate 200 border, and 24px internal padding. Avoid shadows on standard dashboard cards to keep the UI flat and fast; save shadows for floating overlays.
- **Checkboxes:** When active, fill with Indigo #4F46E5. Use the 4px radius to ensure they feel consistent with the broader design system's shape language.
- **Data Tables:** Use Slate 50 for the header background and 1px horizontal dividers in Slate 100. Remove vertical dividers to maintain a modern, airy feel.