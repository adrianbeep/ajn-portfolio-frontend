import { defineConfig, devices } from "@playwright/test";

/**
 * Tests end-to-end del sitio público.
 *
 * La suite corre contra el sitio ya construido, servido por `pnpm preview`.
 * El build lo hace el CI (o el script `test:e2e`) una sola vez y los tests
 * lo reutilizan: reconstruir por test volvería la suite demasiado lenta y la
 * gente dejaría de correrla en local.
 *
 * El contenido viene del stub API, así que la suite es hermética: mismo
 * commit, mismos datos, mismo resultado.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  // El stub y el servidor del sitio los levanta el global setup.
  //
  // No se usa el `webServer` de Playwright a propósito: Astro 7 corre
  // `astro preview` como daemon en background, así que el proceso que
  // Playwright lanzaría termina de inmediato y Playwright lo interpreta
  // como "el servidor murió".
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
