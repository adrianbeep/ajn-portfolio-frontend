import { expect, test } from "@playwright/test";

/**
 * SEO: sitemap, robots.txt y los metadatos del head.
 */

test.describe("sitemap y robots", () => {
  test("el sitemap lista la home, el listado y cada proyecto", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);

    const xml = await response.text();

    // La home.
    expect(xml).toContain("<loc>https://ajn-portfolio.vercel.app/</loc>");
    // El listado: con dos proyectos y page size 10 hay una sola página.
    expect(xml).toContain("<loc>https://ajn-portfolio.vercel.app/projects/</loc>");
    // Y el detalle de cada proyecto.
    expect(xml).toContain("<loc>https://ajn-portfolio.vercel.app/projects/mi-portfolio/</loc>");
    expect(xml).toContain("<loc>https://ajn-portfolio.vercel.app/projects/api-gestion/</loc>");
  });

  test("el catálogo de contribuciones no entra al sitemap si está vacío", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    const xml = await response.text();

    // Una URL que lleva a un estado vacío no se indexa: el catálogo de
    // contribuciones sólo entra al sitemap cuando hay algo que listar.
    expect(xml).not.toContain("/contributions/");
  });

  test("el sitemap tiene una URL por proyecto más las del listado y la home", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    const xml = await response.text();

    const locations = xml.match(/<loc>/g) ?? [];
    // 2 proyectos + 1 página de listado + 1 home. El catálogo de
    // contribuciones no cuenta: está vacío y no se indexa.
    expect(locations.length).toBe(4);
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
