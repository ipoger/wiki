---
title: 终端
description: 一个跑在浏览器里的虚拟 shell，用命令浏览本站。
scripts: [terminal.js]
---

# 终端

这是一个跑在浏览器里的虚拟 shell，文件系统就是本站的页面。支持 `ls`、`cd`、`cat`、`open`、`find`，也可以按 `Tab` 补全、用上下方向键翻历史。

<div class="terminal" id="terminal">
  <div class="terminal-bar">
    <span class="terminal-dots"><i></i><i></i><i></i></span>
    <span class="terminal-title">guest@wiki — may-wiki</span>
  </div>
  <div class="terminal-body">
    <div class="terminal-output" id="terminal-output" role="log" aria-live="polite"></div>
    <div class="terminal-line">
      <span class="terminal-prompt" id="terminal-prompt">guest@wiki:~$</span>
      <input id="terminal-input" class="terminal-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" aria-label="终端命令">
    </div>
  </div>
</div>

点击终端区域后直接输入。第一次用可以从 `help` 或 `ls` 开始。
