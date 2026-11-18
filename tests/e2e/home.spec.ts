import { expect, test } from "@playwright/test";

/**
 * La home: hero, "Sobre mí", proyectos y tecnologías.
 *
 * El contenido viene del build: el stub sirve los mismos dos proyectos que
 * siembra el backend real, así que la sección de proyectos los muestra a
 * los dos y no necesita un enlace al listado.
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

    await expect(page.locator("h1")).toHaveText("Adrián Joaquín Naum");
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

  test("la home muestra los proyectos y no necesita un enlace al listado", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".section-count").first()).toHaveText("Analista de Sistemas");

    // Los dos proyectos del seed entran en la porción de la home.
    const projects = page.locator("#proyectos");
    await expect(projects.locator(".card")).toHaveCount(2);
    await expect(projects.locator(".section-count")).toHaveText("2 proyectos");

    // El botón "Ver los N proyectos" apunta al listado, pero sólo se
    // renderiza cuando queda contenido afuera: con todo visible no hay nada
    // que llevar al listado, así que el enlace no debe existir.
    await expect(page.locator(".projects__more")).toHaveCount(0);
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
