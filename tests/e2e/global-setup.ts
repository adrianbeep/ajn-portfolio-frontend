import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");

/**
 * El puerto del stub.
 *
 * Por defecto 5239, el mismo que usa el backend real en local. Si el
 * backend está corriendo, `STUB_PORT` permite mover el stub a otro puerto
 * sin tocar nada: el contenido ya está horneado en el build, así que el
 * stub sólo hace falta para las peticiones en runtime.
 */
const STUB_PORT = Number(process.env.STUB_PORT ?? 5239);

/** El puerto donde se sirve el sitio para los tests. */
const PREVIEW_PORT = Number(process.env.PREVIEW_PORT ?? 4321);

const children: ChildProcess[] = [];

async function waitFor(url: string, what: string, timeoutMs = 30_000): Promise<void> {
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
 * Levanta el stub API para que el build y los tests tengan contenido
 * determinista.
 */
async function startStub(): Promise<void> {
  const server = spawn(
    process.execPath,
    [join(repoRoot, "stub", "server.mjs"), "--port", String(STUB_PORT)],
    { cwd: repoRoot, stdio: "ignore", env: { ...process.env, STUB_PORT: String(STUB_PORT) } },
  );
  children.push(server);
  await waitFor(`http://127.0.0.1:${STUB_PORT}/health`, "El stub API");
}

/**
 * Levanta el servidor del sitio.
 *
 * El `webServer` de Playwright no sirve acá: Astro 7 corre `astro preview`
 * como daemon en background, así que el proceso que Playwright lanza
 * termina de inmediato y Playwright lo interpreta como "el servidor
 * murió". Por eso el servidor se maneja desde acá.
 */
async function startPreview(): Promise<void> {
  const server = spawn("pnpm", ["preview", "--port", String(PREVIEW_PORT), "--host", "127.0.0.1"], {
    cwd: repoRoot,
    stdio: "ignore",
    env: { ...process.env },
  });
  children.push(server);

  await waitFor(`http://127.0.0.1:${PREVIEW_PORT}/`, "El servidor del sitio", 60_000);
}

export default async function globalSetup(): Promise<void> {
  await startStub();
  await startPreview();
}

export async function globalTeardown(): Promise<void> {
  for (const child of children) child.kill();
}
