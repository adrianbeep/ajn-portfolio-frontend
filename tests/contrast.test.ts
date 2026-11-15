/**
 * Contraste de los tokens del design system.
 *
 * Los tokens son custom properties en un archivo, así que los ratios se
 * calculan directamente: rápido, determinista y sin navegador.
 *
 * Cada token de color de texto se contrasta contra cada fondo de superficie
 * en los dos temas. El umbral es WCAG 2.2 AA para texto normal (4.5:1).
 */

import { describe, expect, it } from "vitest";
import { readTokens } from "./helpers/tokens";
import { AA_NORMAL_TEXT, contrastRatio, formatRatio, isHexColor } from "./helpers/contrast";

const tokens = readTokens();

/** Tokens de color que son fondos o superficies, contra los que se lee. */
const BACKGROUND_TOKENS = ["--color-bg", "--color-surface", "--color-surface-2"];

/**
 * Tokens de color que se usan como texto o como color de enlace.
 * `--color-border` no se contrasta: es un borde, no texto.
 */
const FOREGROUND_TOKENS = ["--color-fg", "--color-fg-muted", "--color-accent"];

interface Pair {
  theme: string;
  foreground: string;
  background: string;
  ratio: number;
}

function collectPairs(theme: string, block: { tokens: Map<string, string> }): Pair[] {
  const pairs: Pair[] = [];

  for (const foreground of FOREGROUND_TOKENS) {
    const fgValue = block.tokens.get(foreground);
    if (!fgValue || !isHexColor(fgValue)) continue;

    for (const background of BACKGROUND_TOKENS) {
      const bgValue = block.tokens.get(background);
      if (!bgValue || !isHexColor(bgValue)) continue;

      pairs.push({
        theme,
        foreground,
        background,
        ratio: contrastRatio(fgValue, bgValue),
      });
    }
  }

  return pairs;
}

describe("contraste de los tokens", () => {
  const pairs = [
    ...collectPairs("oscuro", tokens.root),
    ...collectPairs("claro", tokens.light),
  ];

  it("calcula un ratio para cada combinación de tema, texto y fondo", () => {
    // 2 temas x 3 textos x 3 fondos
    expect(pairs.length).toBe(18);
  });

  it("todos los pares cumplen WCAG AA para texto normal", () => {
    const failures = pairs
      .filter((pair) => pair.ratio < AA_NORMAL_TEXT)
      .map(
        (pair) =>
          `${pair.theme}: ${pair.foreground} sobre ${pair.background} = ${formatRatio(pair.ratio)} ` +
          `(mínimo ${AA_NORMAL_TEXT}:1)`,
      );

    expect(
      failures,
      `Contraste insuficiente:\n${failures.join("\n")}\n\n` +
        "Un token que no alcanza AA se usa como texto y deja de ser legible. " +
        "Ajustá el valor del token o el rol con el que se usa.",
    ).toEqual([]);
  });

  it("el texto principal sobre el fondo tiene contraste holgado", () => {
    const main = pairs.find(
      (p) => p.theme === "oscuro" && p.foreground === "--color-fg" && p.background === "--color-bg",
    );
    expect(main).toBeDefined();
    expect(main!.ratio).toBeGreaterThanOrEqual(7);
  });

  it("el texto atenuado sobre el fondo sigue siendo legible", () => {
    for (const theme of ["oscuro", "claro"]) {
      const muted = pairs.find(
        (p) => p.theme === theme && p.foreground === "--color-fg-muted" && p.background === "--color-bg",
      );
      expect(muted, `falta el par de ${theme}`).toBeDefined();
      expect(muted!.ratio, `${theme}: --color-fg-muted sobre --color-bg`).toBeGreaterThanOrEqual(
        AA_NORMAL_TEXT,
      );
    }
  });
});
