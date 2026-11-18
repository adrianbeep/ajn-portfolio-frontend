import { describe, expect, it } from "vitest";
import { buildPagination, pageHref, type PaginationModel } from "../src/lib/pagination";

/**
 * La barra de paginación es una función pura: se testea con números, sin
 * sembrar proyectos de mentira ni depender de la API.
 *
 * La lógica vivía en el frontmatter del componente, donde no se podía
 * testear. Ahí es donde empezó el problema: el paginador creció sin que
 * nadie lo revisara y terminó con una ventana de ±1 y sin rango.
 */

/** La forma de la barra: los números de página y los huecos. */
function shape(model: PaginationModel): string[] {
  return model.items.map((item) => (item.kind === "gap" ? "…" : String(item.page)));
}

/** Los números de página, sin los huecos. */
function pages(model: PaginationModel): number[] {
  return model.items.flatMap((item) => (item.kind === "page" ? [item.page] : []));
}

describe("modelo de la paginación", () => {
  describe("una sola página", () => {
    it("no hay ventana que dibujar", () => {
      const model = buildPagination({ currentPage: 1, lastPage: 1, total: 3, pageSize: 10 });

      expect(shape(model)).toEqual(["1"]);
      expect(model.hasPrevious).toBe(false);
      expect(model.hasNext).toBe(false);
    });

    it("un catálogo vacío no inventa un rango", () => {
      const model = buildPagination({ currentPage: 1, lastPage: 1, total: 0, pageSize: 10 });

      expect(model.from).toBe(0);
      expect(model.to).toBe(0);
      expect(model.total).toBe(0);
    });
  });

  describe("el rango de ítems de la página", () => {
    it("la primera página muestra los primeros ítems", () => {
      const model = buildPagination({ currentPage: 1, lastPage: 4, total: 34, pageSize: 10 });

      expect(model.from).toBe(1);
      expect(model.to).toBe(10);
      expect(model.total).toBe(34);
    });

    it("una página del medio muestra su tramo", () => {
      const model = buildPagination({ currentPage: 2, lastPage: 4, total: 34, pageSize: 10 });

      expect(model.from).toBe(11);
      expect(model.to).toBe(20);
    });

    it("la última página muestra el resto", () => {
      const model = buildPagination({ currentPage: 4, lastPage: 4, total: 34, pageSize: 10 });

      expect(model.from).toBe(31);
      expect(model.to).toBe(34);
    });
  });

  describe("la ventana de páginas", () => {
    it("muestra dos páginas a cada lado de la actual", () => {
      const model = buildPagination({ currentPage: 5, lastPage: 10, total: 100, pageSize: 10 });

      // La ventana es 3..7, más el link a la primera y a la última.
      expect(pages(model)).toEqual([1, 3, 4, 5, 6, 7, 10]);
    });

    it("al principio muestra la primera, la ventana y la última", () => {
      const model = buildPagination({ currentPage: 1, lastPage: 10, total: 100, pageSize: 10 });

      expect(shape(model)).toEqual(["1", "2", "3", "…", "10"]);
    });

    it("al final muestra la primera, la ventana y la última", () => {
      const model = buildPagination({ currentPage: 10, lastPage: 10, total: 100, pageSize: 10 });

      expect(shape(model)).toEqual(["1", "…", "8", "9", "10"]);
    });

    it("no pone una elipsis entre la primera y la segunda", () => {
      // La ventana arranca en la 2: el 1 ya está pegado, la elipsis no
      // informaría nada.
      const model = buildPagination({ currentPage: 4, lastPage: 10, total: 100, pageSize: 10 });

      expect(shape(model)).toEqual(["1", "2", "3", "4", "5", "6", "…", "10"]);
    });

    it("no pone una elipsis entre la penúltima y la última", () => {
      const model = buildPagination({ currentPage: 8, lastPage: 10, total: 100, pageSize: 10 });

      expect(shape(model)).toEqual(["1", "…", "6", "7", "8", "9", "10"]);
    });

    it("con pocas páginas no hace falta ninguna elipsis", () => {
      // 34 proyectos con page size 10 son 4 páginas: la ventana las cubre
      // enteras y los huecos sobran.
      for (const currentPage of [1, 2, 3, 4]) {
        const model = buildPagination({ currentPage, lastPage: 4, total: 34, pageSize: 10 });

        expect(shape(model)).toEqual(["1", "2", "3", "4"]);
      }
    });
  });

  describe("la navegación anterior y siguiente", () => {
    it("la primera página no tiene anterior", () => {
      const model = buildPagination({ currentPage: 1, lastPage: 4, total: 34, pageSize: 10 });

      expect(model.hasPrevious).toBe(false);
      expect(model.hasNext).toBe(true);
    });

    it("la última página no tiene siguiente", () => {
      const model = buildPagination({ currentPage: 4, lastPage: 4, total: 34, pageSize: 10 });

      expect(model.hasPrevious).toBe(true);
      expect(model.hasNext).toBe(false);
    });
  });

  describe("los valores de entrada", () => {
    it("una página fuera de rango se ajusta al rango válido", () => {
      const model = buildPagination({ currentPage: 99, lastPage: 4, total: 34, pageSize: 10 });

      expect(model.currentPage).toBe(4);
      expect(model.hasNext).toBe(false);
    });

    it("una página cero se ajusta a la primera", () => {
      const model = buildPagination({ currentPage: 0, lastPage: 4, total: 34, pageSize: 10 });

      expect(model.currentPage).toBe(1);
      expect(model.hasPrevious).toBe(false);
    });
  });
});

describe("URLs de la paginación", () => {
  it("la primera página es la base con barra final", () => {
    expect(pageHref("/projects", 1)).toBe("/projects/");
  });

  it("las demás páginas son segmentos de la ruta", () => {
    // El sitio es estático: cada página es una ruta prerenderizada, no un
    // parámetro que el servidor tiene que resolver.
    expect(pageHref("/projects", 2)).toBe("/projects/2/");
    expect(pageHref("/contributions", 34)).toBe("/contributions/34/");
  });
});
