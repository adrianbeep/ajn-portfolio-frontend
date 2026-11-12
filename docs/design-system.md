# Design System

Referencia completa del sistema de diseño del frontend. Pensado para hacer maquetas en Figma (o cualquier herramienta) que matcheen exactamente el look del código.

**Source of truth:** `src/styles/tokens.css` + `src/styles/global.css`. Si hay conflicto, gana el código.

---

## 1. Filosofía

**Motion/polished** — animaciones sutiles, hovers, page transitions, scroll-reveal. Cero JS donde se pueda. **No** es minimal/typography puro, **no** es bold/experimental (no 3D, no animaciones orquestadas, no hero WebGL).

El sitio se reduce a **HTML puro + 1-5kb de JS por isla** donde hace falta. La tipografía, el motion y la consistencia cargan el peso visual.

---

## 2. Colores

Sistema monocromo + un acento. Tres layers de elevación tonal (no de hue):

### Light theme (default)

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#FAFAFA` | Background de la página |
| `--color-surface` | `#FFFFFF` | Cards, inputs, topbar, login card |
| `--color-fg` | `#0A0A0A` | Texto principal (títulos, body) |
| `--color-muted` | `#6B7280` | Texto secundario (descripciones, fechas, hints) |
| `--color-border` | `#E5E5E5` | Bordes sutiles, separadores |
| `--color-accent` | `#2563EB` | Links, focus rings, CTAs primarios |
| `--color-accent-fg` | `#FFFFFF` | Texto sobre el acento |

### Dark theme

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#0A0A0A` | Background (near-black) |
| `--color-surface` | `#141414` | Cards (un nivel arriba del bg) |
| `--color-fg` | `#FAFAFA` | Texto principal |
| `--color-muted` | `#9CA3AF` | Texto secundario |
| `--color-border` | `#1F1F1F` | Bordes (casi invisibles) |
| `--color-accent` | `#3B82F6` | Acento (levemente más claro en dark) |
| `--color-accent-fg` | `#0A0A0A` | Texto sobre el acento |

### Estados (semánticos, hardcoded — no en tokens)

Los siguientes colores están usados en componentes específicos. No se promueven a tokens globales porque se usan poco y sería over-engineering.

| Estado | Light | Dark | Uso |
|---|---|---|---|
| Success | `#059669` | `#34D399` | "Active" badges, toasts de creado/actualizado/restaurado |
| Error | `#DC2626` | `#F87171` | Errores de validación, badges de "Deleted", toasts de delete |
| Warning | `#D97706` | `#FBBF24` | "Changing slug will break URL" warning |

Todos los estados se usan con `color-mix(in oklab, <state> 12-15%, transparent)` para el background, y el color puro para texto/border.

---

## 3. Tipografía

### Familias

| Familia | Uso | Carga |
|---|---|---|
| **Inter Variable** | Body, UI, párrafos, labels, botones | Self-hosted vía `@fontsource-variable/inter` |
| **Fraunces Variable** | Display: títulos h1/h2/h3, hero | Self-hosted vía `@fontsource-variable/fraunces` |
| **JetBrains Mono Variable** | Code blocks, badges, fechas, hints técnicos, eyebrow labels | Self-hosted vía `@fontsource-variable/jetbrains-mono` |

### Stack de fallback

```css
--font-sans: 'Inter Variable', system-ui, -apple-system, sans-serif;
--font-display: 'Fraunces Variable', Georgia, serif;
--font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
```

### Escala de tamaños

Los títulos usan `clamp()` para responsividad. Los UI elements usan `rem`.

| Elemento | Font | Tamaño | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|---|
| Hero title | Display | `clamp(2.5rem, 6vw, 4.5rem)` | 500 | -0.02em | 1.1 |
| Page title (h1) | Display | `clamp(2rem, 5vw, 3rem)` | 500 | -0.02em | 1.1 |
| Section title (h2) | Display | `1.5rem` | 500 | -0.02em | 1.2 |
| Card title (h3) | Display | `1.25rem` | 500 | -0.01em | 1.2 |
| Article title | Display | `clamp(2rem, 5vw, 3.5rem)` | 500 | -0.02em | 1.1 |
| Body / paragraphs | Sans | `1rem` | 400 | 0 | 1.5 |
| Body (large, article) | Sans | `1.125rem` (lede) / `1rem` | 400 | 0 | 1.6 / 1.7 |
| Body (small) | Sans | `0.9rem` | 400 | 0 | 1.5 |
| UI / button | Sans | `0.95rem` | 500 | 0 | inherit |
| UI (label) | Sans | `0.875rem` | 500 | 0 | inherit |
| UI (caption) | Sans | `0.85rem` | 400 | 0 | 1.4 |
| Eyebrow (sobre títulos) | Mono | `0.75rem` (compact) / `0.8rem` | 400 | 0.1em (uppercase) | inherit |
| Code inline | Mono | `0.875em` | 400 | 0 | inherit |
| Code blocks (pre) | Mono | `0.875rem` | 400 | 0 | 1.5 |
| Meta (fechas, etc.) | Mono | `0.875rem` | 400 | 0 | inherit |

### Features tipográficas activadas en body

- `font-feature-settings: 'cv11', 'ss01'` en `<html>` — activa character variants y stylistic set de Inter (mejor kerning, 'l' con tail, etc.)

### Headings base

```css
h1, h2, h3, h4 {
  font-family: var(--font-display);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
```

---

## 4. Spacing scale

Basada en múltiplos de 0.25rem (4px).

| Token | Valor | px | Uso típico |
|---|---|---|---|
| `--space-1` | 0.25rem | 4px | Microseparación, icon gaps |
| `--space-2` | 0.5rem | 8px | Entre label e input, gap en badges |
| `--space-3` | 0.75rem | 12px | Pequeños gaps verticales |
| `--space-4` | 1rem | 16px | Default entre párrafos / items |
| `--space-6` | 1.5rem | 24px | Padding interno de cards, gaps entre sections |
| `--space-8` | 2rem | 32px | Padding de page-header, separación de sections |
| `--space-12` | 3rem | 48px | Entre major sections, top de páginas |
| `--space-16` | 4rem | 64px | Padding vertical de hero/page |
| `--space-24` | 6rem | 96px | Padding top de pages, espacio de respiración |

---

## 5. Layout

| Token | Valor | Uso |
|---|---|---|
| `--container-max` | `72rem` (1152px) | Max-width del wrapper `.container` |
| `--radius` | `0.5rem` (8px) | Buttons, inputs, badges, small cards |
| `--radius-lg` | `0.75rem` (12px) | Cards grandes, login card, image thumbs |

**Breakpoints**: solo se usa uno — `768px` (mobile vs desktop en admin sidebar). El grid de cards usa `auto-fill, minmax(280px, 1fr)` así se adapta solo sin media queries.

**Container pattern**:

```css
.container {
  width: 100%;
  max-width: 72rem;
  margin-inline: auto;
  padding-inline: var(--space-6);
}
```

---

## 6. Motion

Una sola curva de easing para todo. Una escala de tres duraciones.

### Easing

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);  /* "easeOutExpo" — suave, no rebote */
```

### Durations

| Token | Valor | Uso |
|---|---|---|
| `--duration-fast` | 150ms | Color shifts, opacity, focus rings |
| `--duration-base` | 250ms | Hovers, transforms, theme transitions |
| `--duration-slow` | 400ms | Theme bg/color swap, page transitions |

### Patrones de motion

- **Hover lift** (cards, buttons): `transform: translateY(-1px)` o `translateY(-2px)` + shadow
- **Hover shadow** (CTAs primarios): `box-shadow: 0 4px 12px color-mix(in oklab, var(--color-accent) 25%, transparent)`
- **Hover border** (cards, inputs): `border-color: color-mix(in oklab, var(--color-fg) 20%, var(--color-border))`
- **Hover underline** (links): `text-decoration-color: var(--color-accent)` (de transparente a color)
- **Theme transition**: `transition: background-color var(--duration-base), color var(--duration-base)`

### Reduced motion

Honrado en `global.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 7. Componentes — patrones

### Card (genérico y específico de project/contribution)

```
┌─────────────────────────┐
│                         │
│    Thumbnail 16:9       │   ← aspect-ratio: 16/9, background-color: surface
│                         │      (fallback si la imagen rompe)
│                         │
├─────────────────────────┤
│                         │
│  Title (Display, 1.25)  │   ← h3, line-clamp implícito (1 línea)
│                         │
│  Desc (Sans, 0.9,       │   ← -webkit-line-clamp: 2
│   line-clamp: 2)        │
│                         │
└─────────────────────────┘
   ↑ hover: translateY(-2px) + border color shift
   ↑ todo el bloque es <a> — clickeable entero
```

- Background: `--color-surface`
- Border: `1px solid --color-border`
- Border radius: `--radius-lg`
- Hover: `transform: translateY(-2px)` + `border-color: color-mix(in oklab, --color-fg 20%, --color-border)`
- Padding interno del body: `--space-6`

### Button — primary

```
┌──────────────────────┐
│   Label (0.95, 500)  │
└──────────────────────┘
   ↑ bg: --color-accent
   ↑ color: --color-accent-fg
   ↑ padding: --space-3 --space-6
   ↑ border-radius: --radius
   ↑ hover: translateY(-1px) + shadow accent 25%
   ↑ transition: all var(--duration-fast) var(--ease-out)
```

### Button — secondary

```
┌──────────────────────┐
│   Label              │
└──────────────────────┘
   ↑ bg: --color-surface
   ↑ color: --color-fg
   ↑ border: 1px solid --color-border
   ↑ hover: border-color: --color-fg
```

### Form input

```
┌──────────────────────┐
│  Label (Sans, 0.875, 500) │
└──────────────────────┘
┌──────────────────────┐
│  Input (1rem)        │   ← bg: --color-surface
│                      │   ← border: 1px solid --color-border
│                      │   ← focus: border-color --color-accent
└──────────────────────┘
```

- Padding: `--space-3 --space-4`
- Border radius: `--radius`
- Focus ring: NO outline (border-color change only), pero `:focus-visible` global tiene outline 2px accent

### Eyebrow (label sobre títulos)

```
LISTINGS                          ← Mono, 0.8rem, muted, uppercase, letter-spacing: 0.1em
Projects                          ← Display h1, 2-3rem clamp
[Projects | Contributions]        ← Toggle
```

### Toast / banner

```
┌──────────────────────────────────────┐
│  Project "x" created.                │  ← bg: color-mix(state, 12%, transparent)
└──────────────────────────────────────┘                                  border: color-mix(state, 30%, transparent)
                                       text: state color
```

### Badge (estado)

```
[ Active ]    [ Deleted ]
   ↑               ↑
   bg: color-mix(success, 15%, transparent)   bg: color-mix(error, 15%, transparent)
   text: success                               text: error
   font-size: 0.75rem
   padding: 0.125rem 0.5rem
   border-radius: --radius
```

### List toggle (tabs)

```
┌──────────────────────────┐
│ [ Projects | Contributions ] │   ← background: --color-surface
└──────────────────────────┘   ← border: 1px solid --color-border
                                 ← padding externo: --space-1
                                 
   Tab activa:
   bg: --color-bg (negro/blanco puro)
   color: --color-fg
   font-weight: 500
```

### Pagination

```
       ← Previous  ·  Page 2 of 5  ·  Next →
        ↑                          ↑
        color: --color-fg            color: --color-fg
        hover: opacity 0.7           hover: opacity 0.7
```

- Border-top separador: `1px solid --color-border`
- Padding-top: `--space-8`, margin-top: `--space-12`

### Admin layout (sidebar + main)

```
┌─────────┬─────────────────────────────────┐
│ Brand   │  Title              [Sign out] │ ← topbar sticky, backdrop-filter blur
│         ├─────────────────────────────────┤
│ Dash    │                                 │
│ Projects│  <Page content>                 │
│ Contrib │                                 │
│         │                                 │
│ ← Back  │                                 │
└─────────┴─────────────────────────────────┘
  ↑ sidebar: 240px, sticky, border-right
  ↑ main: flex column, padding: --space-8
```

---

## 8. Páginas — wireframes

### Home

```
[Header: brand · Projects · Contributions · Admin · 🌗]
─────────────────────────────────────────────
                                                  ← space-16
  LISTINGS
  Building things, writing them down.           ← hero title, clamp(2.5rem, 6vw, 4.5rem)
  Projects, contributions, and the occasional
  opinion.                                      ← lede, 1.25rem muted
  
  [View projects]  [Admin]                      ← buttons
                                                  ← space-24
  Recent projects
  [Card] [Card] [Card] [Card]
                                                  ← space-24
[Footer: © 2026 AJN]
```

### Projects list (`/projects`)

```
[Header]
─────────────────────────────────────────────
  LISTINGS
  Projects
  [Projects | Contributions]                    ← toggle
                                                  ← space-8
  [Card] [Card] [Card] [Card]                   ← grid: auto-fill minmax(280px, 1fr)
  [Card] [Card]
  ─────────────────────────────────            ← border-top separador
       ← Previous  ·  Page 1 of 1  ·  Next →
```

### Project detail (`/projects/[slug]`)

```
[Header]
─────────────────────────────────────────────
  ← Back to projects
                                                  ← space-12
              ┌────────────────────────┐
              │   PROJECT              │ ← eyebrow mono uppercase
              │   API de Gestión       │ ← h1, clamp(2rem, 5vw, 3.5rem)
              │   API REST para gestión │ ← lede, 1.125rem muted
              │   de proyectos         │
              │   Jan 1, 2026          │ ← meta mono
              └────────────────────────┘
              ┌────────────────────────┐
              │   [Cover image]        │ ← 16:9, surface bg fallback
              └────────────────────────┘
              
              Markdown rendered
              (typography styles from .prose)
```

### Admin dashboard (`/admin`)

```
[Sidebar: AJN Admin          ][Topbar: Dashboard                Sign out]
[  Dashboard   (active)     ]
[  Projects                 ]  ┌──────────┐ ┌──────────┐
[  Contributions            ]  │ PROJECTS │ │CONTRIBUT.│  ← stat cards, clickeables
                             │ 2        │ │ 2        │
                             │ 2 active │ │ 2 active │
                             │ 0 deleted│ │ 0 deleted│
                             └──────────┘ └──────────┘
                             
                             Recent projects                          View all →
                             ─────────────────
                             [Title  /slug  badge?]                ← dashboard__list-item
                             [Title  /slug  badge?]
                             [Title  /slug  badge?]
```

### Admin projects list (`/admin/projects`)

```
[Sidebar]                     [+ New project]
[Topbar: Projects              Sign out]
                               
                               [Project "x" created.]                ← toast si viene de redirect
                               
                               ┌─────────────────────────────────┐
                               │ Title     Slug     Created Status Actions │
                               │ API de Gestión  /api-gestion  2026-02  Active  Edit Delete │
                               │ Mi Portfolio    /mi-portfolio  2026-01  Active  Edit Delete │
                               └─────────────────────────────────┘
```

### Admin project form (`/admin/projects/create` o `/admin/projects/[slug]`)

```
[Sidebar]                     [New project]  o  [Edit · API de Gestión]
[Topbar]
                               
                               Title           [____________________]
                               
                               Slug            [____________________]
                                              Preview: /projects/your-slug
                                              ⚠ Changing slug will break URL  (solo si cambió)
                               
                               Thumbnail URL   [____________________]
                                              [thumbnail preview]
                               
                               Description     [____________________]
                                              [____________________]
                                              0 / 500 characters
                               
                               Content (Markdown)
                                              ┌────────────────────┐
                                              │                    │
                                              │   <textarea>       │  ← monospace, 16 rows
                                              │                    │
                                              └────────────────────┘
                                              Markdown is supported. Sanitization happens...
                               
                               [Please fix the errors below.]        ← solo si error
                               
                                              [Cancel]  [Create project]
```

---

## 9. CSS patterns frecuentes

### Color mix (hover states)

```css
border-color: color-mix(in oklab, var(--color-fg) 20%, var(--color-border));
background-color: color-mix(in oklab, var(--color-fg) 5%, transparent);
box-shadow: 0 4px 12px color-mix(in oklab, var(--color-accent) 25%, transparent);
```

### Thumbnail fallback

```css
.thumb {
  aspect-ratio: 16 / 9;
  background-color: color-mix(in oklab, var(--color-fg) 5%, var(--color-surface));
  /* imagen rota → queda el color de fondo, no hueco blanco */
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### Text clamp (truncate)

```css
.clamped-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

### Theme transition

```css
html {
  transition: background-color var(--duration-base) var(--ease-out),
              color var(--duration-base) var(--ease-out);
}
```

---

## 10. Accesibilidad

- **Focus visible** global: `outline: 2px solid var(--color-accent); outline-offset: 2px;` con border-radius heredado
- **Reduced motion** honrado (transition-duration: 0.01ms)
- **Color contrast** verificado manualmente: azul `#2563EB` sobre `#FAFAFA` = 5.93:1 (AA pass)
- **Semantic HTML**: `<main>`, `<article>`, `<nav>`, `<aside>`, `<header>`, `<footer>`, `<section>`
- **aria-current="page"** en nav items activos
- **autocomplete** en inputs (`email`, `current-password`)
- **required** + labels asociados (`htmlFor`)

---

## 11. No usar

- ❌ Tailwind / UnoCSS / cualquier utility framework
- ❌ Shadows fuertes (solo sombras sutiles 0 4px 12px 25% accent para CTAs)
- ❌ Border-radius grandes (> 12px)
- ❌ Múltiples colores por tema (solo monocromo + 1 acento)
- ❌ Animaciones orquestadas, 3D, WebGL
- ❌ Tipografía display para body (solo títulos)
- ❌ Lowercase eyebrows (siempre uppercase con letter-spacing)