---
name: Modern B2B Fintech System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#3130c0'
  on-tertiary: '#ffffff'
  tertiary-container: '#4b4dd8'
  on-tertiary-container: '#d9d8ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
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
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
  currency-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
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

The design system establishes a focused, high-precision B2B fintech atmosphere tailored for Colombian independent professionals, agencies, and SMEs. Drawing inspiration from modern productivity platforms like Linear and Stripe, the aesthetic rejects visual clutter in favor of crisp delineation, institutional trust, and high cognitive speed.

Key attributes:
- **Atmosphere:** Modern corporate with software-grade tactility. Quiet surfaces, meticulous alignment, and vivid operational signals.
- **Tone:** Methodical, reliable, transparent, and authoritative regarding tax and monetary compliance.
- **Visual Movement:** Corporate Modern meets Linear-inspired utility: low-elevation layering, hairline slate borders (`#E2E8F0`), refined badge indicators, and zero decorative fluff.

## Colors

The palette balances authoritative deep indigo tones with functional utility signals and neutral slate surfaces.

- **Primary (`#4F46E5` / `#4338CA`):** Anchors main actions, PDF creation, active navigation tabs, and key financial summaries.
- **Secondary (`#10B981` / `#059669`):** Reserved for Colombian operational hooks (WhatsApp quotation distribution) and positive states (Cotización Aprobada, Pagada, Retenciones Validadas).
- **Tertiary (`#6366F1`):** Interactive highlights, keyboard navigation focus rings, and soft selected-state container fills (`#EEF2FF`).
- **Neutrals:** A slate spectrum running from pure white canvas cards (`#FFFFFF`) over muted scaffolding backdrops (`#F8FAFC`) to balanced text hierarchy (`#0F172A` headlines, `#475569` labels, `#94A3B8` placeholders).

### Semantic Status Tokens
- **Borrador (Draft):** Amber tint (`#F59E0B` text on `#FEF3C7` container).
- **Enviada (Sent):** Sky tint (`#0284C7` text on `#E0F2FE` container).
- **Aprobada / Aceptada:** Emerald tint (`#059669` text on `#D1FAE5` container).
- **Rechazada / Anulada:** Rose tint (`#E11D48` text on `#FFE4E6` container).

## Typography

Typography combines **Plus Jakarta Sans** for crisp, geometric headers and **Inter** for dense, tabular clarity across forms and numerical ledger tables.

- **Numerals:** Financial figures, NITs, and COP totals must employ `font-feature-settings: "tnum" on, "cv05" on` to enforce tabular monospacing and clean vertical column alignment.
- **Form Labels:** Upper-small tracking (`label-sm` with `letter-spacing: 0.04em`, uppercase) is used strictly for field groups (e.g., `NIT / CÉDULA`, `PRECIO UNITARIO COP`, `RETENCIÓN`).

## Layout & Spacing

The layout uses a structured 12-column desktop grid with a maximum content container width of `1200px`, centered on the canvas.

- **Workspace Split:** The quotation engine deploys an asymmetrical 7:5 split (7 columns for fiscal entity & line items; 5 columns for live summary cards and Colombian tax withholdings) on viewports above `1024px`.
- **Form Factor Adaptations:**
  - **Desktop (≥ 1024px):** Dual-column layout; summary calculation panel can dock or remain sticky alongside line item creation.
  - **Tablet (768px - 1023px):** Single column with stacked blocks, `gutter: 1rem`.
  - **Mobile (< 768px):** Single column, inline card gutters (`0.75rem`), and floating persistent action bar pinned to the bottom viewport.

## Elevation & Depth

Visual depth is achieved through **low-contrast outlines combined with ambient, diffused shadows**. Elements avoid high-opacity drop shadows to preserve SaaS clarity.

- **Level 0 (Canvas):** Background `#F8FAFC`, flat.
- **Level 1 (Cards & Data Panels):** Background `#FFFFFF`, border `1px solid #E2E8F0`, shadow `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Popovers, Dropdowns & Interactive Modals):** Background `#FFFFFF`, border `1px solid #CBD5E1`, shadow `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Sticky Action Dock):** Floating footer bar with backdrop blur (`backdrop-filter: blur(12px)`), background `rgba(255, 255, 255, 0.9)`, border `1px solid #E2E8F0`, shadow `0 20px 25px -5px rgba(15, 23, 42, 0.1)`.
- **Total Banner Highlight:** Deep brand elevation using a subtle inner inset ring `inset 0 1px 0 rgba(255, 255, 255, 0.15)` over `#4338CA` or `#1E1B4B`.

## Shapes

The system relies on medium-curved boundaries (`roundedness: 2`), yielding calibrated corner radiuses:

- **Base radius (0.5rem / 8px):** Standard input fields, table rows, inner form groupings, and nested selects.
- **Card radius (`rounded-lg`, 0.75rem - 1rem / 12px - 16px):** Primary form wrappers, client info sections, and calculation containers.
- **Pill radius (`rounded-full`, 9999px):** Status badges (Borrador, Enviada), promotional tags (`100% Gratis`), and user avatar chips.

## Components

### Buttons
- **Primary Action (PDF Download, Guardar):** Solid `#4F46E5`, text `#FFFFFF`, font weight 600. Subtle hover transition to `#4338CA`. Active state scales to `0.98`.
- **WhatsApp Action:** Solid `#10B981`, text `#FFFFFF`, icon prefix (20px SVG), hover `#059669`.
- **Secondary / Ghost:** Transparent background, border `1px solid #E2E8F0`, text `#334155`, hover `#F1F5F9`.
- **Destructive:** Solid `#EF4444` or subtle `#FEE2E2` with `#B91C1C` text for line-item deletions.

### Input Fields & Selects
- Height `42px`, padding `0 12px`, border `1px solid #CBD5E1`, background `#FFFFFF`.
- Typography: Inter 14px regular (`#0F172A`).
- Focus state: Border `#4F46E5` with `0 0 0 3px rgba(79, 70, 229, 0.12)`.
- Floating labels or uppercase micro-headers (`label-sm`, `#64748B`).

### Status Badges
- Inline flex pills with `padding: 2px 10px`, `border-radius: 9999px`, font size 12px, font weight 600.
- Dot indicator: 6px circular dot embedded before status text.

### Colombian Tax Calculation Ledger (Desglose de Impuestos)
A dedicated structured module with real-time math:
- **Subtotal:** Neutral slate row, aligned currency.
- **IVA (0%, 5%, 19%):** Toggle or select dropdown with computed COP display.
- **Retenciones (ReteFuente 2.5% / 3.5% / 11%, ReteICA per mil):** Indented negative offsets styled with subtle warning/slate markers (`- $XX.XXX`).
- **Total Neto en COP:** Featured hero block with high-contrast text (`currency-display`, `#0F172A` or inverted brand container `#4F46E5`), displaying formatted Colombian pesos (e.g., `$ 1.250.000 COP`).

### Sticky Action Dock
Bottom-anchored bar across viewport widths displaying quick metadata (Total, Estado) and immediate execution triggers (`Vista previa`, `Descargar PDF`, `Compartir por WhatsApp`).