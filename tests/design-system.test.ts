/**
 * Invariantes del design system.
 *
 * `src/styles/tokens.css` es la única fuente de espaciado, color y temas.
 * Estas comprobaciones existen para que esa regla no dependa de la
 * disciplina de cada PR: un color literal o un espaciado hardcodeado
 * fuera de `src/styles/` rompe el build.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STYLES_DIR, STYLE_FILES, readTokens, isProjectToken } from "./helpers/tokens";

/** Archivos que NO son hojas de estilos del design system. */
const SOURCE_FILES = ["base.css", "components.css"];

function readStyle(file: string): string {
  return readFileSync(join(STYLES_DIR, file), "utf8");
}

/**
 * Números de línea donde aparece un patrón.
 * Devuelve "archivo:línea" para que el mensaje sea accionable.
 */
function findMatches(css: string, pattern: RegExp): string[] {
  const found: string[] = [];
  css.split("\n").forEach((line, index) => {
    if (pattern.test(line)) found.push(`línea ${index + 1}: ${line.trim()}`);
  });
  return found;
}

describe("invariantes del design system", () => {
  describe("colores literales", () => {
    it("no hay colores hexadecimales fuera de tokens.css", () => {
      const offenders: string[] = [];

      for (const file of SOURCE_FILES) {
        const matches = findMatches(readStyle(file), /#[0-9a-fA-F]{3,8}\b/);
        if (matches.length > 0) {
          offenders.push(`${file}:\n  ${matches.join("\n  ")}`);
        }
      }

      expect(
        offenders,
        `Colores literales fuera de tokens.css. Definí el color como token:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });

    it("no hay funciones rgb()/hsl() fuera de tokens.css", () => {
      const offenders: string[] = [];

      for (const file of SOURCE_FILES) {
        const matches = findMatches(readStyle(file), /\b(?:rgba?|hsla?)\(/);
        if (matches.length > 0) {
          offenders.push(`${file}:\n  ${matches.join("\n  ")}`);
        }
      }

      expect(
        offenders,
        `Funciones de color fuera de tokens.css. Definí el color como token:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });
  });

  describe("espaciados literales", () => {
    it("no hay espaciado hardcodeado en margin/padding/gap/inset", () => {
      // La técnica del skip-link usa -9999px para esconder el elemento
      // visualmente. Es la excepción conocida y está permitida a propósito.
      const allowed = /left:\s*-9999px/;

      const offenders: string[] = [];
      const pattern =
        /(?:margin|padding|gap|inset|top|left|right|bottom)[a-z-]*\s*:[^;]*\b\d+(?:\.\d+)?(?:px|rem|em)\b/;

      for (const file of SOURCE_FILES) {
        const css = readStyle(file);
        css.split("\n").forEach((line, index) => {
          if (pattern.test(line) && !allowed.test(line)) {
            offenders.push(`${file}: línea ${index + 1}: ${line.trim()}`);
          }
        });
      }

      expect(
        offenders,
        `Espaciado literal fuera de tokens.css. Usá un token de espaciado:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });
  });

  describe("tokens", () => {
    const tokens = readTokens();

    it("todo token referenciado con var() está definido", () => {
      const offenders: string[] = [];

      for (const file of STYLE_FILES) {
        const css = readStyle(file);
        const pattern = /var\((--[a-z0-9-]+)/g;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(css)) !== null) {
          const token = match[1];
          if (!isProjectToken(token)) continue;
          if (!tokens.declarations.has(token)) {
            const line = css.slice(0, match.index).split("\n").length;
            offenders.push(`${file}: línea ${line}: ${token} no está definido en tokens.css`);
          }
        }
      }

      expect(
        offenders,
        `Tokens referenciados pero no definidos:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });

    it("todo token de color existe en los dos temas", () => {
      const offenders: string[] = [];

      for (const [name] of tokens.root.tokens) {
        if (!name.startsWith("--color-")) continue;
        if (!tokens.light.tokens.has(name)) {
          offenders.push(`${name} está en el tema oscuro pero no en el claro`);
        }
      }

      for (const [name] of tokens.light.tokens) {
        if (!name.startsWith("--color-")) continue;
        if (!tokens.root.tokens.has(name)) {
          offenders.push(`${name} está en el tema claro pero no en el oscuro`);
        }
      }

      expect(
        offenders,
        `Tokens de color desalineados entre temas:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });

    it("el tema claro sobreescribe todos los tokens de color del oscuro", () => {
      const colorNames = [...tokens.root.tokens.keys()].filter((t) => t.startsWith("--color-"));
      expect(colorNames.length).toBeGreaterThan(0);
      expect(tokens.light.tokens.size).toBeGreaterThan(0);
    });

    it("tokens.css no está vacío y declara los tokens base", () => {
      for (const required of [
        "--color-bg",
        "--color-fg",
        "--color-accent",
        "--space-1",
        "--text-base",
        "--measure",
      ]) {
        expect(tokens.declarations.has(required), `falta el token ${required}`).toBe(true);
      }
    });
  });
});
