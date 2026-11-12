import { defineMiddleware } from 'astro:middleware';

/**
 * Auth middleware. Runs on every /admin/* request EXCEPT the login page.
 *
 * 1. If no `auth_token` cookie → redirect to /admin/login?redirect=<path>
 * 2. If cookie exists → probe a protected endpoint to verify it's still valid
 *    (the cookie could be expired or the user revoked)
 * 3. If probe returns 401 → cookie is bad, clear it, redirect to login
 * 4. If probe returns 200 → allow through
 * 5. If probe fails with a network error → allow through, the page will
 *    show its own error UI
 *
 * Also: if a user IS logged in and visits /admin/login, redirect them to
 * /admin (don't show the login form to authenticated users).
 */

// An endpoint we can probe to check auth without side effects.
// /admin/projects is paginated and small; we'll fetch with pageSize=1.
// IMPORTANT: must use the /api/ prefix so the dev proxy (Vite) in
// astro.config.mjs AND the production Vercel rewrites both forward it
// to the backend. Without the prefix the dev proxy skips it and the
// production rewrite never matches.
const AUTH_PROBE_PATH = '/api/admin/projects?page=1&pageSize=1';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Not an /admin route — pass through.
  if (!pathname.startsWith('/admin')) {
    return next();
  }

  // Login page is special. The middleware also runs at build time during
  // prerendering, and at that point `context.cookies` is empty — there
  // is no real request to read from. If we ran the redirect logic here,
  // Astro would save a static redirect response in place of the form.
  // Always pass through during build/runtime; the "bounce logged-in
  // users to /admin" UX only works when this page is server-rendered.
  const isLogin = pathname === '/admin/login' || pathname === '/admin/login/';
  if (isLogin) {
    return next();
  }

  const authToken = context.cookies.get('auth_token')?.value;

  // Protected page, no cookie — redirect to login with the original target.
  if (!authToken) {
    const redirectTo = encodeURIComponent(pathname + context.url.search);
    return context.redirect(`/admin/login?redirect=${redirectTo}`);
  }

  // Protected page, cookie present — probe the backend to verify it's valid.
  try {
    const probeUrl = new URL(AUTH_PROBE_PATH, context.url.origin);
    const response = await fetch(probeUrl, {
      headers: {
        // Forward the cookie to the backend (the auth cookie is on this origin
        // thanks to the Vite proxy in dev / Vercel rewrites in prod).
        cookie: `auth_token=${authToken}`,
      },
    });

    if (response.status === 401 || response.status === 302) {
      // 401 = token expired/invalid. 302 = ASP.NET Core's default auth-challenge
      // redirect to /Account/Login. Either way, the user is not authenticated
      // — clear the cookie and bounce to login.
      context.cookies.delete('auth_token', { path: '/' });
      const redirectTo = encodeURIComponent(pathname + context.url.search);
      return context.redirect(`/admin/login?redirect=${redirectTo}`);
    }

    // 200 (or anything other than 401/302): allow through. The page itself
    // can handle other errors (e.g. 500 from the backend).
  } catch (error) {
    // Network error — backend unreachable. Allow through; the page will
    // show its own error state. Don't bounce to login since this isn't an
    // auth issue.
    console.error('[middleware] auth probe failed:', error);
  }

  return next();
});