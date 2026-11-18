/**
 * Tipos del contrato con la API.
 * Origen: ../ajn-portfolio-backend/docs/api-contract.md
 * (sección "2.6 Pagination" y las pantallas 2 a 5 del mapa de endpoints).
 * No redeclarar: si cambia el contrato, se actualiza acá.
 */

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

/**
 * Resumen de un proyecto: lo que la tarjeta del listado necesita.
 *
 * `state` y `createdAt` viajan en el resumen a propósito: antes la tarjeta
 * los tomaba del detalle, y eso obligaba al listado a pedir el detalle de
 * CADA proyecto (un pedido por tarjeta) sólo para pintar dos datos.
 */
export interface ProjectSummaryDto {
  id: Guid;
  slug: string;
  title: string;
  urlThumbnail: string;
  description: string;
  state: string;
  createdAt: ISODateTime;
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

/**
 * Resumen de una contribución.
 *
 * `urlPrContribution` es el enlace al pull request upstream: es lo que
 * distingue una contribución de un proyecto propio.
 */
export interface ContributionSummaryDto {
  id: Guid;
  slug: string;
  title: string;
  urlThumbnail: string;
  urlPrContribution: string;
  description: string;
  state: string;
  createdAt: ISODateTime;
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

/** Una página del listado paginado de proyectos (build time, sólo resúmenes). */
export interface ProjectPage {
  items: ProjectSummaryDto[];
  /** Total de proyectos que matchean el filtro, a lo largo de todas las páginas. */
  total: number;
  /** Página actual (1-based). */
  page: number;
  /** Tamaño de página que la API aplicó realmente. */
  pageSize: number;
  /** Cantidad total de páginas: `max(1, ceil(total / pageSize))`. */
  lastPage: number;
}

/** Una página del listado paginado de contribuciones (build time, sólo resúmenes). */
export interface ContributionPage {
  items: ContributionSummaryDto[];
  /** Total de contribuciones que matchean el filtro, a lo largo de todas las páginas. */
  total: number;
  /** Página actual (1-based). */
  page: number;
  /** Tamaño de página que la API aplicó realmente. */
  pageSize: number;
  /** Cantidad total de páginas: `max(1, ceil(total / pageSize))`. */
  lastPage: number;
}
