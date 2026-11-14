/**
 * Contenido propio del sitio: identidad, navegación, enlaces, stack y los
 * hechos de "Sobre mí". Es el único lugar donde se editan esos datos.
 */

export interface SiteLink {
  label: string;
  href: string;
}

export const site = {
  name: "AJN",
  tagline: "Backend .NET, APIs REST y frontends estáticos.",
  statement:
    "Construyo software que se sostiene en pie: contratos claros, contenido que se publica sin ceremonia y cero kilobytes de JavaScript por defecto.",
  description:
    "Portfolio de AJN: proyectos de software con backend .NET y frontends estáticos, y los detalles de cómo se construyen.",
} as const;

export const navigation: SiteLink[] = [
  { label: "Sobre mí", href: "/#sobre-mi" },
  { label: "Proyectos", href: "/#proyectos" },
  { label: "Tecnologías", href: "/#tecnologias" },
];

export const socialLinks: SiteLink[] = [
  { label: "GitHub", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "Email", href: "#" },
];

export interface AboutFact {
  key: string;
  value: string;
}

export const aboutFacts: AboutFact[] = [
  {
    key: "Cómo trabajo",
    value: "El contrato de la API se escribe antes que la interfaz.",
  },
  {
    key: "Qué publico",
    value: "Markdown con resaltado y sanitizado en build time.",
  },
  {
    key: "Qué busco",
    value: "Proyectos donde la deuda técnica se paga temprano.",
  },
];

export interface StackGroup {
  label: string;
  items: string[];
}

export const stack: StackGroup[] = [
  {
    label: "Frontend",
    items: ["Astro 7", "React 19", "TypeScript", "CSS vanilla", "Markdown · unified", "Shiki"],
  },
  {
    label: "Backend",
    items: [".NET 10", "ASP.NET Core", "Minimal APIs", "MediatR", "FluentValidation", "Identity + JWT"],
  },
  { label: "Datos", items: ["EF Core 10", "SQLite"] },
  { label: "Infraestructura", items: ["pnpm", "Vercel", "xUnit v3", "FluentAssertions"] },
];
