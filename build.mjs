import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { renderMarkdown, htmlToText, htmlToPlain } from './src/markdown.mjs';
import { renderPage } from './src/layout.mjs';
import { outDirForSource } from './src/url.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(ROOT, 'content');
const PUBLIC = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');
const MODULES = path.join(ROOT, 'node_modules');

const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));

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
  const description = data.description || firstParagraph(content) || site.description;
  const url = outDir ? `${outDir}/` : '';
  const scripts = Array.isArray(data.scripts) ? data.scripts.map(String) : [];
  const html = renderMarkdown(content, { sourceRel, outDir });

  const outFile = path.join(DIST, outDir, 'index.html');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(
    outFile,
    renderPage({
      site,
      page: { title, description, url, outDir, scripts },
      html,
    }),
  );

  pages.push({ sourceRel, outDir, url, title });
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

// Virtual filesystem for the in-browser terminal.
fs.writeFileSync(
  path.join(DIST, 'terminal-fs.json'),
  JSON.stringify({ pages: terminalPages }, null, 0),
);

// GitHub Pages: do not run Jekyll.
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

console.log(`Built ${pages.length} pages into dist/`);
for (const page of pages) console.log(`  ${page.url || '/'}  ${page.title}`);
