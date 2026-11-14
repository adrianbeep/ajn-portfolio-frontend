import type { APIRoute } from "astro";
import { getProjectsWithDetails } from "../lib/api";

/** Sitemap generado en build time a partir de los proyectos reales. */
export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL("https://ajn-portfolio.vercel.app");
  const projects = await getProjectsWithDetails();

  const paths = ["/", "/projects/", ...projects.map((project) => `/projects/${project.slug}/`)];
  const urls = paths
    .map((path) => `  <url><loc>${new URL(path, base).href}</loc></url>`)
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
