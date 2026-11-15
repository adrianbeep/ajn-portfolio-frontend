# Projects pagination — listado paginado real

Implementación del issue **#4** ("El listado de proyectos ignora la paginación de la API"). El issue es la fuente de verdad; este documento lo espeja y registra las decisiones que la implementación toma.

## Specs

- **S1** — La API pagina y el frontend la usa. `src/lib/api.ts` expone el envelope `{ items, total, page, pageSize }` y deja de descartar `total` (hoy `getProjectsWithDetails` devuelve `ProjectWithDetail[]` y el envelope se pierde en `api.ts:45-55`).
- **S2** — `pageSize` explícito y alineado al contrato: **20** (default documentado en `api-contract.md`, max 100). El `24` hardcodeado en `api.ts:31` y `:45` desaparece.
- **S3** — La paginación se resuelve **en build time**, no en el cliente: el sitio es `output: 'static'` y sin JS por defecto, así que cada página es un HTML generado. Una ruta por página.
- **S4** — Rutas del listado: `/projects/` (página 1), `/projects/2/`, `/projects/3/`… Implementado con `src/pages/projects/[...page].astro` + `paginate()`; `src/pages/projects/index.astro` se elimina. La ruta de detalle `/projects/[slug]` no cambia.
- **S5** — El contador de la sección muestra el total real ("20 de 30"), no la tautología `{projects.length} de {projects.length}` de `projects/index.astro:14` e `index.astro:62`.
- **S6** — La navegación entre páginas son `<a href>` reales, sin JavaScript, con `aria-current="page"` en la página actual.
- **S7** — Cada página tiene canonical **absoluto** y `rel="prev"` / `rel="next"` cuando corresponde. `BaseLayout.astro:34` y `:40` dejan de emitir `canonical.pathname` (relativo) y pasan a `canonical.href`.
- **S8** — La home `/` muestra una porción de los proyectos (4) con enlace al listado completo, en vez de la lista entera.
- **S9** — Con 0 proyectos el listado renderiza un estado vacío (mensaje, no error) y no genera rutas de página fantasma.
- **S10** — El sitemap incluye las páginas del listado paginado, no solo `/projects/`.
- **S11** — Performance: los fetches se cachean por URL durante el build, así cada detalle se pide una sola vez y no se repite el listado completo en cada route file.
- **S12** — Ningún espaciado ni color literal fuera de `src/styles/`; los estilos nuevos van en `src/styles/components.css` y salen de `tokens.css`.
- **S13** — `astro check` y `astro build` en verde, con la API real y con el stub de 30 proyectos.

## Tasks

| ID | Spec | Ruta |
|----|------|------|
| T1 | S1, S2 | `src/lib/api.ts`: envelope expuesto, `PROJECTS_PAGE_SIZE`, `getAllProjects()`, `getAllProjectSummaries()`, `getProjectPage()`, cache de build |
| T2 | S1, S2 | `src/lib/types.ts`: tipo `ProjectPage` |
| T3 | S3, S4, S5, S6 | `src/pages/projects/[...page].astro` + borrado de `src/pages/projects/index.astro` |
| T4 | S6, S12 | `src/components/Pagination.astro` + estilos en `src/styles/components.css` |
| T5 | S7 | `src/layouts/BaseLayout.astro`: canonical absoluto + props `prevUrl` / `nextUrl` |
| T6 | S8 | `src/pages/index.astro`: porción de 4 + enlace al listado completo |
| T7 | S9, S12 | Estado vacío (`.empty-state`) en `src/styles/components.css` |
| T8 | S10 | `src/pages/sitemap.xml.ts`: páginas del listado |
| T9 | S11 | `src/pages/projects/[slug].astro`: detalle desde `props`, sin refetch |
| T10 | S13 | Verificación: `astro check`, `astro build`, build contra stub de 30 proyectos y de 0 proyectos |

## Log

- **2026-11-15 (verificación previa de la API)** — La API pagina de verdad: `GET /projects?page=1&pageSize=20` devuelve `{ items, total, page, pageSize }` con `total` real. `pageSize` se respeta hasta 100 y se clampea por encima (`pageSize=200` → `pageSize=100`). `page` fuera de rango devuelve `items: []` conservando el `total` real (el contrato dice que se clampea; el backend no lo hace — discrepancia menor, no bloqueante). Orden: `CreatedAt DESC`, así que la primera página es la más reciente.
- **2026-11-15 (conflicto de rutas, verificado empíricamente)** — Con `src/pages/projects/index.astro` y `src/pages/projects/[...page].astro` conviviendo, Astro 7 emite `[WARN] Could not render /projects from route /projects/[...page] as it conflicts with higher priority route /projects` y **no renderiza la página 1** del rest route. Eliminando `index.astro`, el rest route es dueño de `/projects`, `/projects/2` y `/projects/3` sin ningún warning, y `/projects/[slug].astro` sigue generando los detalles sin conflicto. Por eso S4 elimina `index.astro` en vez de coexistir con él. Riesgo residual: un proyecto cuyo slug sea un número puro ("2") chocaría con una página del listado; hoy no hay ninguno y los slugs son nombres de proyecto.
- **2026-11-15 (canonical relativo)** — El canonical del sitio es hoy una ruta relativa (`<link rel="canonical" href="/">`) porque `BaseLayout.astro:34` emite `canonical.pathname`. La paginación lo vuelve obligatorio (cada página necesita su canonical absoluto), así que el fix entra en este trabajo aunque el issue #3 ya lo había detectado.
- **2026-11-15 (alcance)** — El fallback de build ante API caída (issue #3) **no** se implementa acá. Este trabajo hace que la capa de datos exponga el envelope completo (`{ items, total, page, pageSize }`), que es la forma que el fallback de #3 tiene que devolver.

- **2026-11-15 (implementación)** — Implementado sobre `main` (2f17c22) en la rama `feat/projects-pagination`. Verificado con `astro check` (0 errores / 0 warnings / 0 hints) y con cuatro builds: API real (2 proyectos), stub de 30 proyectos, stub de 0 proyectos y API caída. La ruta del listado pasó de `src/pages/projects/index.astro` a `src/pages/projects/[...page].astro` (ver la nota de conflicto de rutas arriba).
- **2026-11-15 (colisión con otra sesión)** — Mientras se implementaba esto, **otra sesión estaba editando el mismo working tree** con el alcance del issue #3 (fallback de build, `SITE_URL`, `pnpm` pineado, `.github/workflows/ci.yml`, `README.md`, `.env.example`). Para no pisar ese trabajo, el commit de paginación se armó en un worktree aparte con las versiones "solo paginación" de los tres archivos compartidos (`src/lib/api.ts`, `src/layouts/BaseLayout.astro`, `src/pages/sitemap.xml.ts`), y el árbol principal quedó intacto con los cambios de la otra sesión sin commitear.

## Notas de implementación

- `paginate()` devuelve las URLs sin barra final (`/projects`, `/projects/2`). El repo usa URLs con barra final, así que el componente `Pagination` normaliza.
- `getAllProjects()` recorre las páginas de la API usando `total`; con la cache de build (S11), el detalle de cada proyecto se pide una sola vez aunque lo necesiten el listado, las páginas de detalle y el sitemap.
- La home y el listado piden páginas distintas a la API (4 vs 20), pero el orden es el mismo (`CreatedAt DESC`), así que la porción de la home es siempre el principio del listado.
