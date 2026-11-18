import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";

/**
 * El backend guarda `content` como markdown crudo y nunca lo toca: el
 * sanitizado es responsabilidad del frontend (api-contract.md §8.2).
 * El schema de sanitize se extiende sólo para permitir el `style` inline que
 * Shiki usa para los dos temas (--shiki-light / --shiki-dark).
 *
 * EL ORDEN IMPORTA: `rehypeSanitize` va ANTES de `rehypeShiki`.
 *
 * Shiki escribe la clase con la clave `class` (no `className`, que es la
 * propiedad canónica de hast) y `tabindex` en el `<pre>`. `hast-util-sanitize`
 * matchea los nombres de atributo literalmente, así que con Shiki primero el
 * sanitizer le borra `class="shiki ..."`, `class="line"` y `tabindex="0"`.
 * Con la clase ausente, las reglas `.shiki` de components.css nunca matchean:
 * los bloques de código salían monocromos y sin fondo, y el `pre` scrollable
 * no era navegable por teclado.
 *
 * Sanitizar primero y resaltar después arregla las dos cosas: el sanitize
 * limpia el markdown del autor, y el markup que agrega Shiki después es
 * generado por nosotros, no por el autor. Es seguro porque `remark-rehype` corre
 * sin `allowDangerousHtml`: hoy el markdown no puede inyectar HTML crudo ni
 * aunque lo intente.
 */
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "style", "className"],
  },
};

/** Renderiza markdown sanitizado con resaltado dual theme (light/dark). */
export async function renderMarkdown(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, schema)
    .use(rehypeShiki, {
      // `light-plus` / `dark-plus` y no `github-light` / `github-dark`:
      // el tema de GitHub NO cumple WCAG AA. Medido token por token contra
      // el fondo real del bloque, `github-light` da 3.49:1 (el naranja
      // #e36209 sobre blanco) y `github-dark` da 3.05:1 (el gris #6a737d de
      // los comentarios). Los dos fallan el gate de axe. `light-plus` /
      // `dark-plus` dan 4.59:1 y 5.00:1, y además son más contenidos: el
      // naranja de los keywords de `github-high-contrast` compite con el
      // acento vermellón del sitio.
      themes: { light: "light-plus", dark: "dark-plus" },
      defaultColor: false,
    })
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}
