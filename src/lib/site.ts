/**
 * Contenido propio del sitio: identidad, navegación, enlaces, stack y los
 * hechos de "Sobre mí". Es el único lugar donde se editan esos datos.
 */

export interface SiteLink {
  label: string;
  href: string;
}

export const site = {
  /** Monograma: es la marca del header y del footer. */
  name: "AJN",
  /** Nombre completo: es el titular del hero y el copyright del footer. */
  fullName: "Adrián Joaquín Naum",
  /** Rol: la línea de contexto sobre el nombre. */
  role: "Analista de Sistemas",
  tagline:
    "Tercer año de la Tecnicatura en Análisis de Sistemas, orientado al desarrollo de software: backends .NET, APIs REST y frontends estáticos.",
  statement:
    "Analista de Sistemas: contratos claros, contenido que se publica sin ceremonia y un sitio sin framework en el cliente.",
  description:
    "Portfolio de Adrián Joaquín Naum, Analista de Sistemas: proyectos de software con backend .NET y frontends estáticos, y los detalles de cómo se construyen.",
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
    items: ["Astro 7", "TypeScript", "CSS vanilla", "Markdown · unified", "Shiki"],
  },
  {
    label: "Backend",
    items: [".NET 10", "ASP.NET Core", "Minimal APIs", "MediatR", "FluentValidation", "Identity + JWT"],
  },
  { label: "Datos", items: ["EF Core 10", "SQLite"] },
  { label: "Infraestructura", items: ["pnpm", "Vercel", "xUnit v3", "FluentAssertions"] },
];
