import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONTENT = path.join(ROOT, 'content');

export const SECTIONS = {
  notes: { dir: 'notes', label: '笔记' },
  projects: { dir: 'projects', label: '项目' },
  reading: { dir: 'reading', label: '阅读' },
};

export function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function today() {
  return new Date().toLocaleDateString('en-CA');
}

export function bodyFor(kind, title) {
  if (kind === 'projects') {
    return `# ${title}

## 做了什么

## 进展

## 链接
`;
  }
  return `# ${title}
`;
}

export function createPage(page) {
  const dir = path.join(CONTENT, page.section.dir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${page.slug}.md`);

  if (fs.existsSync(file)) {
    const error = new Error(`已存在：${path.relative(ROOT, file)}`);
    error.code = 'EEXIST';
    throw error;
  }

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(page.title)}`,
    ...(page.description
      ? [`description: ${JSON.stringify(page.description)}`]
      : []),
    `date: ${page.date}`,
    '---',
    '',
  ].join('\n');

  const body = bodyFor(page.section.dir, page.title);
  fs.writeFileSync(file, `${frontmatter}\n${body}`);
  return { file, body };
}
