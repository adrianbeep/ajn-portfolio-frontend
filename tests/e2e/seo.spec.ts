import { expect, test } from "@playwright/test";

/**
 * SEO: sitemap, robots.txt y los metadatos del head.
 */

test.describe("sitemap y robots", () => {
  test("el sitemap lista la home, el listado paginado y cada proyecto", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);

    const xml = await response.text();

    // La home.
    expect(xml).toContain("<loc>https://ajn-portfolio.vercel.app/</loc>");
    // Las dos páginas del listado.
    expect(xml).toContain("<loc>https://ajn-portfolio.vercel.app/projects/</loc>");
    expect(xml).toContain("<loc>https://ajn-portfolio.vercel.app/projects/2/</loc>");
    // El proyecto del seed real.
    expect(xml).toContain("<loc>https://ajn-portfolio.vercel.app/projects/mi-portfolio/</loc>");
    // Y un fixture del stub.
    expect(xml).toContain("<loc>https://ajn-portfolio.vercel.app/projects/fixture-proyecto-30/</loc>");
  });

  test("el sitemap tiene una URL por proyecto más las del listado y la home", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    const xml = await response.text();

    const locations = xml.match(/<loc>/g) ?? [];
    // 30 proyectos + 2 páginas de listado + 1 home.
    expect(locations.length).toBe(33);
  });

  test("robots.txt apunta al sitemap y permite todo", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Allow: /");
    expect(body).toContain("Sitemap: https://ajn-portfolio.vercel.app/sitemap.xml");
  });

  test("la home declara los metadatos del head", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://ajn-portfolio.vercel.app/",
    );

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute("content", /./);

    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
  });

  test("la página 404 responde 404 y offers navegación", async ({ page }) => {
    const response = await page.goto("/ruta-que-no-existe/");
    expect(response?.status()).toBe(404);

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("a[href='/']")).not.toHaveCount(0);
  });
});
