import { expect, test } from "@playwright/test";

/**
 * El toggle de tema.
 *
 * Es el único JavaScript del sitio público, así que vale la pena verificar
 * que cambia el tema, que la preferencia persiste y que el estado queda
 * expuesto a la tecnología asistiva.
 */

test.describe("toggle de tema", () => {
  test("cambia el tema del documento", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    const initial = await html.getAttribute("data-theme");
    expect(["dark", "light"]).toContain(initial);

    await page.locator("[data-theme-toggle]").click();

    const after = await html.getAttribute("data-theme");
    expect(after).not.toBe(initial);
  });

  test("la etiqueta refleja el tema activo", async ({ page }) => {
    await page.goto("/");

    const label = page.locator("[data-theme-label]");
    const toggle = page.locator("[data-theme-toggle]");

    const initialTheme = await page.locator("html").getAttribute("data-theme");
    const initialLabel = await label.textContent();

    await toggle.click();

    const newTheme = await page.locator("html").getAttribute("data-theme");
    const newLabel = await label.textContent();

    expect(newLabel).not.toBe(initialLabel);

    if (newTheme === "light") {
      expect(newLabel).toContain("Claro");
    } else {
      expect(newLabel).toContain("Oscuro");
    }

    // El label inicial debe describir el tema que estaba activo.
    if (initialTheme === "light") {
      expect(initialLabel).toContain("Claro");
    } else {
      expect(initialLabel).toContain("Oscuro");
    }
  });

  test("la preferencia sobrevive a una recarga", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    const initial = await html.getAttribute("data-theme");

    await page.locator("[data-theme-toggle]").click();
    const chosen = await html.getAttribute("data-theme");
    expect(chosen).not.toBe(initial);

    await page.reload();

    await expect(html).toHaveAttribute("data-theme", chosen!);
  });

  test("el estado del toggle queda expuesto a la tecnología asistiva", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator("[data-theme-toggle]");

    // Un control que enciende y apaga tiene que anunciar su estado: sin
    // aria-pressed, un lector de pantalla dice lo mismo antes y después.
    await expect(toggle).toHaveAttribute("aria-pressed", /^(true|false)$/);

    const before = await toggle.getAttribute("aria-pressed");
    await toggle.click();
    const after = await toggle.getAttribute("aria-pressed");

    expect(after).not.toBe(before);
  });

  test("el toggle es operable con el teclado", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator("[data-theme-toggle]");
    await toggle.focus();

    const focused = await page.evaluate(() => document.activeElement?.getAttribute("data-theme-toggle") !== null);
    expect(focused).toBe(true);

    const initial = await page.locator("html").getAttribute("data-theme");
    await page.keyboard.press("Enter");

    await expect(page.locator("html")).not.toHaveAttribute("data-theme", initial!);
  });
});
