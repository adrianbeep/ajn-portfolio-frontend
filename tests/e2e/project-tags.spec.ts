import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Las etiquetas de tecnología.
 *
 * El contenido viene del build: las tecnologías viajan en el resumen del
 * proyecto y el HTML horneado las muestra como chips en la tarjeta y en
 * el detalle.
 *
 * El stub sirve los mismos dos proyectos que siembra el backend real, con
 * las tecnologías del seed y en el mismo orden. El listado se ordena por
 * `CreatedAt DESC`, así que el primer proyecto es `api-gestion`.
 */

interface Project {
  slug: string;
  title: string;
  technologies: string[];
}

const PROJECTS: Project[] = [
  {
    slug: "api-gestion",
    title: "API de Gestión",
    technologies: ["ASP.NET Core", "EF Core", "SQLite"],
  },
  {
    slug: "mi-portfolio",
    title: "Mi Portfolio",
    technologies: ["Astro", "TypeScript", "Vercel"],
  },
];

/** La tarjeta de un proyecto en el listado. */
function card(page: Page, slug: string) {
  return page.locator(`.card-list a.card[href="/projects/${slug}/"]`);
}

/** Las etiquetas de una tarjeta. */
function cardTags(page: Page, slug: string) {
  return card(page, slug).locator(".card__tags .chip--tag");
}

test.describe("etiquetas de tecnología en el listado", () => {
  test("cada tarjeta muestra las tecnologías del proyecto, en orden", async ({ page }) => {
    await page.goto("/projects/");

    await expect(page.locator(".card-list a.card")).toHaveCount(PROJECTS.length);

    for (const project of PROJECTS) {
      const tags = cardTags(page, project.slug);
      await expect(tags).toHaveCount(project.technologies.length);
      await expect(tags).toHaveText(project.technologies);
    }
  });

  test("el orden de las tarjetas es el del API y la primera es api-gestion", async ({ page }) => {
    await page.goto("/projects/");

    // El listado viene ordenado por `CreatedAt DESC` y `api-gestion` es el
    // proyecto más reciente del seed.
    const first = page.locator(".card-list a.card").first();
    await expect(first).toHaveAttribute("href", "/projects/api-gestion/");
    await expect(cardTags(page, "api-gestion")).toHaveText([
      "ASP.NET Core",
      "EF Core",
      "SQLite",
    ]);
  });

  test("una tecnología con ícono dibuja el svg dentro del chip", async ({ page }) => {
    await page.goto("/projects/");

    const chip = cardTags(page, "mi-portfolio").filter({ hasText: "Astro" });
    const icon = chip.locator("svg");

    await expect(icon).toHaveCount(1);

    // El ícono es decorativo: el texto es el que lleva el significado.
    await expect(icon).toHaveAttribute("aria-hidden", "true");
    await expect(icon).toHaveAttribute("focusable", "false");
  });

  test("EF Core se muestra sólo con texto, sin ícono", async ({ page }) => {
    await page.goto("/projects/");

    // EF Core no tiene ícono en el catálogo: la etiqueta se dibuja igual,
    // pero sin svg.
    const chip = cardTags(page, "api-gestion").filter({ hasText: "EF Core" });

    await expect(chip).toHaveText("EF Core");
    await expect(chip.locator("svg")).toHaveCount(0);
  });
});

test.describe("etiquetas de tecnología en el detalle", () => {
  for (const project of PROJECTS) {
    test(`el detalle de ${project.slug} muestra las mismas etiquetas`, async ({ page }) => {
      await page.goto(`/projects/${project.slug}/`);

      const tags = page.locator(".detail__tags .chip--tag");
      await expect(tags).toHaveCount(project.technologies.length);
      await expect(tags).toHaveText(project.technologies);
    });
  }

  test("el detalle también dibuja el svg de las tecnologías con ícono", async ({ page }) => {
    await page.goto("/projects/mi-portfolio/");

    const tags = page.locator(".detail__tags .chip--tag");
    await expect(tags.locator("svg")).toHaveCount(3);
  });
});

test.describe("las etiquetas no rompen la navegación", () => {
  test("las etiquetas viven dentro del link de la tarjeta", async ({ page }) => {
    await page.goto("/projects/");

    // Cada chip tiene que seguir siendo parte del link de su tarjeta: si
    // el link se rompiera, la tarjeta dejaría de llevar al detalle.
    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".card__tags .chip--tag")).map(
        (chip) => chip.closest("a")?.getAttribute("href") ?? null,
      ),
    );

    expect(hrefs).toEqual(
      PROJECTS.flatMap((project) =>
        project.technologies.map(() => `/projects/${project.slug}/`),
      ),
    );
  });

  test("clickear una etiqueta lleva al detalle del proyecto", async ({ page }) => {
    await page.goto("/projects/");

    await cardTags(page, "api-gestion").first().click();

    await page.waitForURL("**/projects/api-gestion/");
    await expect(page.locator("h1")).toHaveText("API de Gestión");
  });
});
