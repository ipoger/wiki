---
title: May's Wiki
description: May 的个人 Wiki：系统、工具与 AI 的笔记。
---

# May's Wiki

写系统、工具与 AI。把值得重读的东西，整理成可以 diff 的页面。

<section class="home-featured">
  <p class="home-kicker">2026-10-24 · 笔记</p>
  <h2><a href="notes/context-engineering/">上下文工程：Agent 的隐形架构</a></h2>
  <p class="home-lede">模型能力之外，决定 Agent 表现的是每一步能看到什么。</p>
  <p>同一个模型，套上不同的提示词、工具和上下文管理策略，完成率可以差出好几倍。上下文不是仓库，而是预算：把有限的 token 花在当下最需要的信息上。</p>
  <p class="home-more"><a href="notes/context-engineering/">阅读全文 →</a></p>
</section>

## 关于我

我是 May。写代码，也写字。关心系统、工具和 AI，喜欢把踩过的坑整理成别人能复用的页面。

我相信好的文档应该像代码一样被维护：纯文本、可 diff、可回滚。所以这个 Wiki 没有数据库，也没有后台，只有 Markdown 和一个小构建脚本。

- GitHub：[ipoger](https://github.com/ipoger)
- 更多：[关于我](about.md) · [阅读清单](reading/index.md)

## 关于本站

这是一个个人 Wiki，不是信息流。它记录系统、Agent、建站和 AI Infra 学习路线，也会放一些项目的过程与结论。

- **写作**：Markdown 写在 `content/`，一个文件就是一页，支持公式、代码高亮和表格。
- **构建**：几百行 Node 脚本生成静态 HTML，没有数据库和运行时。
- **查找**：站内搜索，或按 Ctrl + \` 打开终端，用 `ls` / `cd` / `cat` 浏览。
- **发布**：push 到 GitHub，Actions 自动部署到 Pages。
- **源码**：[ipoger/wiki](https://github.com/ipoger/wiki)。文字 CC BY-NC 4.0，代码 MIT。

更多入口：[全部笔记](notes/index.md) · [项目](projects/index.md) · [AI Infra 学习路线](projects/ai-infra-study/index.md)
