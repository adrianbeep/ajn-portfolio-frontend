import { expect, test } from "@playwright/test";

/**
 * El listado de proyectos.
 *
 * El stub sirve los mismos dos proyectos que siembra el backend real
 * (`mi-portfolio` y `api-gestion`) y el page size es 10, así que todo entra
 * en una sola página: la única ruta del listado es "/projects/".
 *
 * El caso "hay más proyectos que una página" no se puede ejercitar acá sin
 * inventar datos que la API real no devuelve: con estos fixtures la
 * paginación no se renderiza, y el test verifica justamente eso.
 */

test.describe("listado de proyectos", () => {
  test("el listado muestra los dos proyectos del seed", async ({ page }) => {
    await page.goto("/projects/");

    await expect(page.locator(".card")).toHaveCount(2);
    await expect(page.locator(".section-count")).toHaveText("2 proyectos");
  });

  test("cada tarjeta enlaza a su detalle", async ({ page }) => {
    await page.goto("/projects/");

    const links = page.locator(".card-list a.card");
    await expect(links).toHaveCount(2);

    const hrefs = await links.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href")),
    );
    expect(hrefs.sort()).toEqual(["/projects/api-gestion/", "/projects/mi-portfolio/"]);
  });

  test("la tarjeta muestra el año y el estado del resumen", async ({ page }) => {
    await page.goto("/projects/");

    // El listado se construye sólo con resúmenes: el año y el estado
    // viajan en el resumen y no hace falta pedir el detalle de cada
    // proyecto para pintar la lista.
    const meta = page.locator(".card").first().locator(".card__meta");
    await expect(meta).toContainText("2026");
    await expect(meta).toContainText("Active");
  });

  test("no hay paginación cuando todo entra en una sola página", async ({ page }) => {
    await page.goto("/projects/");

    // El componente de paginación sólo se renderiza con más de una página:
    // con dos proyectos y page size 10 no hay nada que paginar.
    await expect(page.locator(".pagination")).toHaveCount(0);
    await expect(page.locator(".pagination__link")).toHaveCount(0);
  });

  test("no hay links de página anterior ni siguiente", async ({ page }) => {
    await page.goto("/projects/");

    await expect(page.locator('link[rel="prev"]')).toHaveCount(0);
    await expect(page.locator('link[rel="next"]')).toHaveCount(0);
  });

  test("la segunda página no existe", async ({ page }) => {
    const response = await page.goto("/projects/2/");
    expect(response?.status()).toBe(404);
  });

  test("el canonical del listado es absoluto", async ({ page }) => {
    await page.goto("/projects/");

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /^https?:\/\/.+\/projects\/$/);
  });

  test("no hay rutas de página fantasma más allá del total", async ({ page }) => {
    const response = await page.goto("/projects/3/");
    expect(response?.status()).toBe(404);
  });

  test("el toggle entre catálogos no aparece sin contribuciones", async ({ page }) => {
    await page.goto("/projects/");

    // El catálogo de contribuciones está vacío: un toggle a una lista vacía
    // es ruido, así que no se renderiza en ninguna parte del sitio.
    await expect(page.locator(".list-toggle")).toHaveCount(0);
  });
});

test.describe("listado de contribuciones", () => {
  test("el catálogo vacío muestra el estado vacío", async ({ page }) => {
    await page.goto("/contributions/");

    await expect(page.locator("h1")).toHaveText("Contribuciones");
    await expect(page.locator(".section-count")).toHaveText("0 contribuciones");
    await expect(page.locator(".empty-state")).toContainText(
      "Todavía no hay contribuciones publicadas.",
    );
    await expect(page.locator(".card")).toHaveCount(0);
  });

  test("no hay paginación con un catálogo vacío", async ({ page }) => {
    await page.goto("/contributions/");

    await expect(page.locator(".pagination")).toHaveCount(0);
  });

  test("la segunda página del catálogo no existe", async ({ page }) => {
    const response = await page.goto("/contributions/2/");
    expect(response?.status()).toBe(404);
  });

  test("el canonical del catálogo es absoluto", async ({ page }) => {
    await page.goto("/contributions/");

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /^https?:\/\/.+\/contributions\/$/);
  });
});
