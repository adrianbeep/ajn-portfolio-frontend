import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Global setup de la suite e2e.
 *
 * El contenido del sitio NO viene de una API en runtime: ya está horneado
 * en el HTML del `dist/` que construyó `scripts/test-e2e.mjs` (o el CI)
 * contra el stub. Por eso acá no se levanta ningún stub: levantarlo sería
 * spawnearlo por segunda vez sobre el mismo puerto y morir con
 * EADDRINUSE.
 *
 * Lo único que falta para correr los tests es servir ese `dist/`.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");

/** El puerto donde se sirve el sitio para los tests. */
const PREVIEW_PORT = Number(process.env.PREVIEW_PORT ?? 4321);

/**
 * Espera a que una URL responda.
 */
async function waitFor(url: string, what: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Todavía no arrancó.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${what} no respondió en ${url} dentro de ${timeoutMs}ms.`);
}

/**
 * Levanta el servidor del sitio.
 *
 * El `webServer` de Playwright no sirve acá: Astro 7 corre `astro preview`
 * como daemon en background, así que el proceso que Playwright lanza
 * termina de inmediato y Playwright lo interpreta como "el servidor
 * murió". Por eso el servidor se maneja desde acá.
 *
 * El `shell: true` es por Windows: el shim de pnpm es un `.cmd` y Node no
 * lo puede ejecutar sin pasar por `cmd.exe`. En Linux y macOS el shell es
 * `/bin/sh` y el comportamiento es el mismo. El comando va entero como un
 * string para no provocar el aviso de Node (DEP0190) por argumentos sueltos
 * con `shell: true`.
 *
 * El proceso queda sin referencia (`unref`) a propósito: el servidor sigue
 * vivo para los tests, pero el proceso de Playwright no queda esperando a
 * que termine. Lo que lo baja es `astro preview stop`, en el global
 * teardown.
 */
async function startPreview(): Promise<void> {
  const server = spawn(`pnpm preview --port ${PREVIEW_PORT} --host 127.0.0.1`, {
    cwd: repoRoot,
    stdio: "ignore",
    shell: true,
    env: { ...process.env },
  });
  server.unref();

  await waitFor(`http://127.0.0.1:${PREVIEW_PORT}/`, "El servidor del sitio", 60_000);
}

export default async function globalSetup(): Promise<void> {
  await startPreview();
}
