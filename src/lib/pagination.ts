/**
 * Cálculo de la paginación.
 *
 * Es una función pura a propósito: el modelo de la barra se derivaba del
 * frontmatter del componente, donde no se podía testear sin sembrar
 * proyectos de mentira. Acá se testea con números sueltos, sin tocar la
 * API ni el HTML.
 */

/** Una página del listado, con su número. */
export interface PaginationPageItem {
  kind: "page";
  page: number;
}

/** Un hueco entre páginas: se dibuja como una elipsis decorativa. */
export interface PaginationGapItem {
  kind: "gap";
  key: string;
}

export type PaginationItem = PaginationPageItem | PaginationGapItem;

export interface PaginationInput {
  /** Página actual (1-based). */
  currentPage: number;
  /** Cantidad total de páginas. */
  lastPage: number;
  /** Total de ítems del catálogo, no de la página. */
  total: number;
  /** Tamaño de página aplicado. */
  pageSize: number;
}

export interface PaginationModel {
  /** Páginas a mostrar, en orden, con los huecos marcados. */
  items: PaginationItem[];
  /** Primer ítem de la página (1-based). 0 si el catálogo está vacío. */
  from: number;
  /** Último ítem de la página (inclusive). 0 si el catálogo está vacío. */
  to: number;
  /** Total de ítems del catálogo. */
  total: number;
  /** Página actual (1-based), siempre dentro del rango. */
  currentPage: number;
  /** Cantidad total de páginas, mínimo 1. */
  lastPage: number;
  /** Hay una página anterior. */
  hasPrevious: boolean;
  /** Hay una página siguiente. */
  hasNext: boolean;
}

/**
 * Cuántas páginas se muestran alrededor de la actual.
 *
 * Dos a cada lado: con ±1 la barra queda demasiado corta y el lector tiene
 * que paginar de a uno; con más de dos deja de ser una barra y pasa a ser
 * un índice.
 */
export const PAGINATION_WINDOW = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Construye el modelo de la barra de paginación.
 *
 * La ventana es ±`PAGINATION_WINDOW` alrededor de la página actual, más un
 * enlace a la primera y a la última página. Entre los bloques van
 * elipsis, salvo cuando el bloque pegado ya es el primero o el último: una
 * elipsis entre la 1 y la 2 no informa nada.
 */
export function buildPagination(input: PaginationInput): PaginationModel {
  const lastPage = Math.max(1, Math.floor(input.lastPage));
  const currentPage = clamp(Math.floor(input.currentPage), 1, lastPage);
  const total = Math.max(0, Math.floor(input.total));
  const pageSize = Math.max(1, Math.floor(input.pageSize));

  const first = Math.max(1, currentPage - PAGINATION_WINDOW);
  const last = Math.min(lastPage, currentPage + PAGINATION_WINDOW);

  const items: PaginationItem[] = [];

  if (first > 1) {
    items.push({ kind: "page", page: 1 });
    if (first > 2) items.push({ kind: "gap", key: "gap-start" });
  }

  for (let page = first; page <= last; page += 1) {
    items.push({ kind: "page", page });
  }

  if (last < lastPage) {
    if (last < lastPage - 1) items.push({ kind: "gap", key: "gap-end" });
    items.push({ kind: "page", page: lastPage });
  }

  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

  return {
    items,
    from,
    to,
    total,
    currentPage,
    lastPage,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < lastPage,
  };
}

/**
 * URL de una página del listado.
 *
 * Rutas con segmentos y no query params: el sitio es estático, así que cada
 * página es una ruta prerenderizada de verdad ("/projects/2/"), no un
 * parámetro que el servidor tiene que resolver.
 */
export function pageHref(baseUrl: string, page: number): string {
  return page === 1 ? `${baseUrl}/` : `${baseUrl}/${page}/`;
}
