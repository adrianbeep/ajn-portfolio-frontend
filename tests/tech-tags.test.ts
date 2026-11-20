import { describe, expect, it } from "vitest";
import { normalizeTechLabel, techIconPath } from "../src/lib/tech-icons";
import { toTechTags } from "../src/lib/tech-tags";

/**
 * Las etiquetas de tecnología son lógica pura: se testean sin DOM.
 *
 * El markup (el chip, el svg, la lista) se verifica en la suite e2e, que
 * corre contra el sitio construido. Acá se checkea lo que no necesita un
 * navegador: cómo se normaliza una etiqueta, cuándo hay ícono y cuándo no,
 * y qué pasa cuando el proyecto no tiene tecnologías.
 */

describe("normalización de la etiqueta", () => {
  it("recorta los espacios de los bordes", () => {
    expect(normalizeTechLabel("  Astro  ")).toBe("astro");
  });

  it("baja a minúsculas", () => {
    expect(normalizeTechLabel("TypeScript")).toBe("typescript");
  });

  it("colapsa los espacios internos", () => {
    expect(normalizeTechLabel("ASP.NET   Core")).toBe("asp.net core");
  });

  it("deja igual la etiqueta que ya viene normalizada", () => {
    expect(normalizeTechLabel("astro")).toBe("astro");
  });
});

describe("ícono de la tecnología", () => {
  it("encuentra las tecnologías que el catálogo cubre", () => {
    for (const label of ["Astro", "TypeScript", "Vercel", "SQLite", "ASP.NET Core"]) {
      const path = techIconPath(label);
      expect(typeof path, `${label} debería tener ícono`).toBe("string");
      expect(path?.length ?? 0, `${label} debería tener path`).toBeGreaterThan(0);
    }
  });

  it("la búsqueda no depende de la casing ni de los espacios", () => {
    expect(techIconPath("astro")).toBe(techIconPath("Astro"));
    expect(techIconPath("  ASP.NET   Core ")).toBe(techIconPath("ASP.NET Core"));
  });

  it("ASP.NET Core usa el ícono de .NET", () => {
    expect(techIconPath("ASP.NET Core")).toBe(techIconPath("dotnet"));
  });

  it("EF Core no tiene ícono en el catálogo", () => {
    expect(techIconPath("EF Core")).toBeNull();
  });

  it("una tecnología desconocida no tiene ícono", () => {
    expect(techIconPath("Cobol")).toBeNull();
    expect(techIconPath("")).toBeNull();
  });
});

describe("lista de etiquetas", () => {
  it("cero tecnologías es un caso válido: no hay etiquetas", () => {
    expect(toTechTags([])).toEqual([]);
  });

  it("undefined y null tampoco producen etiquetas", () => {
    expect(toTechTags(undefined)).toEqual([]);
    expect(toTechTags(null)).toEqual([]);
  });

  it("respeta el orden y la casing del autor", () => {
    const tags = toTechTags(["Astro", "TypeScript"]);

    expect(tags).toHaveLength(2);
    expect(tags.map((tag) => tag.label)).toEqual(["Astro", "TypeScript"]);
    expect(tags[0].iconPath).toBe(techIconPath("Astro"));
    expect(tags[1].iconPath).toBe(techIconPath("TypeScript"));
  });

  it("la etiqueta sin ícono conserva el texto y deja el ícono en null", () => {
    expect(toTechTags(["EF Core"])).toEqual([{ label: "EF Core", iconPath: null }]);
  });

  it("no muta la lista que recibe", () => {
    const technologies = ["Astro", "EF Core"];
    toTechTags(technologies);

    expect(technologies).toEqual(["Astro", "EF Core"]);
  });
});
