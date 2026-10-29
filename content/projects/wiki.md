---
title: wiki
description: 本站：Markdown 进，静态页面出。
---

# wiki

本站的源码。一个仿 [jyywiki](https://jyywiki.cn/) 风格的个人 Wiki：白底、窄栏、手写体正文、紫色链接。

没有数据库，没有后台，没有前端框架。`content/` 里是一个个 Markdown 文件，构建脚本把它们编译成静态 HTML，推到 GitHub 后由 Actions 发布到 Pages。

## 技术栈

| 部分 | 用什么 |
| --- | --- |
| Markdown | [marked](https://marked.js.org/) |
| Front matter | [gray-matter](https://github.com/jonschlinkert/gray-matter) |
| 公式 | [KaTeX](https://katex.org/)（构建时渲染） |
| 代码高亮 | [highlight.js](https://highlightjs.org/) |
| 字体 | Kalam / Merienda One / Fira Mono |
| 部署 | GitHub Actions → GitHub Pages |

## 本地构建

```bash
npm install
npm run build     # 产物在 dist/
npm run dev       # 构建并起一个本地服务器
```

打开 `http://localhost:4173`。

## 加一页

在 `content/` 下新建 `.md`：

```markdown
---
title: 页面标题
description: 一句话摘要，会进 meta 和搜索结果。
---

# 页面标题

正文……
```

`content/notes/foo.md` 会自动发布到 `notes/foo/`，不需要改任何配置。导航在 `site.json` 里。

## 链接怎么写

写相对路径，构建时会自动把 `.md` 转成干净 URL，并计算正确的相对路径：

```markdown
[另一篇笔记](other-note.md)
[站内绝对路径](/notes/other-note.md)
```

这样站点部署在 `ipoger.github.io/wiki/` 这样的子路径下也不会坏。

## 搜索

构建时生成 `search-index.json`，`/search/` 页面在浏览器里做匹配。按 `/` 可以聚焦搜索框。

## 为什么不用框架

需求只有五条：Markdown、公式、代码高亮、干净 URL、静态搜索。一个几百行的脚本足够，而且每一行都能读懂。

源码：[github.com/ipoger/wiki](https://github.com/ipoger/wiki)。
