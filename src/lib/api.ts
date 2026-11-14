import type { ProjectDetailDto, ProjectListDto, ProjectSummaryDto, ProjectWithDetail } from "./types";

/**
 * Cliente de build time. El sitio público es estático: los datos se piden
 * durante el build y se hornean en el HTML. `PUBLIC_API_BASE_URL` debe ser
 * una URL absoluta (undici rechaza URLs relativas).
 */
const BASE_URL = (import.meta.env.PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

function apiUrl(path: string, params?: Record<string, string | number>): string {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, String(value));
  return url.toString();
}

async function request<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = apiUrl(path, params);
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GET ${url} respondió ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }

  return (await response.json()) as T;
}

/** Listado paginado de proyectos. */
export function listProjects(page = 1, pageSize = 24): Promise<ProjectListDto> {
  return request<ProjectListDto>("/projects", { page, pageSize });
}

/** Detalle de un proyecto por slug. */
export function getProject(slug: string): Promise<ProjectDetailDto> {
  return request<ProjectDetailDto>(`/projects/${encodeURIComponent(slug)}`);
}

/**
 * Proyectos con su detalle resuelto: la tarjeta muestra año y estado, que
 * sólo vienen del endpoint de detalle. Las requests corren en paralelo y son
 * pocas (el sitio se construye en build time).
 */
export async function getProjectsWithDetails(pageSize = 24): Promise<ProjectWithDetail[]> {
  const list = await listProjects(1, pageSize);

  const details = await Promise.all(
    list.items.map(async (summary: ProjectSummaryDto) => {
      const detail = await getProject(summary.slug);
      return { ...detail, summary };
    }),
  );

  return details;
}
