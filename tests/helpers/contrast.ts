/**
 * Cálculo de contraste WCAG 2.2.
 *
 * Los ratios se calculan directamente desde los tokens: son custom properties
 * en un archivo, así que no hace falta un navegador para verificarlos. Eso
 * mantiene el check rápido, determinista e independiente del render.
 *
 * Referencia: https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 */

/** Convierte un canal sRGB (0-255) a la escala lineal que pide WCAG. */
function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa de un color hexadecimal. */
export function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "").trim();
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;

  if (!/^[0-9a-f]{6}$/i.test(full)) {
    throw new Error(`Color inválido: ${hex}`);
  }

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Ratio de contraste entre dos colores, de 1 a 21. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Umbrales de WCAG 2.2 AA. */
export const AA_NORMAL_TEXT = 4.5;
export const AA_LARGE_TEXT = 3;

/** Un color que no se puede parsear como hexadecimal. */
export function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/** Redondea el ratio a dos decimales, como se muestra en las auditorías. */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}
