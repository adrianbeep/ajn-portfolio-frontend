/**
 * Copy centralizado de la landing. Sin lógica — solo strings tipados.
 *
 * Por qué un objeto plano: la landing es SEO/estática. Cualquier cambio de
 * copy se hace acá y se ve reflejado en build, sin tocar componentes.
 */

export const SITE_CONTENT = {
  /**
   * Stack técnico dividido en dos niveles:
   *  - `primary`: lo que uso día a día para construir (chips con fondo lleno).
   *  - `familiar`: lo que toco y manejo, pero no es mi fuerte (chips outline).
   *
   * ".NET" sin versión porque Adrián trabaja en distintas versiones y prefiere
   * generalizar; si un proyecto pide una versión puntual se aprende la diff.
   */
  stack: {
    primary: ['C#', 'EF Core', 'SQL', 'Astro', 'React', 'TypeScript'] as const,
    familiar: ['.NET', 'Git', 'Linux', 'Docker', 'Avalonia UI'] as const,
  },
  availableText: 'Para prácticas y proyectos freelance',
  /** Bullets que cuentan el tipo de trabajo que busca Adrián. Mismo lenguaje
   *  mono que el resto del footer/bento para mantener consistencia. */
  availableItems: [
    'Prácticas / pasantías en backend .NET',
    'Proyectos freelance chicos',
    'Sistemas a medida',
    'Open source',
  ] as const,
  aboutText:
    'Estudiante de 2° año de Análisis de Sistemas. Orientado al backend en .NET, con conocimiento fullstack. Construyo proyectos propios y hago sistemas a medida cuando aparece la oportunidad.',
  githubUrl: 'https://github.com/adrianbeep',
} as const;
