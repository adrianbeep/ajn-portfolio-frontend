import type {
  ProjectDetailDto,
  ProjectListDto,
  ProjectPage,
  ProjectSummaryDto,
  ProjectWithDetail,
} from "./types";

/**
 * Cliente de build time. El sitio público es estático: los datos se piden
 * durante el build y se hornean en el HTML. `PUBLIC_API_BASE_URL` debe ser
 * una URL absoluta (undici rechaza URLs relativas).
 */
const BASE_URL = (import.meta.env.PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

/** Tamaño de página alineado al contrato de la API
 * (ajn-portfolio-backend/docs/api-contract.md, sección "Pagination"): default 20, máximo 100. */
export const PROJECTS_PAGE_SIZE = 20;

/** Proyectos que muestra la home antes de linkear al listado completo. */
export const PROJECTS_PREVIEW_COUNT = 4;

function apiUrl(path: string, params?: Record<string, string | number>): string {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, String(value));
  return url.toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GET ${url} respondió ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }

  return (await response.json()) as T;
}

/**
 * Cache de build: todas las rutas de un build estático comparten el mismo
 * proceso, así que cada URL se pide una sola vez. En dev la cache se apaga
 * (`astro dev` no debe servir contenido viejo).
 */
const requestCache = new Map<string, Promise<unknown>>();

/** URLs cuyo fetch falló, para avisar una sola vez por URL y no spamear el log. */
const reportedFailures = new Set<string>();

/**
 * Avisa que el build se está publicando sin contenido.
 *
 * El sitio es estático y hornea los datos en build time: si la API no
 * responde, el build NO puede abortar (un backend caído no puede dejar el
 * frontend sin deploy), pero tampoco puede fallar en silencio. El warning va
 * a stderr para que CI lo muestre aunque el resto del build se vea limpio.
 */
function warnUnavailable(url: string, error: unknown): void {
  if (reportedFailures.has(url)) return;
  reportedFailures.add(url);

  const reason = error instanceof Error ? error.message : String(error);
  console.warn(
    [
      "",
      "  ⚠️  API de proyectos no disponible — el sitio se construye SIN contenido de proyectos.",
      `      URL:    ${url}`,
      `      Error:  ${reason}`,
      "      This is a WARNING, not an error: the build continues and the site is",
      "      published with an empty project listing. Check PUBLIC_API_BASE_URL.",
      "",
    ].join("\n"),
  );
}

function request<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = apiUrl(path, params);

  if (import.meta.env.DEV) return fetchJson<T>(url);

  const cached = requestCache.get(url);
  if (cached) return cached as Promise<T>;

  const pending = fetchJson<T>(url);
  requestCache.set(url, pending);
  // Una URL que falló no se reintenta, pero su rechazo no puede quedar sin
  // manejar: el error se sigue propagando a quien la pidió.
  pending.catch(() => {});
  return pending;
}

/**
 * Igual que `request`, pero tolerante a una API caída.
 *
 * Devuelve `fallback` cuando el fetch falla, y registra el warning visible.
 * La URL que falló queda cacheada con su valor de fallback, así que no se
 * reintenta y las llamadas siguientes reciben el mismo valor vacío.
 */
function requestOrFallback<T>(
  path: string,
  params: Record<string, string | number> | undefined,
  fallback: T,
): Promise<T> {
  const url = apiUrl(path, params);

  const pending = request<T>(path, params).catch((error: unknown) => {
    warnUnavailable(url, error);
    return fallback;
  });

  // Lo que queda cacheado es la promise que resuelve al fallback, no la que
  // falla: así las llamadas siguientes reciben el mismo valor vacío en vez
  // de volver a propagar el error.
  requestCache.set(url, pending);
  return pending;
}

/** Listado paginado de proyectos. Devuelve el envelope del contrato. */
export function listProjects(page = 1, pageSize = PROJECTS_PAGE_SIZE): Promise<ProjectListDto> {
  return requestOrFallback<ProjectListDto>(
    "/projects",
    { page, pageSize },
    { items: [], total: 0, page, pageSize },
  );
}

/** Detalle de un proyecto por slug. */
export function getProject(slug: string): Promise<ProjectDetailDto> {
  return requestOrFallback<ProjectDetailDto>(
    `/projects/${encodeURIComponent(slug)}`,
    undefined,
    // Un detalle inexistente: la página de detalle no se va a generar, pero
    // el build no se rompe. `getStaticPaths` filtra los que no existen.
    null as unknown as ProjectDetailDto,
  );
}

/** Une un resumen con su detalle: la tarjeta muestra año y estado, que sólo
 * vienen del endpoint de detalle. */
function withDetail(summary: ProjectSummaryDto, detail: ProjectDetailDto): ProjectWithDetail {
  return { ...detail, summary };
}

/**
 * Resuelve los detalles de una página de resúmenes.
 *
 * Un detalle que no se pudo obtener (API caída) se descarta en lugar de
 * romper el build: la tarjeta se salta, pero el resto de la página se
 * construye.
 */
async function resolveDetails(summaries: ProjectSummaryDto[]): Promise<ProjectWithDetail[]> {
  const resolved = await Promise.all(
    summaries.map(async (summary) => {
      const detail = await getProject(summary.slug);
      return detail ? withDetail(summary, detail) : null;
    }),
  );

  return resolved.filter((project): project is ProjectWithDetail => project !== null);
}

/**
 * Una página del listado con los detalles ya resueltos.
 */
export async function getProjectPage(
  page = 1,
  pageSize = PROJECTS_PAGE_SIZE,
): Promise<ProjectPage> {
  const list = await listProjects(page, pageSize);
  const appliedPageSize = list.pageSize > 0 ? list.pageSize : PROJECTS_PAGE_SIZE;

  const items = await resolveDetails(list.items);

  return {
    items,
    total: list.total,
    page: list.page,
    pageSize: appliedPageSize,
    lastPage: Math.max(1, Math.ceil(list.total / appliedPageSize)),
  };
}

/**
 * Todos los resúmenes de proyectos, recorriendo las páginas de la API.
 */
export async function getAllProjectSummaries(): Promise<ProjectSummaryDto[]> {
  const summaries: ProjectSummaryDto[] = [];
  let page = 1;

  for (;;) {
    const list = await listProjects(page, PROJECTS_PAGE_SIZE);
    summaries.push(...list.items);
    if (list.items.length === 0 || summaries.length >= list.total) break;
    page += 1;
  }

  return summaries;
}

/**
 * Todos los proyectos con su detalle resuelto.
 */
export async function getAllProjects(): Promise<ProjectWithDetail[]> {
  const summaries = await getAllProjectSummaries();
  return resolveDetails(summaries);
}
