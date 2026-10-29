# May's Wiki

一个仿 [jyywiki](https://jyywiki.cn/) 风格的个人 Wiki：白底、窄栏、手写体正文、紫色链接。Markdown 写作，构建成静态 HTML，部署在 GitHub Pages。

![预览](docs/preview.png)

线上地址：<https://ipoger.github.io/wiki/>

## 特点

- **纯文本**：`content/` 下每个 `.md` 就是一个页面，可 diff、可回滚。
- **零运行时**：构建产物是静态文件，没有数据库和后台。
- **干净 URL**：`notes/foo.md` → `notes/foo/`，且部署在子路径下链接也不会坏。
- **够用的排版**：KaTeX 公式、highlight.js 代码高亮、表格、引用块。
- **站内搜索**：构建时生成 JSON 索引，浏览器里匹配，无需服务端。
- **站内终端**：按 `Ctrl + \`` 弹出浅色终端，用 `ls` / `cd` / `cat` / `find` 浏览全部页面。
- **可勾选清单**：学习路线里的任务可以直接打勾，状态存在浏览器本地。
- **学习路线**：内置 17 周 AI Infra 计划，配套计算脚本可单独下载。
- **写作体验**：`npm run new` 新建、`npm run dev` 保存自动重建、每页底部一键跳 GitHub 编辑。
- **自动索引**：带 `date` 的页面自动进入首页「最近更新」和笔记索引。
- **自动发布**：push 到 `main` 后由 GitHub Actions 部署到 Pages。

## 站内终端

在任意页面按 **`Ctrl + \``**，或点右上角的 `>_` 按钮 / 页脚「终端」，会弹出一个浅色终端。`Esc` 或点击遮罩关闭。

```text
$ help
$ ls
$ cd projects/ai-infra-study
$ cat week-by-week
$ find 上下文
$ open roadmap
```

支持 `Tab` 补全路径、`↑` / `↓` 翻历史、`Ctrl+L` 清屏。文件系统在构建时由 `content/` 生成，新增页面会自动出现在终端里；历史记录保存在浏览器本地。

![终端](docs/terminal.png)

## 本地开发

```bash
npm install
npm run dev       # 本地服务 + 保存自动重建：http://localhost:4173
npm run build     # 只构建到 dist/
```

## 目录结构

```text
.
├── build.mjs              # 构建入口
├── site.json              # 站点名、导航、链接
├── scripts/
│   ├── new.mjs            # 交互式新建页面
│   └── dev.mjs            # 本地预览 + 文件监听
├── content/               # Markdown 源文件
│   ├── index.md           # 首页
│   ├── notes/             # 笔记
│   ├── projects/          # 项目（含 AI Infra 学习路线）
│   ├── reading/           # 阅读清单
│   └── search/            # 搜索页
├── src/
│   ├── layout.mjs         # HTML 模板
│   ├── markdown.mjs       # Markdown → HTML
│   └── url.mjs            # 链接解析
├── public/                # 静态资源、下载包、终端脚本
└── .github/workflows/     # GitHub Pages 部署
```

## 怎么写

**1. 在网页上改。** 每页底部都有「编辑此页」，直接跳到 GitHub 的网页编辑器；改完 commit，一分钟内自动上线。适合改错别字和补链接。

**2. 用脚手架新建。** 在本地运行：

```bash
npm run new
```

依次选择位置（笔记 / 项目 / 阅读）、标题、URL 片段和摘要。它会自动写好 front matter、日期和标题，并提示下一步。新页面会自动出现在首页「最近更新」；放在 `notes/` 下也会自动进笔记索引。

**3. 用你习惯的编辑器。** 把 `content/` 当作普通文件夹或 Obsidian vault 打开，`npm run dev` 保持预览，保存即重建。没有数据库、没有后台，改的就是最终要发布的 Markdown。

### 手动新建也可以

在 `content/` 下新建 Markdown 文件：

```markdown
---
title: 页面标题
description: 一句话摘要，会进 meta 和搜索结果。
date: 2026-10-29
---

# 页面标题

正文……
```

- `content/notes/foo.md` → `notes/foo/`
- `content/notes/index.md` → `notes/`
- `content/index.md` → `/`

`date` 决定「最近更新」和笔记索引里的排序，建议都写。

图片放在 `public/assets/img/`，正文用 `/assets/img/name.png` 引用；构建时会自动补上子路径前缀。

站内链接直接写相对 `.md` 路径，构建时会自动转换：

```markdown
[另一篇](other.md)
```

## 改站点信息

编辑 `site.json`：站名、作者、GitHub 地址、页脚许可、导航。

## 部署

仓库已配置 `.github/workflows/pages.yml`。在 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**，之后每次 push 到 `main` 都会自动发布。

如果 Pages 尚未启用，也可以用 API 开启：

```bash
gh api --method POST repos/ipoger/wiki/pages -f build_type=workflow
```

## 许可

- 文字内容：[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)
- 构建脚本与样式代码：[MIT](LICENSE)
