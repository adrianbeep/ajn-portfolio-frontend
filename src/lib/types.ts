/**
 * Tipos del contrato con la API.
 * Origen: ../ajn-portfolio-backend/docs/api-contract.md (sección 8 y 11).
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

/** Una tarjeta de proyecto con el detalle ya resuelto (build time). */
export interface ProjectWithDetail extends ProjectDetailDto {
  summary: ProjectSummaryDto;
}
