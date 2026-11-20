import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Audit de accesibilidad con axe-core.
 *
 * Corre sobre el mismo DOM que montan los demás tests e2e, así que no
 * necesita infraestructura propia. El sitio es estático y no usa framework
 * en el cliente: lo que se audita es exactamente lo que recibe el usuario.
 *
 * El estándar es WCAG 2.2 AA.
 */

/** Páginas que se auditan. Todas las rutas del sitio público. */
const PAGES = [
  { path: "/", name: "home" },
  { path: "/projects/", name: "listado de proyectos" },
  { path: "/projects/mi-portfolio/", name: "detalle de proyecto" },
  { path: "/projects/api-gestion/", name: "detalle del segundo proyecto" },
  { path: "/contributions/", name: "listado de contribuciones" },
  { path: "/404.html", name: "404" },
];

/** Impactos que bloquean el merge. */
const BLOCKING = new Set(["serious", "critical"]);

function describeViolations(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  return violations
    .map((violation) => {
      const targets = violation.nodes.map((node) => node.target.join(" ")).join(", ");
      return `[${violation.impact}] ${violation.id}: ${violation.help}\n    ${targets}\n    ${violation.helpUrl}`;
    })
    .join("\n");
}

test.describe("accesibilidad (axe-core, WCAG 2.2 AA)", () => {
  for (const page of PAGES) {
    test(`${page.name} no tiene violaciones serias ni críticas`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);

      const results = await new AxeBuilder({ page: browserPage })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      const blocking = results.violations.filter((violation) =>
        violation.impact && BLOCKING.has(violation.impact),
      );

      expect(
        blocking,
        `Violaciones de accesibilidad en ${page.path}:\n${describeViolations(blocking)}`,
      ).toEqual([]);
    });
  }

  test("el listado paginado tiene exactamente un h1", async ({ page }) => {
    // Una página sin encabezado principal deja al usuario de lector de
    // pantalla sin un punto de referencia sobre dónde está.
    await page.goto("/projects/");

    const headings = await page.locator("h1").count();
    expect(headings).toBe(1);
  });

  test("cada página tiene exactamente un h1", async ({ page }) => {
    for (const target of PAGES) {
      await page.goto(target.path);
      const headings = await page.locator("h1").count();
      expect(headings, `${target.path} debería tener un h1`).toBe(1);
    }
  });

  test("la jerarquía de encabezados no salta niveles", async ({ page }) => {
    for (const target of PAGES) {
      await page.goto(target.path);

      const levels = await page.evaluate(() =>
        Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((heading) =>
          Number(heading.tagName.slice(1)),
        ),
      );

      for (let index = 1; index < levels.length; index += 1) {
        const previous = levels[index - 1];
        const current = levels[index];
        expect(
          current,
          `${target.path}: salta de h${previous} a h${current}`,
        ).toBeLessThanOrEqual(previous + 1);
      }
    }
  });

  test("el toggle de tema anuncia su estado", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator("[data-theme-toggle]");
    await expect(toggle).toHaveAttribute("aria-pressed", /^(true|false)$/);
  });

  test("las imágenes tienen alt", async ({ page }) => {
    for (const target of PAGES) {
      await page.goto(target.path);

      const missing = await page.evaluate(() =>
        Array.from(document.querySelectorAll("img"))
          .filter((img) => !img.hasAttribute("alt"))
          .map((img) => img.getAttribute("src") ?? "(sin src)"),
      );

      expect(missing, `${target.path}: imágenes sin alt`).toEqual([]);
    }
  });

  test("el subrayado es opt-in: sólo lo tienen los links de lectura", async ({ page }) => {
    for (const target of PAGES) {
      await page.goto(target.path);

      // El subrayado por defecto del navegador es una sorpresa: un link
      // que se olvide de declararlo aparece subrayado sin que nadie lo haya
      // pedido. Por defecto no hay subrayado; los links del contenido del
      // proyecto sí lo piden, porque son enlaces de lectura.
      const underlined = await page.evaluate(() =>
        Array.from(document.querySelectorAll("a"))
          .filter((link) => getComputedStyle(link).textDecorationLine.includes("underline"))
          .filter((link) => link.closest(".prose") === null)
          .map(
            (link) =>
              `${link.className || link.tagName}: ${(link.textContent ?? "").trim().slice(0, 40)}`,
          ),
      );

      expect(underlined, `${target.path}: links subrayados sin pedirlo`).toEqual([]);
    }
  });

  test("las referencias ARIA apuntan a elementos que existen", async ({ page }) => {
    for (const target of PAGES) {
      await page.goto(target.path);

      const broken = await page.evaluate(() => {
        const ids = new Set(Array.from(document.querySelectorAll("[id]")).map((el) => el.id));
        const references: string[] = [];

        for (const attribute of ["aria-labelledby", "aria-describedby", "aria-controls"]) {
          for (const element of document.querySelectorAll(`[${attribute}]`)) {
            const value = element.getAttribute(attribute);
            if (!value) continue;
            for (const id of value.split(/\s+/).filter(Boolean)) {
              if (!ids.has(id)) references.push(`${attribute}="${id}"`);
            }
          }
        }

        return references;
      });

      expect(broken, `${target.path}: referencias ARIA rotas`).toEqual([]);
    }
  });

  test("no hay ids duplicados", async ({ page }) => {
    for (const target of PAGES) {
      await page.goto(target.path);

      const duplicates = await page.evaluate(() => {
        const seen = new Set<string>();
        const duplicates = new Set<string>();
        for (const element of document.querySelectorAll("[id]")) {
          if (seen.has(element.id)) duplicates.add(element.id);
          seen.add(element.id);
        }
        return Array.from(duplicates);
      });

      expect(duplicates, `${target.path}: ids duplicados`).toEqual([]);
    }
  });
});
