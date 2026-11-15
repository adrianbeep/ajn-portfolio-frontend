/**
 * Lectura y análisis de los tokens del design system.
 *
 * `src/styles/tokens.css` es la única fuente de espaciado, color y temas.
 * Estos helpers leen ese archivo para poder verificar sus invariantes sin
 * depender de un navegador.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export const STYLES_DIR = join(here, "..", "..", "src", "styles");
export const TOKENS_FILE = join(STYLES_DIR, "tokens.css");

/** Los tres hojas de estilos del proyecto. */
export const STYLE_FILES = ["tokens.css", "base.css", "components.css"] as const;

/** Tokens que define Shiki en runtime, no el design system. */
const EXTERNAL_TOKENS = new Set([
  "--shiki-dark",
  "--shiki-dark-bg",
  "--shiki-light",
  "--shiki-light-bg",
]);

export interface ThemeBlock {
  /** Selector del bloque: ":root" o "[data-theme=\"light\"]". */
  selector: string;
  /** Tokens declarados en el bloque, con su valor. */
  tokens: Map<string, string>;
}

export interface TokensFile {
  /** Bloque `:root`: el tema oscuro y todos los tokens compartidos. */
  root: ThemeBlock;
  /** Bloque `[data-theme="light"]`: sólo lo que el tema claro sobreescribe. */
  light: ThemeBlock;
  /** Todos los tokens declarados en el archivo, con la cantidad de bloques
   * en los que aparecen. */
  declarations: Map<string, number>;
}

function parseBlock(css: string, selector: string): ThemeBlock {
  const tokens = new Map<string, string>();
  const pattern = new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m");
  const match = css.match(pattern);
  if (!match) return { selector, tokens };

  const body = match[1];
  const declaration = /--([a-z0-9-]+)\s*:\s*([^;]+);/g;
  let entry: RegExpExecArray | null;
  while ((entry = declaration.exec(body)) !== null) {
    tokens.set(`--${entry[1]}`, entry[2].trim());
  }

  return { selector, tokens };
}

/** Lee y parsea `tokens.css`. */
export function readTokens(file: string = TOKENS_FILE): TokensFile {
  const css = readFileSync(file, "utf8");

  const root = parseBlock(css, ":root");
  const light = parseBlock(css, '[data-theme="light"]');

  const declarations = new Map<string, number>();
  for (const token of root.tokens.keys()) {
    declarations.set(token, (declarations.get(token) ?? 0) + 1);
  }
  for (const token of light.tokens.keys()) {
    declarations.set(token, (declarations.get(token) ?? 0) + 1);
  }

  return { root, light, declarations };
}

/** Si un token lo define el design system (y no Shiki). */
export function isProjectToken(token: string): boolean {
  return !EXTERNAL_TOKENS.has(token);
}
