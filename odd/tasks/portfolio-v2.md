# Portfolio v2 — rebuild desde cero

Reconstrucción total del frontend del portfolio: repo limpio, especificaciones escritas antes del código, dirección visual nueva explorada a propósito.

## Specs

- **S1** — "podemos empezar desde 0 el frontend de mi portfolio?" → El repositorio queda sin código heredado: no se reutiliza ninguna implementación previa (pages, components, styles, lib) salvo lo que el usuario decide explícitamente conservar.
- **S2** — "mas que nada porque me gustaria empezarlo bien definido desde el inicio con todos los archivos borrados" → El estado inicial del repo es un árbol vacío (salvo `.git` y los archivos de configuración que se crean en T3), y ese reset queda registrado en un commit propio para que sea reversible.
- **S3** — "y dandote bien definidas las especificaciones" → Este documento es la especificación: cada requisito tiene un `S#`, cada tarea un `T#`, y ninguna tarea empieza a escribir código sin su spec asociada.
- **S4** — Stack: "lo mismo que usabamos pero css vanilla? astro no viene con tailwind?" → **Astro 7** (`output: 'static'`, adapter `@astrojs/vercel`), **React 19** limitado a islands `.tsx`, **TypeScript strict** (`astro/tsconfigs/strict`), **CSS vanilla** con `@layer` + custom properties en `src/styles/tokens.css`. **Sin Tailwind, sin UnoCSS** — Astro no los trae; el estilo se escribe a mano.
- **S5** — Alcance v1: "Sitio público primero" → v1 incluye home, listado paginado de projects, detalle de project, listado paginado de contributions, detalle de contribution, 404, tema claro/oscuro, SEO (title/description/OG/canonical/sitemap). **El panel admin (`/admin/*`) queda fuera de la v1** y se planifica aparte.
- **S6** — Dirección visual: "Explorar direcciones nuevas" → Antes de escribir UI se generan 2-3 direcciones visuales nuevas y el usuario elige una; recién entonces se congelan tokens, tipografía, grid y motion.
- **S7** — Contrato de API: `docs/api-contract.md` es el contrato con el backend .NET 10 y **no existe en `../ajn-portfolio-backend/docs/`**. Hay que decidir su destino antes de borrar (ver Log 2026-11-14) para no perder 657 líneas de conocimiento destilado.
- **S8** — Markdown: `content` llega como markdown crudo desde el backend y **el sanitizado es responsabilidad del frontend** (`rehype-sanitize`), con Shiki dual-theme (`github-light`/`github-dark`) preservando las variables `--shiki-light`/`--shiki-dark`.
- **S9** — El sitio público es **estático y sin JS por defecto**: React solo se monta donde hay interactividad real; el contenido se trae del backend en build time vía `PUBLIC_API_BASE_URL`.

## Tasks

| ID | Spec | Ruta | Commit |
|----|------|------|--------|
| T1 | S1, S2, S3 | Escribir este documento de specs + mirror Engram | — |
| T2 | S7 | Resolver y preservar el contrato de API | — |
| T3 | S1, S2, S4, S9 | Resetear el árbol y commitear el estado vacío | — |
| T4 | S4, S9 | Bootstrap: Astro 7 + React 19 + TS strict + CSS vanilla + pipeline markdown | — |
| T5 | S6 | Explorar 2-3 direcciones visuales (gentle-design) | — |
| T6 | S6 | Elegir dirección y congelar tokens/tipografía/grid/motion | — |
| T7 | S3, S9 | Capa de datos: tipos + cliente API + fetch de build time | — |
| T8 | S3, S8 | Layout base, header, footer, tema claro/oscuro | — |
| T9 | S5 | Home: hero + proyectos recientes | — |
| T10 | S5 | Listado paginado de projects + detail | — |
| T11 | S5 | Listado paginado de contributions + detail | — |
| T12 | S8 | Render de markdown sanitizado + Shiki dual-theme | — |
| T13 | S5 | 404 + SEO (metadatos, OG, sitemap, robots) | — |
| T14 | S3, S9 | Build verde + `astro check` sin errores | — |

## Log

- **2026-11-14 (pedido original, verbatim)** — "podemos empezar desde 0 el frontend de mi portfolio?, mas que nada porque me gustaria empezarlo bien definido desde el inicio con todos los archivos borrados y dandote bien definidas las especificaciones"
- **2026-11-14 (estado real del repo)** — El repo NO estaba vacío: commit inicial `c3a29ce` con el frontend Astro completo (51 archivos en `src/`, ~8.600 líneas), `docs/api-contract.md`, `docs/design-system.md`, README, AGENTS.md y 7 scripts de verificación Playwright. Todo eso queda preservado en la historia de git.
- **2026-11-14 (decisiones del usuario)** — "Borrar absolutamente todo" / stack: "lo mismo que usabamos pero css vanilla? astro no viene con tailwind?" / alcance: "Sitio público primero" / visual: "Explorar direcciones nuevas".
- **2026-11-14 (diseño)** — Direcciones visuales en `design/portfolio-home-v2/`: `01-editorial-index.html` (Índice editorial), `02-consola-sistema.html` (Consola / sistema) y `03-estudio-bento.html` (Estudio bento). Las tres son alternativas; la elegida pasa a ser la fuente de tokens de `src/styles/`.
- **2026-11-14 (hallazgo que corrige una premisa)** — Mi opción de la pregunta ofrecía copiar el contrato desde `../ajn-portfolio-backend/docs/`; **ese archivo no existe ahí** (el backend tiene `2026-08-03.md`, `adr/`, `architecture/`, `backlog-deuda-tecnica.md`, `diagrams/`, `roadmap-implementacion.md`). El contrato de 657 líneas solo vive en este repo → decisión pendiente en T2 antes de borrar.
