/**
 * Single source of truth for the theme toggle binding. Imported by both
 * `ThemeToggle.astro` (public site) and `AdminLayout.astro` (admin shell).
 * Astro deduplicates `<script>` blocks that share the same module, so this
 * code is shipped exactly once per page regardless of how many components
 * reference it.
 *
 * The trigger element carries `data-theme-toggle`. Clicking it flips the
 * `data-theme` attribute on `<html>` between 'light' and 'dark' and
 * persists the choice in `localStorage`. The bootstrap script in both
 * layouts reads the same key on first paint to avoid a flash.
 *
 * The icon visibility is set BOTH via CSS (ThemeToggle.astro, with
 * !important) and via inline style here. The inline style is the
 * second line of defence: even if the CSS rule loses to a stale
 * cached style, an aggressive browser extension, or a weird @layer
 * cascade interaction, the icons still get shown/hidden correctly.
 */

function readStoredTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage can throw in privacy contexts — fall through.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function reapplyTheme(): void {
  // Astro's <ClientRouter /> can drop the data-theme attribute off the
  // <html> element during a soft navigation. Reapply from localStorage
  // so the rest of the code (CSS rules, syncIcons) keeps working.
  const theme = readStoredTheme();
  document.documentElement.setAttribute('data-theme', theme);
}

function syncIcons(): void {
  // Make sure the theme attribute is on <html> even if the bootstrap
  // inline script in <head> hasn't run yet for this view.
  reapplyTheme();
  const theme = document.documentElement.getAttribute('data-theme');
  document.querySelectorAll<HTMLElement>('.theme-toggle').forEach((btn) => {
    const sun = btn.querySelector<HTMLElement>('.icon-sun');
    const moon = btn.querySelector<HTMLElement>('.icon-moon');
    if (sun) sun.style.display = theme === 'dark' ? 'none' : '';
    if (moon) moon.style.display = theme === 'light' ? 'none' : '';
  });
}

function bindThemeToggle(): void {
  syncIcons();
  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((el) => {
    if (el.dataset.bound) return;
    el.dataset.bound = 'true';
    el.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      syncIcons();
    });
  });
}

bindThemeToggle();
document.addEventListener('astro:page-load', bindThemeToggle);
// After every soft navigation: reapply the theme attribute (in case
// <ClientRouter /> dropped it) and resync the toggle icons. This
// hook is the canonical "DOM was just replaced" event and fires
// reliably for every soft navigation, unlike astro:page-load.
document.addEventListener('astro:after-swap', () => {
  reapplyTheme();
  bindThemeToggle();
});