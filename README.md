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
- **写作体验**：`npm run write` 一条命令写完、退出编辑器即构建并发布；`npm run dev` 保存自动重建；每页底部可跳 GitHub 编辑。
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
│   ├── write.mjs          # 新建 → 编辑 → 构建 → 提交 → 推送
│   ├── lib.mjs            # 共用的提示与模板
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

写作只有三类：**笔记**（默认）、**项目**、**阅读**。首页是固定的个人页，不进入笔记索引。

### 一条命令

```bash
npm run write
```

只问一个标题。编辑器打开后写正文，**保存并退出**，它会自动：

1. 构建站点，失败就停下，不提交；
2. 只提交这一篇 Markdown；
3. 提交为 `notes: 标题`；
4. push 到 GitHub，由 Actions 部署。

URL 从标题自动生成，日期自动写入，摘要由正文第一段自动提取，不需要提前填任何 front matter。

常用变体：

```bash
npm run write -- "标题"                  # 连标题也不问
npm run write -- --project "标题"        # 放到 projects/
npm run write -- --reading "标题"        # 放到 reading/
npm run write -- --slug=my-url "标题"    # 指定 URL
npm run write -- notes/why-static-wiki   # 改已有页面
npm run write -- --dry-run               # 只构建，不提交
npm run write -- --no-push               # 提交，但不 push
```

编辑器取 `$VISUAL` / `$EDITOR`；没设置时优先 `code --wait`，其次 `nano`，最后 `vi`。什么都没写就退出，草稿会自动删除。`npm run w` 是 `npm run write` 的别名。

### 其他方式

**1. 在网页上改。** 每页底部都有「编辑此页」，直接跳到 GitHub 的网页编辑器；改完 commit，一分钟内自动上线。

**2. 用你习惯的编辑器。** 把 `content/` 当作普通文件夹或 Obsidian vault 打开，`npm run dev` 保持预览，保存即重建。

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
