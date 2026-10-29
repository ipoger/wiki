---
title: 用几百行搭一个 Wiki
description: 本站的构建脚本、干净 URL、公式与搜索是怎么做的。
---

# 用几百行搭一个 Wiki

这个站点没有用 Next.js、Hugo 或 Astro，只有一个几百行的 Node 脚本。不是因为这些工具不好，而是这个站的需求小到不值得引入一整套框架。

需求只有五条：

1. `content/**/*.md` 编译成静态 HTML。
2. 支持 front matter、代码高亮、KaTeX 公式。
3. URL 干净：`notes/foo.md` → `notes/foo/`。
4. 一个能用的站内搜索。
5. `git push` 后自动部署到 GitHub Pages。

## 目录结构

```text
wiki/
├── build.mjs           # 构建入口
├── site.json           # 站点名、导航、链接
├── content/
│   ├── index.md
│   ├── notes/
│   │   ├── index.md
│   │   └── hello-wiki.md
│   └── ...
├── src/
│   ├── layout.mjs      # HTML 模板
│   ├── markdown.mjs    # Markdown → HTML
│   └── url.mjs         # 链接解析
├── public/             # 原样拷贝的静态资源
└── dist/               # 构建产物（不提交）
```

构建流程很直白：清空 `dist/`，遍历 `content/`，渲染每一页，拷贝 `public/`，生成搜索索引。

## 干净 URL 的麻烦

把 `notes/foo.md` 输出成 `notes/foo/index.html` 很容易，难的是**链接**。

Markdown 里写的是：

```markdown
[另一篇](bar.md)
```

源文件在 `content/notes/foo.md`，相对路径指向 `content/notes/bar.md`。但页面最终的 URL 是 `/notes/foo/`，浏览器会把 `bar/` 解析成 `/notes/foo/bar/`——多了一层目录。

所以不能在构建时做简单的字符串替换。正确做法是：

1. 以**源文件**为基准解析链接，得到站点根目录下的目标路径。
2. 把 `.md` 映射成干净 URL。
3. 计算**当前页面输出目录**到目标的相对路径。

核心函数大概是这样：

```js
function resolveHref(href, sourceRel, outDir) {
  if (/^(https?:|#|\/\/)/.test(href)) return href;

  const targetRel = href.startsWith('/')
    ? href.slice(1)
    : path.posix.normalize(
        path.posix.join(path.posix.dirname(sourceRel), href)
      );

  let outTarget = targetRel.replace(/\.md$/, '');
  if (outTarget.endsWith('/index')) outTarget = outTarget.slice(0, -5);
  if (!outTarget.endsWith('/')) outTarget += '/';

  return path.posix.relative(outDir || '.', outTarget) + '/';
}
```

这样无论站点部署在域名根目录，还是 `username.github.io/wiki/` 这样的子路径，链接都能工作——因为所有链接都是相对路径。

## 公式不能碰代码

KaTeX 需要在 Markdown 解析之前处理 `$...$`，但代码块里的 `$` 不能被当成公式。做法是先把代码块和行内代码切出来，只处理剩下的文本：

```js
// 正则从略：匹配三反引号代码块与单反引号行内代码
const parts = markdown.split(CODE_OR_INLINE_CODE);
const out = parts
  .map((part) => {
    if (isCode(part)) return part;
    return part.replace(/\$(.+?)\$/g, (_, tex) =>
      katex.renderToString(tex),
    );
  })
  .join('');
```

还有一个细节：`$5 和 $10` 不应该被当成公式。正则里要求开头的 `$` 后面不是空白、结尾的 `$` 前面不是空白，能过滤掉大部分误判。

## 搜索：构建时生成索引

不需要 Elasticsearch。构建时把每页的标题、URL、正文纯文本写进一个 JSON：

```json
[
  { "title": "操作系统的三个抽象", "url": "notes/os-three-abstractions/", "text": "..." }
]
```

前端在 `/search/` 页面读取这个文件，按标题命中（权重 10）、正文命中（3）、URL 命中（1）排序。几十页的规模，浏览器里一次 `filter` 就够了。

这也意味着搜索是**完全静态**的：没有服务端，没有额外依赖，部署在 GitHub Pages 上也能用。

## 部署

GitHub Actions 只做三件事：

```yaml
- run: npm ci
- run: npm run build
- uses: actions/upload-pages-artifact@v3
  with:
    path: dist
```

然后由 `actions/deploy-pages` 发布。整个流程不到一分钟，构建失败会直接阻止上线。

## 值得吗？

如果你需要评论、标签系统、RSS、多语言、图片优化，用成熟框架更省事。但如果你只是想要一个**写得快、改得动、十年后还能构建**的个人 Wiki，一个几百行的脚本反而更好维护——因为每一行你都知道它为什么在那里。

这个站点的全部源码在 [ipoger/wiki](https://github.com/ipoger/wiki)，欢迎 fork 成你自己的。
