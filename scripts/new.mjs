import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { stdin, stdout } from 'node:process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');

const SECTIONS = {
  '1': { dir: 'notes', label: '笔记' },
  '2': { dir: 'projects', label: '项目' },
  '3': { dir: 'reading', label: '阅读' },
};

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function bodyFor(kind, title) {
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

const rl = readline.createInterface({ input: stdin, output: stdout });
const ask = async (question, fallback = '') => {
  const suffix = fallback ? ` (${fallback})` : '';
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || fallback;
};

try {
  console.log('新建页面\n');

  let choice = await ask('写在哪里？ 1) 笔记  2) 项目  3) 阅读', '1');
  if (!SECTIONS[choice]) choice = '1';
  const section = SECTIONS[choice];

  let title = '';
  while (!title) title = await ask('标题');

  const suggested = slugify(title) || `note-${Date.now().toString(36)}`;
  const rawSlug = await ask('URL 片段（英文短横线）', suggested);
  const slug = slugify(rawSlug) || suggested;

  const description = await ask('一句话摘要（可留空）');

  const date = new Date().toLocaleDateString('en-CA');
  const dir = path.join(CONTENT, section.dir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slug}.md`);

  if (fs.existsSync(file)) {
    console.error(`\n已存在：${path.relative(ROOT, file)}`);
    process.exitCode = 1;
  } else {
    const frontmatter = [
      '---',
      `title: ${JSON.stringify(title)}`,
      ...(description ? [`description: ${JSON.stringify(description)}`] : []),
      `date: ${date}`,
      '---',
      '',
    ].join('\n');

    fs.writeFileSync(file, `${frontmatter}\n${bodyFor(section.dir, title)}`);
    const relative = path.relative(ROOT, file);

    console.log(`
已创建 ${relative}

它已经带上日期，会自动出现在首页的「最近更新」里。

下一步：
  npm run dev       # 本地预览，保存后自动重建
  写完发布：
  git add -A && git commit -m "${section.dir}: ${title}" && git push
`);
  }
} catch (error) {
  if (error?.code === 'ABORT_ERR' || error?.name === 'AbortError') {
    console.log('\n已取消。');
  } else {
    throw error;
  }
} finally {
  rl.close();
}
