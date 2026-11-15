import { expect, test } from "@playwright/test";

/**
 * La home: hero, "Sobre mí", proyectos y tecnologías.
 *
 * El contenido viene del stub, que tiene 30 proyectos (page size 20), así
 * que la paginación queda ejercitada.
 */

test.describe("home", () => {
  test("el hero ocupa la primera pantalla y el contenido empieza después", async ({ page }) => {
    await page.goto("/");

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    const hero = page.locator(".hero");
    const about = page.locator("#sobre-mi");

    // El hero termina en el borde inferior de la ventana: es el único
    // bloque en el primer pantallazo.
    const heroBox = await hero.boundingBox();
    expect(heroBox).not.toBeNull();
    expect(heroBox!.y + heroBox!.height).toBeCloseTo(viewport!.height, 0);

    // "Sobre mí" queda por debajo del fold.
    const aboutBox = await about.boundingBox();
    expect(aboutBox).not.toBeNull();
    expect(aboutBox!.y).toBeGreaterThanOrEqual(viewport!.height);
  });

  test("muestra las cuatro secciones en orden", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toHaveText("Construyo software que se sostiene en pie.");
    await expect(page.locator("h2#h-sobre-mi")).toHaveText("Sobre mí");
    await expect(page.locator("h2#h-proyectos")).toHaveText("Proyectos");
    await expect(page.locator("h2#h-tecnologias")).toHaveText("Tecnologías");

    const order = await page.evaluate(() => {
      const ids = ["sobre-mi", "proyectos", "tecnologias"];
      return ids.map((id) => {
        const element = document.getElementById(id);
        return element ? element.getBoundingClientRect().top : Number.POSITIVE_INFINITY;
      });
    });

    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  });

  test("la home muestra una porción de los proyectos con enlace al listado", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".section-count").first()).toHaveText("AJN");

    const cards = page.locator(".card");
    await expect(cards).toHaveCount(4);

    await expect(page.locator(".projects__more")).toHaveText(/Ver los 30 proyectos/);
    await expect(page.locator(".projects__more")).toHaveAttribute("href", "/projects/");
  });

  test("el stack muestra los cuatro grupos con sus chips", async ({ page }) => {
    await page.goto("/");

    const rows = page.locator(".stack__row");
    await expect(rows).toHaveCount(4);
    await expect(rows.first().locator(".stack__label")).toHaveText("Frontend");
    await expect(rows.last().locator(".stack__label")).toHaveText("Infraestructura");
    await expect(page.locator(".chip")).not.toHaveCount(0);
  });

  test("el skip link apunta al contenido principal", async ({ page }) => {
    await page.goto("/");

    const skipLink = page.locator(".skip-link");
    await expect(skipLink).toHaveAttribute("href", "#main");
    await expect(page.locator("#main")).toHaveCount(1);
  });
});
