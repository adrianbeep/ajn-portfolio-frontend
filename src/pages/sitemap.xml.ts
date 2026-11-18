import type { APIRoute } from "astro";
import { countContributions, getAllProjectSummaries, PROJECTS_PAGE_SIZE } from "../lib/api";

/** Sitemap generado en build time a partir del contenido real. */
export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL("https://ajn-portfolio.vercel.app");
  const summaries = await getAllProjectSummaries();

  // El listado paginado expone una ruta por página: "/projects/", "/projects/2/"…
  // Con page size 10, 34 proyectos son 4 páginas.
  const lastPage = Math.max(1, Math.ceil(summaries.length / PROJECTS_PAGE_SIZE));
  const listingPaths = Array.from({ length: lastPage }, (_, index) =>
    index === 0 ? "/projects/" : `/projects/${index + 1}/`,
  );

  // El catálogo de contribuciones sólo entra al sitemap si hay algo que
  // listar: una URL que lleva a un estado vacío no se indexa.
  const contributions = await countContributions();
  const contributionPaths = contributions > 0 ? ["/contributions/"] : [];

  const paths = [
    "/",
    ...listingPaths,
    ...summaries.map((summary) => `/projects/${summary.slug}/`),
    ...contributionPaths,
  ];
  const urls = paths
    .map((path) => `  <url><loc>${new URL(path, base).href}</loc></url>`)
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
