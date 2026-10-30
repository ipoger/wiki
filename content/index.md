---
title: May's Wiki
description: May 的个人 Wiki：系统、工具与 AI 的笔记。
---

# May's Wiki

写系统、工具与 AI。把值得重读的东西，整理成可以 diff 的页面。

<section class="home-featured">
  <p class="home-kicker">一点想法</p>
  <h2>上下文是一种预算</h2>
  <p class="home-lede">决定 Agent 表现的，往往不是模型本身，而是每一步它能看到什么。</p>
  <p>同一个模型，换一套工具和上下文管理方式，完成率可以差出好几倍。上下文不是仓库，而是预算：把有限的 token 花在当下最需要的信息上。</p>
  <p>这也是我写这个 Wiki 的原因。把想清楚的东西写下来，下一次就不必从零开始回忆。</p>
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
