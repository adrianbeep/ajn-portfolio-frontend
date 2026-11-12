# AJN Portfolio — Frontend

Frontend of a personal portfolio + editorial admin panel. Built with **Astro 7** (static output) and **React 19** islands, consuming a **.NET 10 / ASP.NET Core** backend through a documented API contract.

> The backend lives in a separate repository: [`ajn-portfolio-backend`](../ajn-portfolio-backend) (C# / .NET 10, Clean Architecture).

---

## Stack

| Concern            | Choice                                                            |
| ------------------ | ----------------------------------------------------------------- |
| Framework          | Astro 7 (`output: 'static'`, adapter `@astrojs/vercel`)          |
| Islands            | React 19 — scoped **only** to `.tsx` under `src/components/**`     |
| Language           | TypeScript, strict (`astro/tsconfigs/strict`)                    |
| Styling            | Vanilla CSS with `@layer` + design tokens (no Tailwind)           |
| Markdown           | `unified` + `remark-parse`/`remark-gfm` + `remark-rehype`         |
| Syntax highlight   | `@shikijs/rehype` (`github-light` / `github-dark`, dual theme)   |
| Sanitization       | `rehype-sanitize` (schema extended to preserve `--shiki-*` vars)  |
| Package manager    | pnpm                                                             |
| Deploy             | Vercel (static)                                                  |

---

## Why this architecture

**Static output with islands, not a SPA.** The public site is content-driven, so it is prerendered at build time and ships zero client JavaScript by default. React is mounted only where interactivity is actually required (the admin forms). This keeps the public bundle small and the admin panel fully dynamic.

**Markdown is sanitized on the frontend.** The backend stores `content` as raw markdown and never touches it. Rendering is the frontend's responsibility, so `rehype-sanitize` is applied at build time with a schema extended to keep the inline styles that power dual-theme Shiki highlighting.

**Astro's React renderer is scoped explicitly.** Astro 7's built-in JSX renderer conflicts with React and breaks `.tsx` files in dev, so `astro.config.mjs` restricts the React integration to `**/components/**/*.tsx` and `**/islands/**/*.tsx`.

---

## Commands

```bash
pnpm install          # install dependencies
pnpm dev              # dev server on http://localhost:4321
pnpm build            # production build to ./dist
pnpm preview          # preview the production build locally
pnpm astro check      # type-check (.astro + .ts)
```

---

## Environment

```bash
cp .env.example .env
```

| Variable                | Required | Description                                                        |
| ----------------------- | -------- | ------------------------------------------------------------------ |
| `PUBLIC_API_BASE_URL`   | yes      | Backend base URL. Must be **absolute** — undici rejects relative URLs. |

The variable is read at **build time** only (server-side fetching in page frontmatter and `getStaticPaths`). Browser-side admin scripts call `/api/admin/...`, which is forwarded by the Vite dev proxy in development and by Vercel rewrites in production.

---

## Project structure

```
src/
├── components/        # .astro components (public site + admin shell)
│   └── admin/         # React islands (.tsx) — the only React in the app
├── layouts/           # BaseLayout.astro, AdminLayout.astro
├── lib/               # types.ts, api-client.ts, api.ts, auth.ts, markdown.ts
├── middleware.ts      # admin auth guard (cookie probe -> 401 -> redirect)
├── pages/             # routes (public + /admin)
├── scripts/           # client-side scripts (theme toggle)
└── styles/            # tokens.css + layered CSS
docs/
├── api-contract.md    # single source of truth for the API surface
└── design-system.md
```

---

## Admin auth

- Session cookie: `auth_token` — HS256 JWT, `HttpOnly`, `SameSite=Strict`, `Secure` on HTTPS, 10h default.
- **No refresh token.** When it expires, the user re-authenticates.
- The JWT is unreadable from JavaScript. Expiry is detected via a `401` response, not by reading the token.
- `src/middleware.ts` guards every `/admin/*` route except the login page: missing cookie → redirect to login; invalid cookie → clear and redirect.

The **first admin is not auto-provisioned**. See `docs/api-contract.md` §1 for the bootstrap procedure (register with the bootstrap token, then assign the `Admin` role).

---

## API contract

`docs/api-contract.md` is the source of truth for endpoints, auth, errors and types. **Section 10 (Common pitfalls) is mandatory reading** before touching any API call — it documents the non-obvious behaviours this frontend has to work around (cookie credentials, ignored `id` fields on update, unpaginated admin lists, soft-delete semantics, `PUT` slug changes, and the RFC 7807 error envelope).

Types live in `src/lib/types.ts` — import from there, do not redeclare them.

---

## Deploy to Vercel

```bash
pnpm dlx vercel link
pnpm dlx vercel env add PUBLIC_API_BASE_URL production
git push  # Vercel auto-detects Astro and runs pnpm build
```

---

## Verification scripts

Playwright scripts used to verify the admin CRUD and theme rendering. They read configuration from environment variables — no credentials or machine-specific paths are committed.

| Script              | Purpose                                                    | Required env                          |
| ------------------- | ---------------------------------------------------------- | ------------------------------------- |
| `verify-admin.mjs`  | Screenshots every admin CRUD page (desktop + mobile)        | `ADMIN_EMAIL`, `ADMIN_PASSWORD`        |
| `verify-fix.mjs`    | Screenshots admin pages with an existing auth cookie        | `auth_token=<value>` (argv)            |
| `screenshot.mjs`    | Single-page screenshot with an auth cookie                  | `auth_token=<value>` (argv)            |
| `verify-dark*.mjs`  | Dark-mode rendering of the wireframes                       | `WIREFRAME_DIR` (optional)             |
| `verify-wireframes.mjs` | Renders the HTML wireframes                              | `WIREFRAME_DIR` (optional)             |

Common optional variables: `BASE_URL`, `API_URL`, `OUT_DIR`, `CHROMIUM_PATH`.

```bash
ADMIN_EMAIL=… ADMIN_PASSWORD=… node verify-admin.mjs
```

---

## Known constraints

- Admin list endpoints are **not paginated** — the backend returns every record, so rendering must be handled client-side.
- A successful `PUT` **can change the slug**, which may move the record and break existing links.
- There are no ETags: concurrent admin edits are last-write-wins.
- The backend applies no rate limiting on auth endpoints.
