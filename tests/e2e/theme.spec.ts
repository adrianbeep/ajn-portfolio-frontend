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

  test("el cambio de tema interpola en lugar de cortar", async ({ page }) => {
    await page.goto("/projects/");

    const html = page.locator("html");

    /**
     * El valor computado del token de fondo.
     *
     * Con el token registrado con `@property`, el navegador devuelve el
     * color RESUELTO (`rgb(...)`) y, mientras la transición corre, el
     * color intermedio del frame.
     */
    const readBg = () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim(),
      );

    const before = await readBg();
    expect(before, "el token --color-bg tiene que estar definido").not.toBe("");

    // El muestreo vive en la página: un rAF por frame. Si se muestreara
    // desde Playwright, una ida y vuelta lenta podría saltear los
    // valores intermedios y el test sería intermitente.
    await page.evaluate(() => {
      const root = document.documentElement;
      const samples: string[] = [];
      (window as unknown as { __bgSamples: string[] }).__bgSamples = samples;

      const tick = () => {
        samples.push(getComputedStyle(root).getPropertyValue("--color-bg").trim());
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    await page.locator("[data-theme-toggle]").click();

    // Se espera a que el token interpole: aparecen valores que no son ni
    // el color de partida ni el de llegada.
    await expect
      .poll(
        async () => {
          const samples = await page.evaluate(
            () => (window as unknown as { __bgSamples: string[] }).__bgSamples,
          );
          return new Set(samples).size;
        },
        { timeout: 3000, intervals: [20, 20, 40, 60] },
      )
      .toBeGreaterThan(2);

    // El toggle se limpia solo: el atributo marca el switch en curso y
    // lo saca cuando el cambio terminó.
    await expect
      .poll(() => html.getAttribute("data-theme-switch"), { timeout: 3000 })
      .toBeNull();

    const after = await readBg();
    expect(after, "el tema tiene que haber cambiado").not.toBe(before);

    const samples = await page.evaluate(
      () => (window as unknown as { __bgSamples: string[] }).__bgSamples,
    );

    // El punto del test: hubo un color intermedio. Si el cambio fuera un
    // corte, los únicos valores serían los dos extremos.
    const intermediate = samples.find((value) => value !== before && value !== after);
    expect(
      intermediate,
      `el cambio de tema cortó de golpe. Valores vistos: ${JSON.stringify(samples)}`,
    ).toBeDefined();
    expect(intermediate).not.toBe(before);
    expect(intermediate).not.toBe(after);
  });
});
