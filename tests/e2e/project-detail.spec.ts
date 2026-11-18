import { expect, test } from "@playwright/test";

/**
 * El detalle de un proyecto.
 *
 * El contenido viene del build: markdown sanitizado en build time.
 */

test.describe("detalle de proyecto", () => {
  test("renderiza título, descripción, año y estado", async ({ page }) => {
    await page.goto("/projects/mi-portfolio/");

    await expect(page.locator("h1")).toHaveText("Mi Portfolio");
    await expect(page.locator(".hero__lede")).toContainText("Sitio web de portfolio personal");
    await expect(page.locator(".detail__meta .meta").first()).toContainText("2026");
    await expect(page.locator(".eyebrow")).toHaveText("Active");
  });

  test("el markdown del proyecto se renderiza sanitizado", async ({ page }) => {
    await page.goto("/projects/mi-portfolio/");

    const prose = page.locator(".prose");
    await expect(prose).toHaveCount(1);

    // El cuerpo del proyecto arranca en h2: el único h1 de la página es el
    // título del proyecto, que vive fuera del markdown.
    await expect(prose.locator("h1")).toHaveCount(0);
    await expect(prose.locator("h2")).toHaveCount(4);
    await expect(prose.locator("h2").first()).toHaveText("El problema");
    await expect(prose.locator("h3")).toHaveCount(7);

    // Los bloques de código salen resaltados por Shiki.
    await expect(prose.locator("pre.shiki")).toHaveCount(3);

    // Y el markdown soporta tablas y citas.
    await expect(prose.locator("table")).toHaveCount(3);
    await expect(prose.locator("blockquote")).toHaveCount(1);
  });

  test("el markdown no inyecta HTML crudo en el cuerpo", async ({ page }) => {
    await page.goto("/projects/mi-portfolio/");

    // `remark-rehype` corre sin `allowDangerousHtml`: el markdown del
    // autor no puede meter elementos que el markdown no produce. La lista
    // blanca son los elementos que el pipeline genera (más los `span` que
    // Shiki agrega al resaltar).
    const injected = await page.evaluate(() => {
      const allowed = new Set([
        "a", "blockquote", "br", "code", "del", "em", "h2", "h3", "h4", "hr",
        "li", "ol", "p", "pre", "span", "strong", "table", "tbody", "td",
        "th", "thead", "tr", "ul",
      ]);

      const prose = document.querySelector(".prose");
      if (!prose) return ["(no hay .prose)"];

      return Array.from(prose.querySelectorAll("*"))
        .map((element) => element.tagName.toLowerCase())
        .filter((tag) => !allowed.has(tag));
    });

    expect(injected).toEqual([]);
  });

  test("el markdown no puede inyectar HTML peligroso", async ({ page }) => {
    await page.goto("/projects/mi-portfolio/");

    // El markdown pasa por rehype-sanitize: no debe haber scripts ni
    // atributos de evento.
    const injected = await page.evaluate(() => {
      const prose = document.querySelector(".prose");
      if (!prose) return { scripts: -1, onAttrs: -1 };
      return {
        scripts: prose.querySelectorAll("script").length,
        onAttrs: Array.from(prose.querySelectorAll("*")).filter((el) =>
          Array.from(el.attributes).some((attr) => attr.name.startsWith("on")),
        ).length,
      };
    });

    expect(injected.scripts).toBe(0);
    expect(injected.onAttrs).toBe(0);
  });

  test("el enlace de vuelta apunta al listado", async ({ page }) => {
    await page.goto("/projects/mi-portfolio/");

    const back = page.locator(".detail__back");
    await expect(back).toHaveAttribute("href", "/projects/");

    await back.click();
    await page.waitForURL("**/projects/");
    await expect(page.locator(".card").first()).toBeVisible();
  });

  test("un slug inexistente devuelve 404", async ({ page }) => {
    const response = await page.goto("/projects/no-existe/");
    expect(response?.status()).toBe(404);
  });
});
