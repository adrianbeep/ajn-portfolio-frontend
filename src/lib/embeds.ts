/**
 * rehype-video-embeds + rehype-image-embeds — auto-embed YouTube, Vimeo,
 * and image URLs in markdown.
 *
 * Recognised URL forms:
 *   YouTube:
 *     https://www.youtube.com/watch?v=ID
 *     https://youtu.be/ID
 *     https://www.youtube.com/embed/ID
 *     https://www.youtube.com/shorts/ID
 *   Vimeo:
 *     https://vimeo.com/ID
 *     https://player.vimeo.com/video/ID
 *   Image (extension-based):
 *     https://example.com/photo.png  (also .jpg/.jpeg/.gif/.webp/.svg/.avif/.ico)
 *     https://cdn.example.com/x/y.png?w=800  (query/fragment ok)
 *
 * Implementation note: this plugin runs AFTER rehype-sanitize in the
 * pipeline and emits hast `element` nodes (not raw HTML strings).
 * rehype-stringify would escape raw-string children to `&#x3C;` etc., so
 * we build real element nodes that the stringifier renders verbatim.
 * The sanitizer already stripped any user-pasted `<iframe>` upstream,
 * so the only iframes in the output are the ones we generate here.
 */

import type { Plugin } from 'unified';
import type { Root, Element, ElementContent } from 'hast';

// YouTube video IDs are normally 11 chars, but we accept 1-15 to be
// forgiving with shortened test URLs and short codes. Same for Vimeo
// (numeric, typically 6-10 digits but the regex stays loose).
const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{1,15})/;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d{1,15})/;

// Image extensions. Matched at the end of the path, optionally followed
// by a query string or fragment. The character class for the query
// string excludes `#` so the fragment match is unambiguous.
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|avif|ico)(\?[^#]*)?(#.*)?$/i;

function toEmbed(rawUrl: string): { ok: true; src: string; kind: 'youtube' | 'vimeo' } | { ok: false } {
  const yt = rawUrl.match(YOUTUBE_RE);
  if (yt) {
    return { ok: true, kind: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}` };
  }
  const v = rawUrl.match(VIMEO_RE);
  if (v) {
    return { ok: true, kind: 'vimeo', src: `https://player.vimeo.com/video/${v[1]}` };
  }
  return { ok: false };
}

function makeIframe(src: string): Element {
  return {
    type: 'element',
    tagName: 'iframe',
    properties: {
      src,
      loading: 'lazy',
      allow: 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      allowfullscreen: true,
      frameborder: 0,
      title: 'Embedded video',
    },
    children: [],
  };
}

function makeEmbedWrapper(src: string, iframe: Element): Element {
  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['video-embed'],
      'data-embed-src': src,
    },
    children: [iframe],
  };
}

function toImageEmbed(rawUrl: string): { ok: true; src: string; alt: string } | { ok: false } {
  // We test the WHOLE url against the regex (anchored at the end) so we
  // only match URLs that end in an image extension. `try/catch` because
  // the URL constructor throws on invalid strings; if it does, we treat
  // it as not an image.
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false };
  if (!IMAGE_EXT_RE.test(url.pathname)) return { ok: false };
  // Derive a friendly alt from the filename, dropping the extension and
  // dashes/underscores. Falls back to "image" for extensionless edge cases.
  const last = url.pathname.split('/').filter(Boolean).pop() ?? '';
  const alt = last
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim() || 'image';
  return { ok: true, src: url.toString(), alt };
}

function makeImageEmbed(src: string, alt: string): Element {
  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['image-embed'],
      'data-embed-src': src,
    },
    children: [
      {
        type: 'element',
        tagName: 'img',
        properties: {
          src,
          alt,
          loading: 'lazy',
          decoding: 'async',
        },
        children: [],
      },
    ],
  };
}

function isAnchor(node: ElementContent): node is Element {
  return node.type === 'element' && node.tagName === 'a';
}

function isParagraphWithSingleText(node: ElementContent): node is Element & { children: [ElementContent & { type: 'text' }] } {
  if (node.type !== 'element' || node.tagName !== 'p' || !Array.isArray(node.children)) {
    return false;
  }
  return node.children.length === 1 && node.children[0].type === 'text';
}

function getAnchorHref(node: Element): string | null {
  const href = node.properties?.href;
  return typeof href === 'string' ? href : null;
}

function processChildren(list: ElementContent[]): boolean {
  let changed = false;
  for (let i = 0; i < list.length; i++) {
    const child = list[i];

    // 1. `<p>` whose ONLY child is a text node with a YouTube/Vimeo URL.
    if (isParagraphWithSingleText(child)) {
      const text = (child.children[0] as { value?: string }).value ?? '';
      const videoResult = toEmbed(text.trim());
      if (videoResult.ok) {
        const iframe = makeIframe(videoResult.src);
        list[i] = makeEmbedWrapper(videoResult.src, iframe);
        changed = true;
        continue;
      }
      const imageResult = toImageEmbed(text.trim());
      if (imageResult.ok) {
        list[i] = makeImageEmbed(imageResult.src, imageResult.alt);
        changed = true;
        continue;
      }
    }

    // 2. `<p>` whose ONLY child is an `<a>` with a YouTube/Vimeo/image
    //    href. Replaces the WHOLE `<p>` (not just the <a>) so the
    //    resulting HTML doesn't end up with `<p><div>` — invalid
    //    markup that browsers silently rewrite anyway.
    if (
      child.type === 'element' &&
      child.tagName === 'p' &&
      Array.isArray(child.children) &&
      child.children.length === 1 &&
      isAnchor(child.children[0])
    ) {
      const anchor = child.children[0];
      const href = getAnchorHref(anchor);
      if (href) {
        const videoResult = toEmbed(href);
        if (videoResult.ok) {
          const iframe = makeIframe(videoResult.src);
          list[i] = makeEmbedWrapper(videoResult.src, iframe);
          changed = true;
          continue;
        }
        const imageResult = toImageEmbed(href);
        if (imageResult.ok) {
          list[i] = makeImageEmbed(imageResult.src, imageResult.alt);
          changed = true;
          continue;
        }
      }
    }

    // 3. Top-level `<a>` outside any paragraph (rare but possible in
    //    unusual markdown constructs).
    if (isAnchor(child)) {
      const href = getAnchorHref(child);
      if (href) {
        const videoResult = toEmbed(href);
        if (videoResult.ok) {
          const iframe = makeIframe(videoResult.src);
          list[i] = makeEmbedWrapper(videoResult.src, iframe);
          changed = true;
          continue;
        }
        const imageResult = toImageEmbed(href);
        if (imageResult.ok) {
          list[i] = makeImageEmbed(imageResult.src, imageResult.alt);
          changed = true;
          continue;
        }
      }
    }

    // 4. Recurse into containers (lists, blockquotes, etc.).
    if (child.type === 'element' && Array.isArray(child.children) && child.children.length > 0) {
      if (processChildren(child.children as ElementContent[])) {
        changed = true;
      }
    }
  }
  return changed;
}

function processTree(tree: Root): void {
  processChildren(tree.children);
}

export const rehypeVideoEmbeds: Plugin<[], Root> = () => {
  return (tree) => {
    processChildren(tree.children);
  };
};
