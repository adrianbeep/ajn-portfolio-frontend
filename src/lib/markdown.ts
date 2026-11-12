/**
 * Shared markdown renderer used by the admin form's content preview.
 *
 * IMPORTANT: This pipeline is intentionally lighter than the one used by
 * `MarkdownContent.astro` on the public site. The public pipeline runs at
 * build time on the server and includes `@shikijs/rehype` for code-block
 * syntax highlighting. The admin preview runs in the BROWSER, so we strip
 * Shiki to keep the client bundle small. The structural rendering
 * (headings, paragraphs, lists, links, blockquotes, tables, GFM extensions,
 * code blocks without highlighting) is identical.
 *
 * Sanitization: rehype-sanitize with the default schema strips unsafe
 * markup. The form preview is for visual confirmation only — anything that
 * survives the sanitizer here is what would survive the sanitizer on the
 * public page (minus Shiki's inline-style attributes, which we never
 * emit). Markdown is the user's responsibility; this matches the
 * contract in `docs/api-contract.md` §4.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { rehypeVideoEmbeds } from './embeds';

type SanitizeSchema = Parameters<typeof rehypeSanitize>[0];

const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ['className', /^language-/],
    ],
  },
};

export async function renderMarkdown(content: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    // Auto-embed YouTube/Vimeo links. Runs AFTER sanitize so it can only
    // emit controlled embed markup — a user pasting
    // `<iframe src="https://evil.com">` is already stripped by sanitize.
    // The plugin emits real `element` hast nodes (not raw HTML strings)
    // so rehype-stringify renders them verbatim instead of escaping
    // them to `&#x3C;` entities.
    .use(rehypeVideoEmbeds)
    .use(rehypeStringify)
    .process(content);
  return String(file);
}