#!/usr/bin/env node
/**
 * Corre los tests end-to-end de punta a punta.
 *
 * El sitio se construye UNA vez contra el stub y después se sirve: la suite
 * reutiliza el mismo `dist/`. Reconstruir por test volvería la suite tan
 * lenta que dejaría de correrla en local.
 *
 *   pnpm test:e2e:build
 *
 * Es lo que corre el CI. Para correrla contra un sitio ya construido:
 *
 *   pnpm build && pnpm test:e2e
 */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

const STUB_PORT = Number(process.env.STUB_PORT ?? 5239);
const SITE_URL = process.env.SITE_URL ?? "https://ajn-portfolio.vercel.app";

/**
 * Cómo invocar pnpm.
 *
 * `pnpm` es un shim de Node: `spawn("pnpm", ...)` no lo resuelve bien en
 * todos los entornos (sobre todo dentro del contenedor, donde no está en el
 * PATH por defecto). Ejecutarlo con el propio `node` y el path real del
 * binario funciona en todos los casos.
 */
const PNPM_BIN = process.env.PNPM_BIN ?? "pnpm";

function run(command, args, options = {}) {
  const { env: extraEnv, ...rest } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      // El env se arma acá y no se sobreescribe después: si `options` trajera
      // un `env` crudo, el PATH se perdería y `spawn` no encontraría pnpm.
      env: { ...process.env, ...extraEnv },
      ...rest,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} salió con código ${code}`));
    });
  });
}

async function waitForStub() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${STUB_PORT}/health`);
      if (response.ok) return;
    } catch {
      // Todavía no arrancó.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`El stub API no respondió en el puerto ${STUB_PORT}.`);
}

const stub = spawn(process.execPath, [join(repoRoot, "stub", "server.mjs"), "--port", String(STUB_PORT)], {
  cwd: repoRoot,
  stdio: "ignore",
});

let failed = false;
try {
  await waitForStub();
  console.log(`\n→ Construyendo el sitio contra el stub (${STUB_PORT})...\n`);

  await run("pnpm", ["build"], {
    env: {
      PUBLIC_API_BASE_URL: `http://127.0.0.1:${STUB_PORT}`,
      SITE_URL,
      PNPM_BIN,
    },
  });

  console.log(`\n→ Corriendo los tests e2e...\n`);
  await run("pnpm", ["exec", "playwright", "test"], { env: { PNPM_BIN } });
} catch (error) {
  failed = true;
  console.error(error instanceof Error ? error.message : error);
} finally {
  stub.kill();
}

process.exit(failed ? 1 : 0);
