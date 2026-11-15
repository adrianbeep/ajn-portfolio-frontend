# ajn-portfolio-frontend

Portfolio personal: sitio estático generado con [Astro 7](https://astro.build), con islas de React sólo donde hay interactividad real.

El contenido (proyectos) viene del backend .NET y se hornea en el HTML **en build time**. No hay llamadas a la API en runtime.

## Stack

- **Astro 7** (`output: 'static'`, adapter `@astrojs/vercel`)
- **React 19** limitado a islas `.tsx`
- **TypeScript strict**
- **CSS vanilla** con `@layer` y custom properties en `src/styles/tokens.css`
- **pnpm** (version pineada en el campo `packageManager`)

## Levantar el sistema

El sitio necesita una API que responda en `PUBLIC_API_BASE_URL`. Hay tres caminos, y **el puerto cambia según cuál uses** — apuntar al equivocado es el error más común al levantar esto por primera vez.

| Camino | Cómo | Puerto de la API | Requisitos |
|---|---|---|---|
| **Stub** (sin backend) | `node stub/server.mjs --port 5239` | `5239` | Node. Datos de fixture, no reales |
| **Backend con .NET** | `dotnet run` en `ajn-portfolio-backend` | `5239` | SDK .NET 10.0.300+ |
| **Backend con Docker** | `docker compose up --build` en `ajn-portfolio-backend` | `8080` | Docker |

> **Ojo con el puerto.** El backend en Docker escucha en **8080**, no en 5239. El 5239 es el puerto del backend corriendo con `dotnet run` (`Api/Properties/launchSettings.json`). Si levantás el backend con Docker Compose, la variable tiene que ser `PUBLIC_API_BASE_URL=http://localhost:8080`.

El frontend se levanta siempre igual, apuntando a la API que elegiste:

```bash
pnpm install
PUBLIC_API_BASE_URL=http://localhost:5239 pnpm dev
```

El sitio se sirve en `http://localhost:4321`.

### Con el backend real

El backend es un repo aparte (`ajn-portfolio-backend`) y su README tiene el detalle de cada opción. Lo mínimo para desarrollo diario:

```bash
# .NET directo
cd ../ajn-portfolio-backend
dotnet run                    # API en http://localhost:5239
```

```bash
# Docker Compose
cd ../ajn-portfolio-backend
docker compose up --build     # API en http://localhost:8080
```

Con `.NET` la base SQLite se crea sola en el repo. Con Docker, el compose aplica las migraciones (`Database__AutoMigrate: true`) sobre el volumen `api-data` y carga el seed.

### Con el stub, sin backend

Para trabajar sólo con el frontend, o para builds deterministas:

```bash
node stub/server.mjs --port 5239
PUBLIC_API_BASE_URL=http://127.0.0.1:5239 pnpm dev
```

El stub sirve 30 proyectos de fixture que respetan el contrato real de la API. No es el backend: no hay admin, ni autenticación, ni escritura.

### Si la API no responde

El sitio se construye igual pero **sin proyectos**, y el build emite un warning visible con la URL que intentó consultar. Un backend caído no puede dejar el frontend sin deploy. Si ves ese warning, revisá `PUBLIC_API_BASE_URL` — y el puerto, que es la causa más frecuente.

## Variables de entorno

| Variable | Default | Para qué sirve |
|---|---|---|
| `PUBLIC_API_BASE_URL` | — | URL **absoluta** del backend. `undici` (el `fetch` de Node) rechaza URLs relativas. Sin ella el sitio se construye sin proyectos. |
| `SITE_URL` | `https://ajn-portfolio.vercel.app` | Origen canónico. De ahí salen los `canonical`, el `sitemap.xml` y el `robots.txt`. |

Ninguna de las dos es un secreto: son valores públicos de build time, leídos del entorno y nunca horneados en la imagen.

`.env` está en el `.gitignore` y no se versiona. Para desarrollo local basta con exportar la variable en la shell, o copiar el ejemplo:

```bash
cp .env.example .env
```

Ahí está la lista de variables con los puertos de cada escenario.

## Comandos

```bash
pnpm dev        # servidor de desarrollo
pnpm check      # astro check: tipos y diagnósticos
pnpm build      # build de producción -> dist/
pnpm preview    # sirve dist/ localmente
```

## Contenedor

El repo tiene un `Dockerfile` multi-stage para poder **construir y verificar el sitio sin levantar el backend a mano**.

```bash
# Construye la imagen de checks
docker build --target check -t ajn-portfolio-frontend:ci .

# Corre los checks dentro del contenedor
docker run --rm ajn-portfolio-frontend:ci pnpm check
docker run --rm ajn-portfolio-frontend:ci pnpm build

# Construye y sirve el sitio con nginx
docker build -t ajn-portfolio-frontend:runtime .
docker run --rm -p 8080:80 ajn-portfolio-frontend:runtime
```

### El stub API

El build necesita una API. Para que el contenedor sea **hermético**, el repo incluye un stub que responde los dos endpoints que consume el sitio:

- `GET /projects` → `{ items, total, page, pageSize }`
- `GET /projects/{slug}` → el detalle del proyecto
- `GET /health` → estado del stub

Los fixtures viven en [`stub/fixtures/projects.json`](stub/fixtures/projects.json) y respetan el contrato real del backend (`ajn-portfolio-backend/docs/api-contract.md`, secciones 8 y 11). Son 30 proyectos, así que la paginación queda ejercitada (page size 20 → 2 páginas). Los dos primeros son el seed real del backend (`mi-portfolio`, `api-gestion`).

```bash
# Levantar el stub a mano
node stub/server.mjs --port 5239

# Construir contra él
PUBLIC_API_BASE_URL=http://127.0.0.1:5239 pnpm build
```

El `Dockerfile` levanta el stub él mismo durante la etapa de build: el build dentro del contenedor es determinista y no depende de nada externo.

## CI

El workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) corre en cada `pull_request` y en cada push a `main`. Tiene dos jobs:

1. **`container`** — construye la imagen, corre `pnpm check` y `pnpm build` dentro del contenedor contra el stub, y verifica que el `dist/` generado contiene el contenido esperado (fixtures en el HTML, el sitemap con las URLs correctas, la paginación renderizada).
2. **`build-without-api`** — verifica que el build **sobrevive a una API inalcanzable**: sale con código 0, muestra el warning y publica el sitio con el estado vacío.

Ninguno de los dos necesita backend, credenciales ni secretos.

## Estructura

```
src/
  components/   componentes .astro
  layouts/      layouts base
  lib/          cliente de API, markdown, datos del sitio
  pages/        rutas (home, listado paginado, detalle, 404, sitemap, robots)
  styles/       tokens.css (única fuente de espaciado y color), base.css, components.css
stub/           stub API + fixtures para el build hermético
```

**Regla de estilos**: ningún espaciado ni color literal fuera de `src/styles/`. Todo se llama desde `tokens.css`.
