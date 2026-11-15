import { expect, test } from "@playwright/test";

/**
 * El listado paginado.
 *
 * El stub tiene 30 proyectos y el page size es 20, así que hay dos páginas.
 * La ruta de la primera es "/projects/" y la de la segunda "/projects/2/".
 */

test.describe("listado paginado", () => {
  test("la primera página muestra 20 de 30 proyectos", async ({ page }) => {
    await page.goto("/projects/");

    await expect(page.locator(".card")).toHaveCount(20);
    await expect(page.locator(".section-count")).toHaveText("20 de 30");
  });

  test("la segunda página muestra los 10 restantes", async ({ page }) => {
    await page.goto("/projects/2/");

    await expect(page.locator(".card")).toHaveCount(10);
    await expect(page.locator(".section-count")).toHaveText("10 de 30");
  });

  test("el marcado marca la página actual", async ({ page }) => {
    await page.goto("/projects/");
    await expect(page.locator(".pagination__link--current")).toHaveText("1");
    await expect(page.locator(".pagination__link--current")).toHaveAttribute("aria-current", "page");

    await page.goto("/projects/2/");
    await expect(page.locator(".pagination__link--current")).toHaveText("2");
    await expect(page.locator(".pagination__link--current")).toHaveAttribute("aria-current", "page");
  });

  test("los enlaces de la paginación son reales, sin JavaScript", async ({ page }) => {
    await page.goto("/projects/");

    const links = page.locator(".pagination__list a");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const href = await links.nth(index).getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).toMatch(/^\/projects/);
    }
  });

  test("rel=prev y rel=next aparecen sólo cuando corresponde", async ({ page }) => {
    await page.goto("/projects/");
    await expect(page.locator('link[rel="prev"]')).toHaveCount(0);
    await expect(page.locator('link[rel="next"]')).toHaveCount(1);

    await page.goto("/projects/2/");
    await expect(page.locator('link[rel="prev"]')).toHaveCount(1);
    await expect(page.locator('link[rel="next"]')).toHaveCount(0);
  });

  test("el canonical de cada página es absoluto", async ({ page }) => {
    await page.goto("/projects/2/");

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /^https?:\/\/.+\/projects\/2\/$/);
  });

  test("la navegación entre páginas funciona", async ({ page }) => {
    await page.goto("/projects/");

    await page.locator('.pagination__link[href="/projects/2/"]').first().click();
    await page.waitForURL("**/projects/2/");

    await expect(page.locator(".section-count")).toHaveText("10 de 30");
  });

  test("no hay rutas de página fantasma más allá del total", async ({ page }) => {
    const response = await page.goto("/projects/3/");
    expect(response?.status()).toBe(404);
  });
});
