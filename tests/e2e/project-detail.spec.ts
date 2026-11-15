import { expect, test } from "@playwright/test";

/**
 * El detalle de un proyecto.
 *
 * El contenido viene del stub: markdown sanitizado en build time.
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
    await page.goto("/projects/fixture-proyecto-03/");

    const prose = page.locator(".prose");
    await expect(prose).toHaveCount(1);
    await expect(prose.locator("h1")).toHaveText("Proyecto 03");
    await expect(prose.locator("strong")).toHaveText("markdown");
    await expect(prose.locator("li")).toHaveCount(2);
  });

  test("el markdown no puede inyectar HTML peligroso", async ({ page }) => {
    await page.goto("/projects/fixture-proyecto-03/");

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
