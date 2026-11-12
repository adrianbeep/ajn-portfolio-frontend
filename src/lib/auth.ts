/**
 * Auth client functions. Wraps the apiFetch primitive for the admin
 * auth endpoints. Does NOT store or read the JWT token — it's in an
 * httpOnly cookie that JS can't access. The browser keeps it.
 *
 * The primitive lives in ./api-client.ts (don't re-import or duplicate
 * it). Add admin endpoints here as they are wired up.
 */

import { apiFetch } from './api-client';
import type { AuthResponse } from './types';

/**
 * Log in with email + password. The backend sets the httpOnly `auth_token`
 * cookie on the response. We don't store the token client-side — JS can't
 * read it anyway (HttpOnly). Just let the browser keep it.
 *
 * Throws ApiError on 401 with `title === 'Auth.InvalidCredentials'`.
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/admin/auth/login', {
    method: 'POST',
    body: { email, password },
    // No need to forward credentials here (no cookie yet), but include
    // is the default and doesn't hurt.
  });
}

/**
 * Log out. The backend clears the `auth_token` cookie.
 */
export async function logout(): Promise<void> {
  await apiFetch<void>('/admin/auth/logout', {
    method: 'POST',
  });
}