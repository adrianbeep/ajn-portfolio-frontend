/**
 * Backend API client.
 *
 * Single source of truth for the backend contract: docs/api-contract.md.
 * All admin requests MUST use `credentials: 'include'` to send/receive the
 * httpOnly auth_token cookie. See AGENTS.md and api-contract.md §10.
 */

const DEFAULT_BASE_URL = 'http://localhost:5000';

export interface ApiClientConfig {
  baseUrl?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail?: string;
  readonly traceId?: string;

  constructor(status: number, payload: { title: string; detail?: string; traceId?: string }) {
    super(`${status} ${payload.title}${payload.detail ? ` — ${payload.detail}` : ''}`);
    this.name = 'ApiError';
    this.status = status;
    this.title = payload.title;
    this.detail = payload.detail;
    this.traceId = payload.traceId;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Override the default `credentials: 'include'`. Set to 'omit' for public GETs that don't need it. */
  credentials?: RequestCredentials;
}

function getBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_API_BASE_URL) {
    return import.meta.env.PUBLIC_API_BASE_URL;
  }
  return DEFAULT_BASE_URL;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, credentials = 'include', headers, ...rest } = options;

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...rest,
    credentials,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let payload: { title: string; detail?: string; traceId?: string } | null = null;
    try {
      payload = await response.json();
    } catch {
      // ignore — non-JSON error
    }
    throw new ApiError(response.status, payload ?? { title: 'Unknown' });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}