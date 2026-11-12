# AGENTS.md

This repo currently contains **only** `docs/api-contract.md`. There is no frontend code, no `package.json`, no tooling. The first work in this repo will be choosing a stack and bootstrapping it. There is nothing to build, run, or test yet.

## The backend lives in another repo

This repo is the **frontend only** — there is no API client, no SSR data layer, no shared types here yet.

- **Local path** (sibling checkout, used for dev): `../ajn-portfolio-backend`
- **Canonical remote**: `git@github.com:adrianbeep/ajn-portfolio-backend.git`
- **Language / runtime**: C# on **.NET 10** (`global.json` pinned to `latestMajor`).
- **Stack**: ASP.NET Core 10 Minimal APIs, EF Core 10 (SQLite), MediatR, FluentValidation, ASP.NET Core Identity + JWT Bearer.
- **Architecture**: Clean Architecture — `Domain` → `Application` → `Infrastructure` → `Api`. Dependencies flow inward.
- **Tests**: xUnit v3 + FluentAssertions + `WebApplicationFactory`. 162 green (77 Application + 50 Infrastructure + 35 Api integration).
- **Backend docs**: `../ajn-portfolio-backend/README.md`, `../ajn-portfolio-backend/docs/diagrams/architecture.md`, `../ajn-portfolio-backend/docs/backlog-deuda-tecnica.md`.

The single source of truth **for the frontend** — endpoint shapes, auth, errors, types — is `docs/api-contract.md` (657 lines, 12 sections). Read it before touching any API call.

## Pitfalls an agent will hit without help

`docs/api-contract.md` section **10. Common pitfalls** is non-optional. The ones that bite repeatedly:

- **`credentials: "include"` on every admin fetch.** Required to send the cookie (or you'll get `401`) and to receive it after login. There is no `Authorization: Bearer` path.
- **`id` in `UpdateProjectRequest` / `UpdateContributionRequest` is ignored.** The handler keys off the slug in the path. Send any Guid; do not rely on the value.
- **Admin lists are not paginated.** `GET /admin/projects` and `/admin/contributions` return every record. Don't render straight to the DOM.
- **Soft-deleted = 404 publicly, present in admin lists** with `deletedAt` populated. Restore via `POST /admin/{projects,contributions}/{slug}/restore`.
- **`400 ValidationFailed`** carries all messages concatenated in `detail` as `"{Field} : {message}; {Field2} : {message2}"`. Split on `; ` then ` : ` if you want structured errors.
- **`PUT` can change the slug.** A successful update may move the record. Plan redirects / cache invalidation.
- **No ETags.** Concurrent admin edits are last-write-wins.
- **The JWT is in an `httpOnly` cookie.** Frontend JS cannot read it. Detect expiry via `401` + redirect to login; `AuthResponse.expiresAt` is informational only — the cookie's expiry is what matters.
- **`UseHttpsRedirection` 307s plain HTTP.** Use `https://localhost` in tests, or follow redirects.
- **No rate limiting on auth** (TD-003 backend). Don't ship the public login form unprotected.

## Auth & bootstrap

Cookie name: `auth_token`. HS256 JWT, default 10h, `HttpOnly`, `SameSite=Strict`, `Secure` on HTTPS. **No refresh token** — re-login when it expires.

The first admin is **not** auto-provisioned. Procedure:

1. `POST /admin/auth/register` with header `X-Bootstrap-Token: AdminAJN2026!` (default; see backend `appsettings.Development.json`). Creates the user but does NOT assign the `Admin` role.
2. Manual SQL `INSERT INTO AspNetUserRoles` with `RoleId = '11111111-1111-1111-1111-111111111111'`.
3. `POST /admin/auth/login` to receive the cookie.

The `AdminAJN2026!` token and `Jwt:Secret` are still in `appsettings.Development.json` (TD-002). They must move to env vars before any real deploy.

## Domain conventions (frontend must enforce)

- Timestamps: UTC ISO 8601 (`"2026-09-30T18:00:00Z"`).
- IDs: `Guid` strings (`"22222222-2222-2222-2222-222222222222"`).
- Slugs: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 80.
- `state` is `"Active"` or `"Inactive"` (string).
- `content` is markdown. **Sanitization is the frontend's job** — the backend never touches it.
- Errors are RFC 7807 `ProblemDetails`. `title` is a stable machine code (`ValidationFailed`, `ProjectNotFound`, `Unauthorized`, `Forbidden`, `Auth.InvalidCredentials`, …). Full mapping in section 4 of the contract.

## CORS in dev

Backend allows `http://localhost:4321` (Astro) and `http://localhost:5173` (Vite). Any other origin is rejected. `AllowCredentials` is on. If you pick a different stack/port, update backend `Cors:AllowedOrigins`.

## TypeScript types

Section 11 of the contract is the source of truth for the types. `src/lib/types.ts` contains the copy-pasted block (Guid, ISODateTime, State, PagedList<T>, ProblemDetails, all DTOs, and request types) — import from there, do not redeclare.

## Tooling (added by bootstrap)

- **Package manager**: pnpm
- **Framework**: Astro 7.x (output: `static`)
- **Adapter**: `@astrojs/vercel` (deploy target: Vercel static)
- **TypeScript**: strict mode (`astro/tsconfigs/strict`)
- **Styles**: vanilla CSS with `@layer` + CSS custom properties (tokens in `src/styles/tokens.css`). No Tailwind.
- **Markdown pipeline (build-time, zero client JS)**: `unified` + `remark-parse` + `remark-gfm` + `remark-rehype` + `@shikijs/rehype` (themes `github-light` / `github-dark`, `defaultColor: false`) + `rehype-sanitize` (schema extended to keep inline styles so `--shiki-light` / `--shiki-dark` survive) + `rehype-stringify`. Driven from `src/components/MarkdownContent.astro`; runs at build time.

### Commands

```bash
pnpm install           # install dependencies
pnpm dev               # dev server on http://localhost:4321
pnpm build             # production build to ./dist
pnpm preview           # preview production build locally
pnpm astro check       # type-check (.astro + .ts)
```

### Deploy to Vercel

```bash
# First time: install Vercel CLI, link repo, set env var
pnpm dlx vercel link
pnpm dlx vercel env add PUBLIC_API_BASE_URL production
# Then push to a Git remote; Vercel auto-detects Astro and runs pnpm build.
```

### Environment variables

- `PUBLIC_API_BASE_URL` — backend base URL (e.g. `http://localhost:5000` in dev, prod URL on Vercel). Exposed to the client (it's prefixed `PUBLIC_`).