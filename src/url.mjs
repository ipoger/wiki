import path from 'node:path';

/**
 * Return a relative URL from a page's output directory to a site-root-relative
 * target. `outDir` is like "notes/foo" ("" for the root page); `target` is like
 * "notes/bar/" or "assets/style.css".
 */
export function relUrl(outDir, target) {
  const from = outDir || '.';
  const to = target || '.';
  let rel = path.posix.relative(from, to);
  if (!rel) rel = '.';
  if (target === '' || target.endsWith('/')) {
    if (!rel.endsWith('/')) rel += '/';
  }
  return rel;
}

/**
 * Map a Markdown source path to its public output directory.
 *   index.md            -> ""
 *   notes/index.md      -> "notes"
 *   notes/hello.md      -> "notes/hello"
 */
export function outDirForSource(sourceRel) {
  const noExt = sourceRel.replace(/\.md$/i, '');
  if (noExt === 'index') return '';
  if (noExt.endsWith('/index')) return noExt.slice(0, -'/index'.length);
  return noExt;
}

/**
 * Resolve a link found in `sourceRel` to a URL relative to the rendered page.
 * Handles .md -> clean URL conversion, site-absolute paths, and assets.
 */
export function resolveHref(href, sourceRel, outDir) {
  if (!href) return href;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) return href;

  const hashIndex = href.indexOf('#');
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
  let target = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  if (!target) return href;

  const hadSlash = target.endsWith('/');
  let targetRel;
  if (target.startsWith('/')) {
    targetRel = target.slice(1);
  } else {
    targetRel = path.posix.normalize(
      path.posix.join(path.posix.dirname(sourceRel), target),
    );
  }
  if (targetRel.startsWith('..')) return href;

  let outTarget;
  if (/\.md$/i.test(targetRel)) {
    const noExt = targetRel.replace(/\.md$/i, '');
    const parts = noExt.split('/');
    if (parts[parts.length - 1] === 'index') parts.pop();
    outTarget = parts.length ? `${parts.join('/')}/` : '';
  } else if (hadSlash && targetRel) {
    outTarget = `${targetRel.replace(/\/+$/, '')}/`;
  } else {
    outTarget = targetRel;
  }

  return `${relUrl(outDir, outTarget)}${hash}`;
}

/** Turn arbitrary page text into an HTML id. Keeps CJK characters. */
export function slugify(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/gi, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
