import { techIconPath } from "./tech-icons";

/** Una etiqueta de tecnología lista para renderizar. */
export interface TechTag {
  /** El texto tal como lo manda la API: la casing es del autor. */
  label: string;
  /** Path SVG del ícono, o `null` si la tecnología no tiene ícono. */
  iconPath: string | null;
}

/**
 * Convierte la lista de tecnologías de la API en etiquetas.
 *
 * Cero tecnologías es un caso válido, no un error: el resultado es una
 * lista vacía y el componente no dibuja ningún contenedor. El texto se
 * respeta tal cual lo manda la API (la casing es del autor) y el orden
 * también: es el orden en que el autor las puso.
 */
export function toTechTags(
  technologies: readonly string[] | undefined | null,
): TechTag[] {
  if (!technologies || technologies.length === 0) return [];

  return technologies.map((label) => ({ label, iconPath: techIconPath(label) }));
}
