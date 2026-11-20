/**
 * Mapa de tecnología -> ícono.
 *
 * Los paths SVG salen de `simple-icons` (https://simpleicons.org), un
 * catálogo de marcas con licencia CC0-1.0: los paths se hornean en el HTML
 * durante el build, así que el sitio no depende de ningún CDN en runtime.
 *
 * `EF Core` NO tiene ícono en el catálogo (no existe `entityframework`):
 * esa etiqueta se renderiza sólo con texto. Un ícono aproximado o
 * inventado sería peor que ningún ícono, porque mentiría sobre lo que la
 * tecnología es.
 *
 * `ASP.NET Core` tampoco tiene ícono propio: se representa con el de .NET.
 */

import { siAstro, siDotnet, siSqlite, siTypescript, siVercel } from "simple-icons";

/**
 * Normaliza una etiqueta para poder compararla: recorta, colapsa los
 * espacios internos y baja a minúsculas.
 *
 * Así la búsqueda no depende de cómo escribió la tecnología el autor
 * ("Astro", "astro" y "  Astro  " son la misma).
 */
export function normalizeTechLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Path SVG por etiqueta normalizada. */
const ICON_PATHS: Record<string, string> = {
  astro: siAstro.path,
  typescript: siTypescript.path,
  vercel: siVercel.path,
  sqlite: siSqlite.path,
  dotnet: siDotnet.path,
  // ASP.NET Core no tiene entrada propia en el catálogo: usa el ícono de .NET.
  "asp.net core": siDotnet.path,
};

/**
 * El path SVG del ícono de una tecnología, o `null` si no hay ícono.
 *
 * `null` no es un error: es el fallback para toda tecnología que el
 * catálogo no cubre. La etiqueta se sigue mostrando, sólo que sin ícono.
 */
export function techIconPath(label: string): string | null {
  return ICON_PATHS[normalizeTechLabel(label)] ?? null;
}
