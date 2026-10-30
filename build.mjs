import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { renderMarkdown, htmlToText, htmlToPlain } from './src/markdown.mjs';
import { renderPage } from './src/layout.mjs';
import { outDirForSource, relUrl } from './src/url.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(ROOT, 'content');
const PUBLIC = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');
const MODULES = path.join(ROOT, 'node_modules');

const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const quiet = process.argv.includes('--quiet');

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.md$/i.test(entry.name)) out.push(full);
  }
  return out.sort();
}

function firstHeading(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].replace(/[*_`]/g, '').trim() : null;
}

function firstParagraph(markdown) {
  const text = markdown
    .replace(/^---[\s\S]*?---/, '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#') && !line.startsWith('>'));
  return text
    ? text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').slice(0, 160)
    : null;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

// Clean output. DIST is always <repo>/dist.
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

if (!fs.existsSync(CONTENT)) throw new Error('content/ not found');
const files = walk(CONTENT);
if (!files.length) throw new Error('no Markdown files in content/');

const pages = [];
const searchEntries = [];
const terminalPages = [];

for (const file of files) {
  const sourceRel = path.relative(CONTENT, file).split(path.sep).join('/');
  const outDir = outDirForSource(sourceRel);
  const raw = fs.readFileSync(file, 'utf8');
  const { data, content } = matter(raw);

  const title = data.title || firstHeading(content) || sourceRel;
  const summary = data.description || firstParagraph(content) || '';
  const description = summary || site.description;
  const url = outDir ? `${outDir}/` : '';
  const date =
    data.date instanceof Date
      ? data.date.toISOString().slice(0, 10)
      : data.date
        ? String(data.date).slice(0, 10)
        : '';
  const html = renderMarkdown(content, { sourceRel, outDir });

  const outFile = path.join(DIST, outDir, 'index.html');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(
    outFile,
    renderPage({
      site,
      page: { title, description, url, outDir, sourceRel },
      html,
    }),
  );

  pages.push({ sourceRel, outDir, url, title, description, summary, date });
  terminalPages.push({
    path: outDir ? `/${outDir}` : '/',
    title,
    url,
    text: htmlToPlain(html).slice(0, 12000),
  });
  if (sourceRel !== 'search/index.md') {
    const section = url.split('/')[0] || '首页';
    searchEntries.push({
      title,
      url,
      section,
      text: htmlToText(html).slice(0, 2400),
    });
  }
}

// Fill <!-- recent --> with the latest dated pages.
const recent = pages
  .filter((page) => page.date && page.sourceRel !== 'index.md')
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 6);

const notes = pages
  .filter(
    (page) =>
      page.sourceRel.startsWith('notes/') &&
      page.sourceRel !== 'notes/index.md' &&
      page.date,
  )
  .sort((a, b) => b.date.localeCompare(a.date));

if (recent.length || notes.length) {
  for (const page of pages) {
    const file = path.join(DIST, page.outDir, 'index.html');
    let html = fs.readFileSync(file, 'utf8');

    if (recent.length && html.includes('<!-- recent -->')) {
      const list = recent
        .map(
          (item) =>
            `<li><time datetime="${item.date}">${item.date}</time> <a href="${relUrl(
              page.outDir,
              item.url,
            )}">${escapeHtml(item.title)}</a></li>`,
        )
        .join('\n');
      html = html.replace(
        '<!-- recent -->',
        `<ul class="recent-list">\n${list}\n</ul>`,
      );
    }

    if (notes.length && html.includes('<!-- notes-list -->')) {
      const list = notes
        .map(
          (item) =>
            `<li><time datetime="${item.date}">${item.date}</time> <a href="${relUrl(
              page.outDir,
              item.url,
            )}">${escapeHtml(item.title)}</a>${
              item.summary
                ? `<span class="note-desc"> — ${escapeHtml(item.summary)}</span>`
                : ''
            }</li>`,
        )
        .join('\n');
      html = html.replace(
        '<!-- notes-list -->',
        `<ul class="note-list">\n${list}\n</ul>`,
      );
    }

    fs.writeFileSync(file, html);
  }
}

// Static assets shipped as-is.
if (fs.existsSync(PUBLIC)) copyDir(PUBLIC, DIST);

// KaTeX and highlight.js styles, served locally so the site works offline.
const vendor = path.join(DIST, 'assets', 'vendor');
fs.mkdirSync(vendor, { recursive: true });
fs.copyFileSync(
  path.join(MODULES, 'katex', 'dist', 'katex.min.css'),
  path.join(vendor, 'katex.min.css'),
);
copyDir(path.join(MODULES, 'katex', 'dist', 'fonts'), path.join(vendor, 'fonts'));
fs.copyFileSync(
  path.join(MODULES, 'highlight.js', 'styles', 'github.css'),
  path.join(vendor, 'github.css'),
);
fs.copyFileSync(
  path.join(MODULES, 'highlight.js', 'styles', 'github-dark.css'),
  path.join(vendor, 'github-dark.css'),
);

// Client-side search index.
fs.writeFileSync(
  path.join(DIST, 'search-index.json'),
  JSON.stringify(searchEntries, null, 0),
);

// Virtual filesystem for the in-browser terminal. Shipping it as a JS file
// means the terminal also works from file:// and never waits on a fetch.
fs.writeFileSync(
  path.join(DIST, 'terminal-fs.js'),
  `window.__WIKI_TERMINAL_FS__ = ${JSON.stringify({ pages: terminalPages })};\n`,
);

// GitHub Pages: do not run Jekyll.
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

if (!quiet) {
  console.log(`Built ${pages.length} pages into dist/`);
  for (const page of pages) console.log(`  ${page.url || '/'}  ${page.title}`);
}
