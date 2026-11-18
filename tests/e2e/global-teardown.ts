import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

/**
 * Detiene el servidor del sitio.
 *
 * Astro corre `astro preview` como daemon en background: matar el proceso
 * que lo lanzó no lo detiene. `astro preview stop` sí lo baja.
 *
 * El comando va con `shell: true` porque el shim de pnpm es un `.cmd` en
 * Windows y Node no lo puede ejecutar sin pasar por `cmd.exe`. Sin esto el
 * teardown falla en silencio y el preview queda vivo: la corrida siguiente
 * se topa con "Another astro preview server is already running".
 */
export default async function globalTeardown(): Promise<void> {
  try {
    await exec("pnpm astro preview stop", { timeout: 15_000, shell: true });
  } catch {
    // Si ya estaba detenido, no hay nada que hacer.
  }
}
