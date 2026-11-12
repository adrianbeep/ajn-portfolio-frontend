/**
 * Typed wrappers around the apiFetch primitive for the four public endpoints
 * (two list, two detail). Public endpoints don't need credentials — override
 * the default `include` to `omit` so the browser doesn't send cookies on a
 * GET that doesn't need them.
 *
 * The primitive (apiFetch / ApiError / config) is in ./api-client.ts — don't
 * re-import here. Add new endpoints to this file.
 */

import { apiFetch } from './api-client';
import type {
  ProjectListDto,
  ProjectDetailDto,
  ProjectSummaryDto,
  ContributionListDto,
  ContributionDetailDto,
  ContributionSummaryDto,
} from './types';

export const PAGE_SIZE = 12;

interface ListOptions {
  page?: number;
  pageSize?: number;
}

export async function listProjects(
  options: ListOptions = {},
): Promise<ProjectListDto> {
  const { page = 1, pageSize = PAGE_SIZE } = options;
  return apiFetch<ProjectListDto>(`/projects?page=${page}&pageSize=${pageSize}`, {
    credentials: 'omit',
  });
}

export async function getProject(slug: string): Promise<ProjectDetailDto> {
  return apiFetch<ProjectDetailDto>(`/projects/${encodeURIComponent(slug)}`, {
    credentials: 'omit',
  });
}

export async function listContributions(
  options: ListOptions = {},
): Promise<ContributionListDto> {
  const { page = 1, pageSize = PAGE_SIZE } = options;
  return apiFetch<ContributionListDto>(
    `/contributions?page=${page}&pageSize=${pageSize}`,
    { credentials: 'omit' },
  );
}

export async function getContribution(slug: string): Promise<ContributionDetailDto> {
  return apiFetch<ContributionDetailDto>(
    `/contributions/${encodeURIComponent(slug)}`,
    { credentials: 'omit' },
  );
}

/** Fetch every page and return a flat list of summaries. Build-time helper. */
export async function listAllProjects(): Promise<ProjectSummaryDto[]> {
  const items: ProjectSummaryDto[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const data = await listProjects({ page, pageSize: 100 });
    items.push(...data.items);
    totalPages = Math.ceil(data.total / data.pageSize);
    page += 1;
  }
  return items;
}

export async function listAllContributions(): Promise<ContributionSummaryDto[]> {
  const items: ContributionSummaryDto[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const data = await listContributions({ page, pageSize: 100 });
    items.push(...data.items);
    totalPages = Math.ceil(data.total / data.pageSize);
    page += 1;
  }
  return items;
}

export async function listRecentProjects(
  count = 4,
): Promise<ProjectSummaryDto[]> {
  const data = await listProjects({ page: 1, pageSize: count });
  return data.items;
}

export async function listRecentContributions(
  count = 4,
): Promise<ContributionSummaryDto[]> {
  const data = await listContributions({ page: 1, pageSize: count });
  return data.items;
}

// ============================================================================
// Admin (SSR) — server-side wrappers
// ============================================================================
//
// IMPORTANT: SSR fetches don't carry the browser's cookies automatically.
// The auth cookie lives on the browser's origin (frontend, thanks to the
// Vite dev proxy / Vercel rewrites), and Node's fetch has no way to access
// it. Callers MUST pass `cookie` from `Astro.request.headers.get('cookie')`
// so the SSR fetch can forward it to the backend.
//
// Example:
//   const cookie = Astro.request.headers.get('cookie') ?? '';
//   const projects = await listAdminProjects({ cookie });

import type {
  ProjectAdminListDto,
  ContributionAdminListDto,
} from './types';

interface AdminOptions {
  /** Raw Cookie header from the incoming request. Forwarded to the backend. */
  cookie?: string;
}

/** Admin: list all projects (no pagination). */
export async function listAdminProjects(
  options: AdminOptions = {},
): Promise<ProjectAdminListDto[]> {
  return apiFetch<ProjectAdminListDto[]>('/admin/projects', {
    headers: options.cookie ? { cookie: options.cookie } : {},
  });
}

/** Admin: get a project by slug (full detail with content). For edit form. */
export async function getAdminProject(
  slug: string,
  options: AdminOptions = {},
): Promise<ProjectDetailDto> {
  return apiFetch<ProjectDetailDto>(`/admin/projects/${encodeURIComponent(slug)}`, {
    headers: options.cookie ? { cookie: options.cookie } : {},
  });
}

/** Admin: list all contributions (no pagination). Used by the dashboard. */
export async function listAdminContributions(
  options: AdminOptions = {},
): Promise<ContributionAdminListDto[]> {
  return apiFetch<ContributionAdminListDto[]>('/admin/contributions', {
    headers: options.cookie ? { cookie: options.cookie } : {},
  });
}

/** Admin: get a contribution by slug (full detail with content). For edit form. */
export async function getAdminContribution(
  slug: string,
  options: AdminOptions = {},
): Promise<ContributionDetailDto> {
  return apiFetch<ContributionDetailDto>(`/admin/contributions/${encodeURIComponent(slug)}`, {
    headers: options.cookie ? { cookie: options.cookie } : {},
  });
}