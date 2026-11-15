import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

/**
 * Detiene el servidor del sitio.
 *
 * Astro corre `astro preview` como daemon en background: matar el proceso
 * que lo lanzó no lo detiene. `astro preview stop` sí lo baja.
 */
export default async function globalTeardown(): Promise<void> {
  try {
    await exec("pnpm", ["astro", "preview", "stop"], { timeout: 15_000 });
  } catch {
    // Si ya estaba detenido, no hay nada que hacer.
  }
}
