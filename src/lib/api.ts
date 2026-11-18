import type {
  ContributionDetailDto,
  ContributionListDto,
  ContributionPage,
  ContributionSummaryDto,
  ProjectDetailDto,
  ProjectListDto,
  ProjectPage,
  ProjectSummaryDto,
} from "./types";

/**
 * Cliente de build time. El sitio público es estático: los datos se piden
 * durante el build y se hornean en el HTML. `PUBLIC_API_BASE_URL` debe ser
 * una URL absoluta (undici rechaza URLs relativas).
 */
const BASE_URL = (import.meta.env.PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

/**
 * Tamaño de página alineado al contrato de la API
 * (ajn-portfolio-backend/docs/api-contract.md, sección "2.6 Pagination"):
 * default 20, máximo 100.
 *
 * Diez, no veinte: la tarjeta de proyecto mide ~420px de alto, así que veinte
 * tarjetas apiladas son una página de 10.000px con el paginador al final,
 * fuera de la pantalla. Diez deja el paginador a la vista.
 */
export const PROJECTS_PAGE_SIZE = 10;

/** Las contribuciones se paginan con el mismo tamaño que los proyectos. */
export const CONTRIBUTIONS_PAGE_SIZE = 10;

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

/** Listado paginado de contribuciones. Devuelve el envelope del contrato. */
export function listContributions(
  page = 1,
  pageSize = CONTRIBUTIONS_PAGE_SIZE,
): Promise<ContributionListDto> {
  return requestOrFallback<ContributionListDto>(
    "/contributions",
    { page, pageSize },
    { items: [], total: 0, page, pageSize },
  );
}

/** Detalle de un proyecto por slug. */
export function getProject(slug: string): Promise<ProjectDetailDto | null> {
  return requestOrFallback<ProjectDetailDto | null>(
    `/projects/${encodeURIComponent(slug)}`,
    undefined,
    // Un detalle inexistente: la página de detalle no se va a generar, pero
    // el build no se rompe. `getStaticPaths` filtra los que no existen.
    null,
  );
}

/** Detalle de una contribución por slug. */
export function getContribution(slug: string): Promise<ContributionDetailDto | null> {
  return requestOrFallback<ContributionDetailDto | null>(
    `/contributions/${encodeURIComponent(slug)}`,
    undefined,
    // Mismo criterio que `getProject`: una contribución que no existe no
    // genera ruta, pero no rompe el build.
    null,
  );
}

/** Los dos detalles que el sitio puede resolver. */
type DetailDto = ProjectDetailDto | ContributionDetailDto;

/**
 * Resuelve los detalles de una lista de slugs.
 *
 * Un detalle que no se pudo obtener (API caída) se descarta en lugar de
 * romper el build: la página se salta, pero el resto se construye.
 */
async function resolveDetails<TDetail extends DetailDto>(
  slugs: string[],
  get: (slug: string) => Promise<TDetail | null>,
): Promise<TDetail[]> {
  const resolved: (TDetail | null)[] = await Promise.all(slugs.map((slug) => get(slug)));

  return resolved.filter((detail): detail is TDetail => detail !== null);
}

/**
 * Una página del listado de proyectos, construida SÓLO con resúmenes.
 *
 * No pide el detalle de ningún proyecto: la tarjeta del listado muestra
 * título, descripción, año y estado, y los cuatro vienen del resumen. Pedir
 * el detalle de cada uno era un pedido por tarjeta — un patrón N+1 que
 * además convertía un fallo puntual de la API en una tarjeta que
 * desaparecía del listado en silencio.
 */
export async function getProjectSummaryPage(
  page = 1,
  pageSize = PROJECTS_PAGE_SIZE,
): Promise<ProjectPage> {
  const list = await listProjects(page, pageSize);
  const appliedPageSize = list.pageSize > 0 ? list.pageSize : PROJECTS_PAGE_SIZE;

  return {
    items: list.items,
    total: list.total,
    page: list.page,
    pageSize: appliedPageSize,
    lastPage: Math.max(1, Math.ceil(list.total / appliedPageSize)),
  };
}

/**
 * Una página del listado de contribuciones, construida SÓLO con resúmenes.
 *
 * Igual que el de proyectos: el listado no toca el endpoint de detalle.
 */
export async function getContributionSummaryPage(
  page = 1,
  pageSize = CONTRIBUTIONS_PAGE_SIZE,
): Promise<ContributionPage> {
  const list = await listContributions(page, pageSize);
  const appliedPageSize = list.pageSize > 0 ? list.pageSize : CONTRIBUTIONS_PAGE_SIZE;

  return {
    items: list.items,
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
    const { items, total } = await getProjectSummaryPage(page, PROJECTS_PAGE_SIZE);
    summaries.push(...items);
    if (items.length === 0 || summaries.length >= total) break;
    page += 1;
  }

  return summaries;
}

/**
 * Todos los resúmenes de contribuciones, recorriendo las páginas de la API.
 */
export async function getAllContributionSummaries(): Promise<ContributionSummaryDto[]> {
  const summaries: ContributionSummaryDto[] = [];
  let page = 1;

  for (;;) {
    const { items, total } = await getContributionSummaryPage(page, CONTRIBUTIONS_PAGE_SIZE);
    summaries.push(...items);
    if (items.length === 0 || summaries.length >= total) break;
    page += 1;
  }

  return summaries;
}

/**
 * Todos los proyectos con su detalle resuelto.
 *
 * Sólo lo usan las páginas de detalle (`getStaticPaths`), que necesitan el
 * cuerpo en markdown. El listado nunca lo llama.
 */
export async function getAllProjects(): Promise<ProjectDetailDto[]> {
  const summaries = await getAllProjectSummaries();
  return resolveDetails(
    summaries.map((summary) => summary.slug),
    getProject,
  );
}

/**
 * Todas las contribuciones con su detalle resuelto.
 *
 * Igual que `getAllProjects`: sólo las páginas de detalle lo necesitan.
 */
export async function getAllContributions(): Promise<ContributionDetailDto[]> {
  const summaries = await getAllContributionSummaries();
  return resolveDetails(
    summaries.map((summary) => summary.slug),
    getContribution,
  );
}

/**
 * Cuántas contribuciones hay publicadas.
 *
 * No hace falta listarlas para contarlas: el envelope trae el total. La
 * página de detalle de la API con `pageSize=1` es la forma más barata de
 * saberlo, y este número decide si el toggle entre catálogos se renderiza:
 * un enlace a un catálogo vacío es ruido.
 */
export async function countContributions(): Promise<number> {
  const list = await listContributions(1, 1);
  return list.total;
}
