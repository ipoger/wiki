import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import { stdin, stdout } from 'node:process';
import matter from 'gray-matter';
import { ROOT, CONTENT, SECTIONS, createPage, slugify, today } from './lib.mjs';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`用法：
  npm run write                      新建笔记（只问标题）
  npm run write -- "标题"            直接新建，不问
  npm run write -- --project "标题"  新建项目
  npm run write -- --reading "标题"  新建阅读页
  npm run write -- --slug=my-url "标题"
  npm run write -- notes/foo         编辑已有页面（可省略 .md）
  npm run write -- --dry-run         只构建，不提交
  npm run write -- --no-push         提交，但不 push

默认写进笔记；URL 由标题自动生成；摘要从正文自动提取。
编辑器：$VISUAL / $EDITOR，默认 code --wait、nano 或 vi。`);
  process.exit(0);
}

const dryRun = args.includes('--dry-run');
const noPush = args.includes('--no-push');
const positional = args.filter((arg) => !arg.startsWith('-'));
const rawTarget = positional[0] || '';
const slugOverride = args
  .find((arg) => arg.startsWith('--slug='))
  ?.slice('--slug='.length);

const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const siteUrl = String(site.url || '').replace(/\/$/, '');

const run = (command, commandArgs) =>
  spawnSync(command, commandArgs, { cwd: ROOT, stdio: 'inherit' });

function fail(message) {
  console.error(`\n${message}`);
  process.exitCode = 1;
}

function resolveTarget(input) {
  let value = input;
  if (!value.endsWith('.md')) value += '.md';
  if (!value.startsWith('content/')) value = path.join('content', value);
  return path.resolve(ROOT, value);
}

function pageUrl(file) {
  let rel = path
    .relative(CONTENT, file)
    .split(path.sep)
    .join('/')
    .replace(/\.md$/, '');
  if (rel === 'index') return '';
  if (rel.endsWith('/index')) rel = rel.slice(0, -6);
  return `${rel}/`;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function commandExists(command) {
  return spawnSync('which', [command], { stdio: 'ignore' }).status === 0;
}

function pickEditor() {
  const configured = process.env.VISUAL || process.env.EDITOR;
  if (configured) return configured;
  if (commandExists('code')) return 'code --wait';
  if (commandExists('nano')) return 'nano';
  return 'vi';
}

function edit(file) {
  const editor = pickEditor();
  console.log(`\n打开编辑器：${editor}`);
  console.log('保存并退出后，会自动构建、提交并推送。\n');
  const result = spawnSync(`${editor} ${shellQuote(file)}`, {
    cwd: ROOT,
    shell: true,
    stdio: 'inherit',
  });
  return result.status === 0;
}

function publish(file, title, section) {
  console.log('\n构建…');
  if (run(process.execPath, [path.join(ROOT, 'build.mjs'), '--quiet']).status !== 0) {
    fail('构建失败，文件已保留，未提交。');
    return;
  }

  if (dryRun) {
    console.log('\n--dry-run：构建通过，未提交。');
    console.log(`文件：${path.relative(ROOT, file)}`);
    return;
  }

  if (run('git', ['add', '--', file]).status !== 0) {
    fail('git add 失败，未提交。');
    return;
  }

  const diff = spawnSync('git', ['diff', '--cached', '--quiet', '--', file], {
    cwd: ROOT,
  });
  if (diff.status === 0) {
    console.log('\n没有检测到改动，跳过提交。');
    return;
  }
  if (diff.status !== 1) {
    fail('检查 git 改动失败，未提交。');
    return;
  }

  const message = `${section}: ${title}`;
  if (run('git', ['commit', '-m', message, '--', file]).status !== 0) {
    fail('git commit 失败，改动仍在工作区。');
    return;
  }

  if (noPush) {
    console.log(`\n已提交（--no-push，未推送）：${message}`);
    return;
  }

  console.log('\n推送到 GitHub…');
  if (run('git', ['push']).status !== 0) {
    fail('推送失败，提交仍在本地；网络恢复后运行 git push 即可。');
    return;
  }

  const url = pageUrl(file);
  console.log(`\n完成：${message}`);
  if (siteUrl) console.log(`上线地址：${siteUrl}/${url}`);
  console.log('GitHub Actions 会在一分钟内完成部署。');
}

let rl = null;

try {
  const looksLikePath =
    rawTarget.endsWith('.md') ||
    rawTarget.startsWith('content/') ||
    rawTarget.includes('/');

  let file;
  let title;
  let section;
  let initial = '';
  let created = false;

  if (looksLikePath && rawTarget) {
    file = resolveTarget(rawTarget);
    if (!file.startsWith(`${CONTENT}${path.sep}`) || !fs.existsSync(file)) {
      fail(`找不到页面：${rawTarget}`);
      process.exit(1);
    }
    if (fs.statSync(file).isDirectory()) {
      fail(`不是文件：${rawTarget}`);
      process.exit(1);
    }
    const parsed = matter(fs.readFileSync(file, 'utf8'));
    title = parsed.data.title || path.basename(file, '.md');
    const rel = path.relative(CONTENT, file).split(path.sep).join('/');
    section = rel.includes('/') ? rel.split('/')[0] : 'site';
  } else {
    const incomingSection = args.includes('--project')
      ? SECTIONS.projects
      : args.includes('--reading')
        ? SECTIONS.reading
        : SECTIONS.notes;

    title = rawTarget.trim();
    if (!title) {
      rl = readline.createInterface({ input: stdin, output: stdout });
      console.log(`新建${incomingSection.label}\n`);
      title = (await rl.question('标题: ')).trim();
      if (!title) {
        fail('标题不能为空，已取消。');
        process.exit(1);
      }
      rl.close();
      rl = null;
    }

    const slug =
      slugify(slugOverride || title) || `note-${Date.now().toString(36)}`;
    const page = { section: incomingSection, title, slug, date: today() };

    try {
      const result = createPage(page);
      file = result.file;
      initial = fs.readFileSync(file, 'utf8');
      created = true;
      section = incomingSection.dir;
    } catch (error) {
      fail(error.message);
      if (error.code === 'EEXIST') {
        console.error(
          `想编辑已有页面：npm run write -- ${incomingSection.dir}/${slug}`,
        );
      }
      process.exit(1);
    }

    console.log(`\n已创建 ${path.relative(ROOT, file)}`);
  }

  if (!edit(file)) {
    fail('编辑器异常退出，未发布。');
    process.exit(1);
  }

  if (!fs.existsSync(file)) {
    fail('文件已被删除，未发布。');
    process.exit(1);
  }

  if (created && fs.readFileSync(file, 'utf8').trim() === initial.trim()) {
    fs.unlinkSync(file);
    console.log('\n没有写入内容，已删除草稿，未发布。');
    process.exit(0);
  }

  publish(file, title, section);
} catch (error) {
  if (error?.code === 'ABORT_ERR' || error?.name === 'AbortError') {
    console.log('\n已取消。');
  } else {
    throw error;
  }
} finally {
  rl?.close();
}
