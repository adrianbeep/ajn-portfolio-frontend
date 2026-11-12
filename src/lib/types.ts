// Verbatim from docs/api-contract.md §11 (TypeScript helpers).
// Do NOT rename or restructure — the backend contract is the source of truth.

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