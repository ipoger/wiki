import { relUrl } from './url.mjs';

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function renderPage({ site, page, html }) {
  const { outDir, title, description, sourceRel } = page;
  const root = relUrl(outDir, '');
  const home = root;
  const search = relUrl(outDir, 'search/');
  const fullTitle =
    title && title !== site.title ? `${title} · ${site.title}` : site.title;
  const desc = description || site.description;
  const editUrl =
    site.github && sourceRel
      ? `${site.github}/edit/main/content/${sourceRel
          .split('/')
          .map(encodeURIComponent)
          .join('/')}`
      : '';

  const nav = site.nav
    .map((item) => {
      const active =
        page.url === item.path || page.url.startsWith(item.path) ? ' active' : '';
      return `<li><a class="nav-link${active}" href="${escapeHtml(
        relUrl(outDir, item.path),
      )}">${escapeHtml(item.label)}</a></li>`;
    })
    .join('');

  const year = new Date().getFullYear();

  return `<!doctype html>
<html lang="zh-CN" data-root="${root}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<meta name="author" content="${escapeHtml(site.author)}">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b0f14" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(fullTitle)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${root}assets/vendor/katex.min.css">
<link rel="stylesheet" href="${root}assets/vendor/github.css" media="(prefers-color-scheme: light)">
<link rel="stylesheet" href="${root}assets/vendor/github-dark.css" media="(prefers-color-scheme: dark)">
<link rel="stylesheet" href="${root}assets/style.css">
</head>
<body>
<a class="skip-link" href="#content">跳到正文</a>
<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="${home}">${escapeHtml(site.brand)}</a>
    <form class="token" action="${search}" method="get" role="search">
      <label for="q">for</label>
      <input id="q" name="q" type="search" placeholder="search" autocomplete="off" spellcheck="false" maxlength="64" aria-label="搜索本站">
    </form>
    <nav class="site-nav" aria-label="主导航">
      <ul>${nav}<li class="nav-search"><a class="nav-link" href="${search}">搜索</a></li></ul>
    </nav>
    <button class="terminal-trigger" type="button" data-terminal-open aria-label="打开 Wiki 终端" title="Wiki 终端（Ctrl + \`）">
      <span class="terminal-trigger-icon" aria-hidden="true">&gt;_</span>
      <span class="terminal-trigger-label">terminal</span>
      <kbd class="terminal-trigger-key">Ctrl \`</kbd>
    </button>
  </div>
</header>
<main class="container" id="content">
  <article class="wiki">
${html}
${editUrl ? `    <p class="page-edit"><a href="${escapeHtml(editUrl)}">编辑此页</a> · GitHub</p>` : ''}
  </article>
</main>
<footer class="site-footer">
  <div class="footer-inner">
    <p>
      © ${year} ${escapeHtml(site.author)}
      · <a href="${escapeHtml(site.license.url)}">${escapeHtml(site.license.name)}</a>
      · <a href="${escapeHtml(site.github)}">GitHub</a>
      · 由 Markdown 生成
      <span class="footer-terminal-wrap"> · <button class="footer-terminal" type="button" data-terminal-open>终端 <kbd>Ctrl \`</kbd></button></span>
    </p>
  </div>
</footer>

<div class="terminal-modal" id="terminal-modal" hidden>
  <div class="terminal-backdrop" data-terminal-close></div>
  <section class="terminal-dialog" role="dialog" aria-modal="true" aria-labelledby="terminal-title">
    <header class="terminal-bar">
      <span class="terminal-mark" aria-hidden="true">&gt;_</span>
      <h2 class="terminal-title" id="terminal-title">Wiki terminal</h2>
      <span class="terminal-hint">Ctrl + \` 切换</span>
      <button class="terminal-close" type="button" data-terminal-close aria-label="关闭终端">Esc</button>
    </header>
    <div class="terminal-body">
      <div class="terminal-output" id="terminal-output" role="log" aria-live="polite"></div>
      <div class="terminal-line">
        <span class="terminal-prompt" id="terminal-prompt">guest@wiki:~$</span>
        <input id="terminal-input" class="terminal-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" aria-label="终端命令" placeholder="help / ls / find …">
      </div>
    </div>
    <footer class="terminal-foot">
      <span><kbd>Tab</kbd> 补全 · <kbd>↑</kbd><kbd>↓</kbd> 历史</span>
      <span><kbd>Esc</kbd> 关闭</span>
    </footer>
  </section>
</div>

<script src="${root}terminal-fs.js" defer></script>
<script src="${root}assets/tasks.js" defer></script>
<script src="${root}assets/app.js" defer></script>
<script src="${root}assets/terminal.js" defer></script>
</body>
</html>
`;
}
