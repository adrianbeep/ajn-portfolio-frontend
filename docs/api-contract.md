# AJN Portfolio — Backend API Contract

> Reference for frontend consumers. Last updated: 2026-09-30.
> Source of truth: `Api/Endpoints/*.cs` and `Application/**/*.Dtos/*.cs`.

## 1. Overview

- **Stack**: ASP.NET Core 10 minimal hosting, EF Core 10 (SQLite), MediatR 14, FluentValidation 12, ASP.NET Core Identity.
- **Architecture**: Clean Architecture (Domain → Application → Infrastructure → Api), CQRS via MediatR with pipeline behaviors (Logging → Audit → Authorization → Validation).
- **Domain**: A personal portfolio CMS with two aggregates — **Project** and **Contribution** — exposed publicly to visitors and managed through cookie-authenticated admin endpoints.
- **Status**: 162 tests green (77 Application + 50 Infrastructure + 35 Api integration). All 17 roadmap phases closed.

## 2. Quick start (backend up)

```bash
# from repo root
dotnet ef database update \
  --project Infrastructure/Infrastructure.csproj \
  --startup-project Api/Api.csproj
dotnet run --project Api/Api.csproj
```

Default listen URL is whatever `Properties/launchSettings.json` says (`http://localhost:5xxx` in Development). The DB is created automatically at `Infrastructure/portfolio-dev.db`.

### Bootstrap the first admin user

The first admin is created manually:

1. Call `POST /admin/auth/register` with header `X-Bootstrap-Token: AdminAJN2026!` (the default in `appsettings.Development.json` — change it before deploy). The endpoint creates the user but **does not** assign the `Admin` role.
2. Connect to `portfolio-dev.db` and insert into `AspNetUserRoles`:

   ```sql
   INSERT INTO AspNetUserRoles (UserId, RoleId)
   VALUES (
     (SELECT Id FROM AspNetUsers WHERE Email = 'you@example.com'),
     '11111111-1111-1111-1111-111111111111'  -- Admin role seed
   );
   ```

3. Now log in via `POST /admin/auth/login` with the same credentials. The browser will receive a cookie. Subsequent admin requests are authenticated by that cookie alone.

> **Heads up**: TD-002 tracks that the `Jwt:Secret` and `Bootstrap:Token` are still in `appsettings.Development.json`. They must be moved to env vars before any real deploy.

## 3. Base URL

All paths below are relative to the backend base URL, e.g. `http://localhost:5000`.

- Public routes are mounted at `/projects` and `/contributions`.
- Admin routes are mounted at `/admin/*`.
- There is **no** API version prefix. Routes are stable; breaking changes will require a new prefix.

## 4. Conventions

### Timestamps

All `DateTime` fields are UTC and serialized as ISO 8601 strings (e.g. `"2026-09-30T18:00:00Z"`).

### Identifiers

All aggregate IDs are `Guid` (string form `"22222222-2222-2222-2222-222222222222"` in JSON).

### Slugs

- Lowercase letters, digits, and single hyphens. No leading/trailing hyphens, no double hyphens, no uppercase, no underscores, no spaces.
- Regex (anchored): `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Max length: 80 characters.
- Examples: `my-portfolio`, `api-gestion`, `proj1`.

### State

`state` on `Project`/`Contribution` is the string `"Active"` or `"Inactive"`. Never a number.

### Content

`content` is raw markdown. **Sanitization is the frontend's responsibility** — the backend does not touch it.

### Pagination

Public list endpoints are paginated:

| Query param | Default | Min | Max | Notes |
|-------------|---------|-----|-----|-------|
| `page` | `1` | `1` | — | Out-of-range values are clamped server-side. |
| `pageSize` | `20` | `1` | `100` | Out-of-range values are clamped server-side. |

Response shape:

```ts
{
  items: T[],
  total: number,    // total matching the filter, across all pages
  page: number,     // current page (1-based)
  pageSize: number  // actual page size used
}
```

Admin list endpoints (`GET /admin/projects`, `GET /admin/contributions`) are **not paginated** — they return every record. See TD-009.

### Errors

All error responses are [RFC 7807 ProblemDetails](https://datatracker.ietf.org/doc/html/rfc7807). Example `400`:

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "ValidationFailed",
  "status": 400,
  "detail": "Slug : Slug must be lowercase letters, digits, and single hyphens (e.g. 'my-project').",
  "traceId": "0HM..."
}
```

- `title` is a stable machine-readable code (see table below).
- `detail` is a human-readable message.
- `type` and `traceId` are added by ASP.NET Core automatically.

#### Error code → HTTP mapping

| `title` value | HTTP | Meaning |
|---------------|------|---------|
| `ValidationFailed` | 400 | One or more fields failed FluentValidation. `detail` lists the field/message pairs separated by `; `. |
| `ProjectNotFound` | 404 | Project with the given slug does not exist (or is soft-deleted). |
| `ContributionNotFound` | 404 | Same for Contribution. |
| `IdentityError` | 400 | Generic Identity failure (should be rare; usually means a real internal error). |
| `Unauthorized` | 401 | No/invalid auth cookie on an `[AdminOnly]` command. |
| `Forbidden` | 403 | Authenticated but not in the `Admin` role. |
| `Auth.InvalidCredentials` | 401 | Wrong email or password on `/admin/auth/login`. |
| `Auth.EmailAlreadyExists` | 409 | Tried to register an email that's already in the system. |
| `Auth.BootstrapAlreadyUsed` | 409 | (Reserved; not currently emitted — the bootstrap flow does not enforce single-use.) |
| Anything else | 400 | Default fallback. |

## 5. Authentication

The API uses **HTTP-only cookie authentication**, not `Authorization: Bearer`.

### Flow

1. Client calls `POST /admin/auth/login` (or `/admin/auth/register` during bootstrap) with `{ email, password }`.
2. Server returns `200 OK` with `{ token, expiresAt }` in the body **and** sets a cookie:

   - Name: `auth_token`
   - `HttpOnly` (JS cannot read it)
   - `SameSite=Strict`
   - `Secure` only when the request was HTTPS
   - Value: a JWT signed with HS256, valid for `ExpirationMinutes` (default `600` = 10 hours). No refresh tokens.

3. Browser sends the cookie automatically on subsequent requests to the same origin. Cross-origin requests need `credentials: 'include'`.
4. Backend's `JwtBearer` middleware reads the cookie via `OnMessageReceived` and validates the JWT.
5. When the JWT expires, the next admin request returns `401`. Redirect the user to the login page.

### Bootstrap token

`POST /admin/auth/register` requires the header `X-Bootstrap-Token: <value>` to match `Bootstrap:Token` in config. Default is `AdminAJN2026!`. Change it before going to production.

### Logout

`POST /admin/auth/logout` clears the cookie. Always `200 OK`.

## 6. CORS

Configured via `Cors:AllowedOrigins` in `appsettings.json`. The default `appsettings.Development.json` includes:

```
http://localhost:4321   (Astro)
http://localhost:5173   (Vite)
```

- Requests from any other origin are rejected with a CORS error.
- `AllowCredentials()` is enabled (required because of the auth cookie). Wildcards are not allowed.

## 7. Endpoints

### 7.1 Public — Projects

| Method | Path | Query | Auth | Returns |
|--------|------|-------|------|---------|
| `GET` | `/projects` | `page`, `pageSize` | none | `200 ProjectListDto` |
| `GET` | `/projects/{slug}` | — | none | `200 ProjectDetailDto` / `404 ProjectNotFound` |

### 7.2 Public — Contributions

| Method | Path | Query | Auth | Returns |
|--------|------|-------|------|---------|
| `GET` | `/contributions` | `page`, `pageSize` | none | `200 ContributionListDto` |
| `GET` | `/contributions/{slug}` | — | none | `200 ContributionDetailDto` / `404 ContributionNotFound` |

### 7.3 Auth

| Method | Path | Headers | Body | Returns |
|--------|------|---------|------|---------|
| `POST` | `/admin/auth/register` | `X-Bootstrap-Token` | `RegisterRequest` | `200 AuthResponse` + cookie / `401` (bad token) / `409 Auth.EmailAlreadyExists` |
| `POST` | `/admin/auth/login` | — | `LoginRequest` | `200 AuthResponse` + cookie / `401 Auth.InvalidCredentials` |
| `POST` | `/admin/auth/logout` | — | — | `200 { message }` + clears cookie |

### 7.4 Admin — Projects

All require cookie + `Admin` role. Group prefix `/admin/projects`.

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `GET` | `/admin/projects` | — | `200 ProjectAdminListDto[]` (no pagination) |
| `POST` | `/admin/projects` | `CreateProjectRequest` | `201 { id }` with `Location: /projects/{slug}` / `400 ValidationFailed` |
| `PUT` | `/admin/projects/{slug}` | `UpdateProjectRequest` | `200 ProjectDetailDto` / `404 ProjectNotFound` |
| `DELETE` | `/admin/projects/{slug}` | — | `204` / `404 ProjectNotFound` |
| `POST` | `/admin/projects/{slug}/restore` | — | `200` / `404 ProjectNotFound` |

> ⚠ The `UpdateProjectRequest` body field `id` is **ignored**. The handler identifies the project by the slug in the path. Send any `Guid` value (or your local id) — it will not be used.

### 7.5 Admin — Contributions

All require cookie + `Admin` role. Group prefix `/admin/contributions`.

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `GET` | `/admin/contributions` | — | `200 ContributionAdminListDto[]` (no pagination) |
| `POST` | `/admin/contributions` | `CreateContributionRequest` | `201 { id }` with `Location: /contributions/{slug}` / `400 ValidationFailed` |
| `PUT` | `/admin/contributions/{slug}` | `UpdateContributionRequest` | `200 ContributionDetailDto` / `404 ContributionNotFound` |
| `DELETE` | `/admin/contributions/{slug}` | — | `204` / `404 ContributionNotFound` |
| `POST` | `/admin/contributions/{slug}/restore` | — | `200` / `404 ContributionNotFound` |

> ⚠ Same caveat: the `id` field in `UpdateContributionRequest` is ignored.

## 8. Schemas

### 8.1 Common

```ts
// All DateTime fields are ISO 8601 UTC strings.
// All Guid fields are hyphenated lowercase hex strings.

type Guid = string;     // "22222222-2222-2222-2222-222222222222"
type ISODateTime = string; // "2026-09-30T18:00:00Z"
type State = "Active" | "Inactive";

interface PagedList<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface ProblemDetails {
  type?: string;
  title: string;     // stable error code
  status: number;
  detail?: string;
  traceId?: string;
}
```

### 8.2 Projects

```ts
interface ProjectSummaryDto {
  id: Guid;
  slug: string;
  title: string;
  urlThumbnail: string;
  description: string;
}

interface ProjectDetailDto {
  id: Guid;
  title: string;
  slug: string;
  urlThumbnail: string;
  description: string;
  content: string;        // markdown
  state: State;
  createdAt: ISODateTime;
  updatedAt: ISODateTime | null;
}

type ProjectListDto = PagedList<ProjectSummaryDto>;

interface ProjectAdminListDto {
  id: Guid;
  slug: string;
  title: string;
  createdAt: ISODateTime;
  deletedAt: ISODateTime | null;  // present iff soft-deleted
}

interface CreateProjectRequest {
  title: string;            // 1..120
  slug: string;             // 1..80, regex above
  urlThumbnail: string;     // 1..500, absolute http(s) URL
  description: string;      // 1..500
  content: string;          // >= 1 char, markdown
}

interface UpdateProjectRequest {
  id: Guid;                 // ⚠ ignored by the server
  title: string;
  slug: string;
  urlThumbnail: string;
  description: string;
  content: string;
}
```

### 8.3 Contributions

```ts
interface ContributionSummaryDto {
  id: Guid;
  slug: string;
  title: string;
  urlThumbnail: string;
  urlPrContribution: string;   // link to PR / external contribution page
  description: string;
}

interface ContributionDetailDto {
  id: Guid;
  title: string;
  slug: string;
  urlThumbnail: string;
  urlPrContribution: string;
  description: string;
  content: string;             // markdown
  state: State;
  createdAt: ISODateTime;
  updatedAt: ISODateTime | null;
}

type ContributionListDto = PagedList<ContributionSummaryDto>;

interface ContributionAdminListDto {
  id: Guid;
  slug: string;
  title: string;
  createdAt: ISODateTime;
  deletedAt: ISODateTime | null;
}

interface CreateContributionRequest {
  title: string;
  slug: string;
  urlThumbnail: string;
  urlPrContribution: string;   // 1..500, absolute http(s) URL
  description: string;
  content: string;
}

interface UpdateContributionRequest {
  id: Guid;                    // ⚠ ignored by the server
  title: string;
  slug: string;
  urlThumbnail: string;
  urlPrContribution: string;
  description: string;
  content: string;
}
```

### 8.4 Auth

```ts
interface RegisterRequest {
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;        // JWT (also stored in the httpOnly cookie)
  expiresAt: ISODateTime;
}

interface LogoutResponse {
  message: string;      // "Logged out successfully"
}

interface CreatedResponse {
  id: Guid;             // returned by POST /admin/{projects,contributions}
}
```

## 9. Examples

### 9.1 Fetch — list public projects

```ts
const res = await fetch("http://localhost:5000/projects?page=1&pageSize=20");
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data: ProjectListDto = await res.json();
```

### 9.2 Fetch — login (sets cookie)

```ts
const res = await fetch("http://localhost:5000/admin/auth/login", {
  method: "POST",
  credentials: "include",       // required to receive + send the cookie
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
```

### 9.3 Fetch — admin create project

```ts
const res = await fetch("http://localhost:5000/admin/projects", {
  method: "POST",
  credentials: "include",       // sends the auth_token cookie
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "My New Project",
    slug: "my-new-project",
    urlThumbnail: "https://example.com/thumb.png",
    description: "Short summary for cards",
    content: "# Markdown content\n\nDetails go here.",
  } satisfies CreateProjectRequest),
});

if (res.status === 401) {
  // cookie invalid/missing/expired — bounce to /
}
if (res.status === 403) {
  // user is not Admin — surface to admin
}
if (res.status === 400) {
  const problem = await res.json() as ProblemDetails;
  // problem.title === "ValidationFailed"
  // problem.detail has field-by-field messages
}
if (res.status === 201) {
  const { id } = await res.json() as CreatedResponse;
}
```

### 9.4 Fetch — bootstrap register

```ts
const res = await fetch("http://localhost:5000/admin/auth/register", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "X-Bootstrap-Token": "AdminAJN2026!",
  },
  body: JSON.stringify({ email, password }),
});
```

### 9.5 cURL — register + create project

```bash
TOKEN="AdminAJN2026!"

# 1. Register the first user
curl -i -X POST http://localhost:5000/admin/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Token: $TOKEN" \
  -c cookies.txt \
  -d '{"email":"you@example.com","password":"Password1!"}'

# 2. (Manually) INSERT into AspNetUserRoles to grant Admin

# 3. Login (cookies.txt gets the auth_token cookie)
curl -i -X POST http://localhost:5000/admin/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"you@example.com","password":"Password1!"}'

# 4. Create a project
curl -i -X POST http://localhost:5000/admin/projects \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "My New Project",
    "slug": "my-new-project",
    "urlThumbnail": "https://example.com/thumb.png",
    "description": "Short summary",
    "content": "# Markdown content"
  }'
```

## 10. Common pitfalls (read these)

1. **`credentials: "include"` is non-negotiable** on every admin request — without it the cookie is never sent and every admin call returns `401`. Same for receiving it after login.

2. **The `id` in `Update*Request` is ignored.** Send any valid Guid; the server uses the slug from the path. This is a known wart (see D4 in the roadmap) and may be cleaned up later.

3. **Admin lists are not paginated.** `GET /admin/projects` and `GET /admin/contributions` return the full set. Don't render them straight to the DOM without a filter for very large portfolios.

4. **404 vs soft-delete.** When a project is soft-deleted, `GET /projects/{slug}` returns `404 ProjectNotFound` (because of the global query filter), but `GET /admin/projects` still shows it with `deletedAt` populated. To bring it back, call `POST /admin/projects/{slug}/restore`.

5. **Validation errors come back as `400 ValidationFailed` with all field errors concatenated in `detail`.** The format is `"{Field} : {message}; {Field2} : {message2}"`. If you want structured errors, split on `; ` and then on ` : ` — the format is stable but is not a proper array.

6. **Slug changes via PUT.** `PUT /admin/projects/{old-slug}` with `{ slug: "new-slug", ... }` will move the project to the new slug. The response uses the new slug in any subsequent `Location` headers and in the body. Plan your redirect strategy carefully if you have URLs cached client-side.

7. **No `If-Match` / ETags.** Updates are last-write-wins. There's no concurrency control yet. If two admins edit the same project concurrently, the second save overwrites the first silently.

8. **HTTPS in dev.** `UseHttpsRedirection` will 307 any HTTP request to HTTPS. If you're running the backend on plain HTTP, follow the redirect or disable the middleware. In integration tests the redirect is sidestepped by using `https://localhost` as the base address.

9. **No rate limiting yet.** Login endpoints are not rate-limited (TD-003). Don't ship to the open internet without addressing that.

10. **JWT cannot be inspected by the frontend.** The token is in an httpOnly cookie. Use the standard 401 → redirect-to-login flow to detect expiry. The `expiresAt` in the `AuthResponse` body is informational only — the cookie's actual expiry is what matters.

## 11. TypeScript helpers (copy-paste)

If you're building a typed client, drop these into your project:

```ts
export type Guid = string;
export type ISODateTime = string;
export type State = "Active" | "Inactive";

export interface PagedList<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  traceId?: string;
}

export interface ProjectSummaryDto {
  id: Guid;
  slug: string;
  title: string;
  urlThumbnail: string;
  description: string;
}

export interface ProjectDetailDto {
  id: Guid;
  title: string;
  slug: string;
  urlThumbnail: string;
  description: string;
  content: string;
  state: State;
  createdAt: ISODateTime;
  updatedAt: ISODateTime | null;
}

export type ProjectListDto = PagedList<ProjectSummaryDto>;

export interface ProjectAdminListDto {
  id: Guid;
  slug: string;
  title: string;
  createdAt: ISODateTime;
  deletedAt: ISODateTime | null;
}

export interface CreateProjectRequest {
  title: string;
  slug: string;
  urlThumbnail: string;
  description: string;
  content: string;
}

export interface UpdateProjectRequest {
  id: Guid;
  title: string;
  slug: string;
  urlThumbnail: string;
  description: string;
  content: string;
}

export interface ContributionSummaryDto {
  id: Guid;
  slug: string;
  title: string;
  urlThumbnail: string;
  urlPrContribution: string;
  description: string;
}

export interface ContributionDetailDto {
  id: Guid;
  title: string;
  slug: string;
  urlThumbnail: string;
  urlPrContribution: string;
  description: string;
  content: string;
  state: State;
  createdAt: ISODateTime;
  updatedAt: ISODateTime | null;
}

export type ContributionListDto = PagedList<ContributionSummaryDto>;

export interface ContributionAdminListDto {
  id: Guid;
  slug: string;
  title: string;
  createdAt: ISODateTime;
  deletedAt: ISODateTime | null;
}

export interface CreateContributionRequest {
  title: string;
  slug: string;
  urlThumbnail: string;
  urlPrContribution: string;
  description: string;
  content: string;
}

export interface UpdateContributionRequest {
  id: Guid;
  title: string;
  slug: string;
  urlThumbnail: string;
  urlPrContribution: string;
  description: string;
  content: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: ISODateTime;
}

export interface LogoutResponse {
  message: string;
}

export interface CreatedResponse {
  id: Guid;
}
```

## 12. Related docs

- `docs/roadmap-implementacion.md` — backend roadmap (all 17 phases closed).
- `docs/diagrams/architecture.md` — backend architecture diagrams.
- `docs/backlog-deuda-tecnica.md` — known gaps (rate limiting, secrets, etc.).
- `README.md` — how to build, run, and test the backend.