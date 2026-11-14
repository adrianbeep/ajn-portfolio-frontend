# Portfolio v2 — rebuild desde cero

Reconstrucción total del frontend del portfolio: repo limpio, especificaciones escritas antes del código, dirección visual nueva explorada a propósito.

## Specs

- **S1** — "podemos empezar desde 0 el frontend de mi portfolio?" → El repositorio queda sin código heredado: no se reutiliza ninguna implementación previa (pages, components, styles, lib) salvo lo que el usuario decide explícitamente conservar.
- **S2** — "mas que nada porque me gustaria empezarlo bien definido desde el inicio con todos los archivos borrados" → El estado inicial del repo es un árbol vacío (salvo `.git` y los archivos de configuración que se crean en T3), y ese reset queda registrado en un commit propio para que sea reversible.
- **S3** — "y dandote bien definidas las especificaciones" → Este documento es la especificación: cada requisito tiene un `S#`, cada tarea un `T#`, y ninguna tarea empieza a escribir código sin su spec asociada.
- **S4** — Stack: "lo mismo que usabamos pero css vanilla? astro no viene con tailwind?" → **Astro 7** (`output: 'static'`, adapter `@astrojs/vercel`), **React 19** limitado a islands `.tsx`, **TypeScript strict** (`astro/tsconfigs/strict`), **CSS vanilla** con `@layer` + custom properties en `src/styles/tokens.css`. **Sin Tailwind, sin UnoCSS** — Astro no los trae; el estilo se escribe a mano.
- **S5** — Alcance v1: "Sitio público primero" → v1 incluye home, listado paginado de projects, detalle de project, 404, tema claro/oscuro, SEO (title/description/OG/canonical/sitemap). **Las contribuciones (blog) quedan FUERA de la v1**: el usuario no tiene blog ("lo de escrituras sacalo a la mierda, no tengo blog yo"), así que no hay sección de escrituras ni listado/detalle de contributions. **El panel admin (`/admin/*`) queda fuera de la v1** y se planifica aparte.
- **S6** — Dirección visual: "Explorar direcciones nuevas" → Antes de escribir UI se generan 2-3 direcciones visuales nuevas y el usuario elige una; recién entonces se congelan tokens, tipografía, grid y motion.
- **S7** — Contrato de API: `docs/api-contract.md` es el contrato con el backend .NET 10 y **no existe en `../ajn-portfolio-backend/docs/`**. Hay que decidir su destino antes de borrar (ver Log 2026-11-14) para no perder 657 líneas de conocimiento destilado.
- **S8** — Markdown: `content` llega como markdown crudo desde el backend y **el sanitizado es responsabilidad del frontend** (`rehype-sanitize`), con Shiki dual-theme (`github-light`/`github-dark`) preservando las variables `--shiki-light`/`--shiki-dark`.
- **S9** — El sitio público es **estático y sin JS por defecto**: React solo se monta donde hay interactividad real; el contenido se trae del backend en build time vía `PUBLIC_API_BASE_URL`.
- **S10** — "el HERO deberia ocupar el primer pantallazo" → El hero ocupa la primera pantalla completa (`100svh` menos el header) y es el único bloque en ese rango; el contenido arranca después.
- **S11** — "quiero que las flashcards esten presentadas con flex por fila (1 por fila) centrada" → Los proyectos se muestran como **tarjetas** (no fichas que giran): imagen arriba, título y descripción abajo, en `flex-direction: column`, **una por fila**, centradas, ancho máximo ~420px. La tarjeta es un link al detalle del proyecto (`/projects/[slug]`), sin interacción extra ni JavaScript.
- **S12** — "abajo del hero iria un Sobre mi donde detallo mas" → Sección **"Sobre mí"** propia, narrativa, debajo del hero: relato en dos columnas (texto + tres hechos en foco), sin datos inventados.
- **S13** — "tiene que haber una seccion de tecnologias donde liste mi stack tecnologico" → Sección **"Tecnologías"** propia, separada de "Sobre mí" (narrativa vs. referencia escaneable), con chips agrupados por categoría (Frontend, Backend, Datos, Infraestructura).
- **S14** — Orden de secciones de la home: **Hero → Sobre mí → Proyectos → Tecnologías**. Los proyectos son la evidencia y preceden al stack; el stack es respaldo. Sin sección de escrituras (no hay blog).
- **S15** — Footer con estructura real, no una línea de texto: (a) identidad + declaración breve a la izquierda, (b) navegación del sitio, (c) enlaces externos (GitHub, LinkedIn, email), y (d) barra inferior con copyright y la nota técnica del sitio. Sin RSS (no hay blog). Los enlaces externos son anchors de maqueta hasta que el usuario defina sus URLs reales.

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
| T9 | S5, S10, S14 | Home: hero a pantalla completa + proyectos recientes | — |
| T10 | S5 | Listado paginado de projects + detail | — |
| T11 | S5 | Listado paginado de contributions + detail — **dropped: sin blog** | — |
| T12 | S8 | Render de markdown sanitizado + Shiki dual-theme | — |
| T13 | S5 | 404 + SEO (metadatos, OG, sitemap, robots) | — |
| T14 | S3, S9 | Build verde + `astro check` sin errores | — |
| T15 | S11 | Tarjetas de proyecto: 1 por fila, centradas, imagen arriba + título/descripción abajo, link al detalle | — |
| T16 | S12 | Sección "Sobre mí" (home) | — |
| T17 | S13 | Sección "Tecnologías" (home + detalle de proyecto) | — |
| T18 | S15 | Footer: identidad + navegación + enlaces externos + barra inferior | — |

## Log

- **2026-11-14 (pedido original, verbatim)** — "podemos empezar desde 0 el frontend de mi portfolio?, mas que nada porque me gustaria empezarlo bien definido desde el inicio con todos los archivos borrados y dandote bien definidas las especificaciones"
- **2026-11-14 (estado real del repo)** — El repo NO estaba vacío: commit inicial `c3a29ce` con el frontend Astro completo (51 archivos en `src/`, ~8.600 líneas), `docs/api-contract.md`, `docs/design-system.md`, README, AGENTS.md y 7 scripts de verificación Playwright. Todo eso queda preservado en la historia de git.
- **2026-11-14 (decisiones del usuario)** — "Borrar absolutamente todo" / stack: "lo mismo que usabamos pero css vanilla? astro no viene con tailwind?" / alcance: "Sitio público primero" / visual: "Explorar direcciones nuevas".
- **2026-11-14 (diseño)** — Direcciones visuales en `design/portfolio-home-v2/`: `01-editorial-index.html` (Índice editorial), `02-flashcards-fullnegro.html` (Full negro + lista de flashcards) y `03-estudio-bento.html` (Estudio bento). Las tres son alternativas; la elegida pasa a ser la fuente de tokens de `src/styles/`.
- **2026-11-14 (iteración de diseño, pedido del usuario)** — "quiero que el de consola no sea consola, me gusta el fullnegro ... los proyectos los listas como lista ... para mi tendría que ser lista de flashcards, si te fijas el api del backend te los lista para que puedas hacer un flashcard del proyecto". La dirección 02 (`02-consola-sistema.html`) se transformó en `02-flashcards-fullnegro.html`: negro pleno, sin estética de terminal, y los proyectos pasan a ser fichas con frente/dorso. **El artboard es un mock estático con registros hardcodeados** copiados del seed del backend ("Mi Portfolio", "API de Gestión"); la integración real con `GET /projects` + `GET /projects/{slug}` es un paso de implementación posterior (T7, T9-T11), no algo que el artboard ya ejecute. El giro de la ficha debe resolverse sin JavaScript en el sitio público.
- **2026-11-14 (iteración de diseño 2, pedido del usuario)** — "quiero que las flashcards esten presentadas con flex por fila (1 por fila) centrada, aparte tiene que haber una seccion de tecnologias donde liste mi stack tecnologico. no se si abajo de la seccion de proyectos o arriba. aparte el HERO deberia ocupar el primer pantallazo, abajo del hero iria un Sobre mi donde detallo mas y muestro tecnologias o deberian ser dos cosas aparte?" Decisiones tomadas (el usuario canceló la questionnaire y delegó el criterio): flashcards en flex, una por fila, centradas, con layout horizontal dentro de la ficha; "Sobre mí" y "Tecnologías" son **dos secciones separadas** (narrativa vs. referencia escaneable); hero a pantalla completa; orden final **Hero → Sobre mí → Proyectos → Tecnologías → Escrituras**. Specs S10-S14, tareas T15-T17.
- **2026-11-14 (iteración de diseño 3, pedido del usuario)** — "entendiste flashcard por card que se da vuelta y no es eso, es algo asi C:\\Users\\nauma\\OneDrive\\Pictures\\Screenshots\\Captura de pantalla 2026-11-14 174734.png". Corrección de interpretación: "flashcard" = **tarjeta con imagen arriba y texto abajo** (referencia visual del usuario), no una card con frente/dorso. Se eliminó el giro (CSS `:has`/`~`, checkbox, botón "Girar"), el dorso con metadatos y el layout horizontal; la tarjeta pasa a ser un link al detalle. El artboard pasó de `02-flashcards-fullnegro.html` a `02-fullnegro-tarjetas.html`. S11 reescrita.
- **2026-11-14 (iteración de diseño 4, pedido del usuario)** — "lo de escrituras sacalo a la mierda, no tengo blog yo". Se elimina la sección "Escrituras" del artboard (y su CSS). Consecuencia de alcance: S5 saca listing/detail de contributions de la v1 y T11 queda dropped. En la misma pasada se corrigieron los 7 hallazgos del review del slice de diseño: hero sin alto mágico (grid de body con filas `auto 1fr` en vez de `calc(100svh - 76px)`), `.card-body`/`.cover` como bloques (antes `span` con `h3`/`p`), links de tarjeta al detalle real (`/projects/[slug]`), selectores muertos `.flip-btn`/`.face-front` eliminados, header que envuelve en anchos angostos, y T15 reescrito para el layout vertical.
- **2026-11-14 (footer, pedido del usuario)** — "necesito que mejores el footer de la pagina". El footer pasa de una línea de texto a una grilla de tres columnas (identidad + declaración / navegación del sitio / enlaces externos) más barra inferior con copyright y nota técnica; se elimina el enlace RSS (residuo del blog). S15 y T18 nuevas.
- **2026-11-14 (hallazgo que corrige una premisa)** — Mi opción de la pregunta ofrecía copiar el contrato desde `../ajn-portfolio-backend/docs/`; **ese archivo no existe ahí** (el backend tiene `2026-08-03.md`, `adr/`, `architecture/`, `backlog-deuda-tecnica.md`, `diagrams/`, `roadmap-implementacion.md`). El contrato de 657 líneas solo vive en este repo → decisión pendiente en T2 antes de borrar.
