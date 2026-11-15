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
  { label: "GitHub", href: "https://github.com/adrianbeep" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/naumadrian/" },
  { label: "Email", href: "mailto:naumadrianjoaquin@gmail.com" },
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
