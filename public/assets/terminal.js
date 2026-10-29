(() => {
  const modal = document.getElementById("terminal-modal");
  if (!modal) return;

  const out = document.getElementById("terminal-output");
  const input = document.getElementById("terminal-input");
  const promptEl = document.getElementById("terminal-prompt");
  const root = document.documentElement.dataset.root || "./";

  let lastFocus = null;
  let fsLoaded = false;
  let fsLoading = false;
  let started = false;
  let closeTimer = null;

  const COMMANDS = [
    "cat",
    "cd",
    "clear",
    "echo",
    "exit",
    "find",
    "grep",
    "help",
    "history",
    "home",
    "ls",
    "open",
    "pwd",
    "tree",
    "whoami",
  ];

  let fs = null;
  let cwd = "/";
  let history = [];
  let historyIndex = 0;
  let draft = "";

  try {
    history = JSON.parse(localStorage.getItem("wiki-term-history") || "[]");
  } catch {
    history = [];
  }
  if (!Array.isArray(history)) history = [];
  historyIndex = history.length;

  const escapeHtml = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );

  const promptText = () =>
    `guest@wiki:${cwd === "/" ? "~" : `~${cwd}`}$`;

  function updatePrompt() {
    promptEl.textContent = promptText();
  }

  function print(html, className) {
    const row = document.createElement("div");
    row.className = `terminal-row${className ? ` ${className}` : ""}`;
    row.innerHTML = html;
    out.append(row);
    while (out.childElementCount > 300) out.firstElementChild.remove();
    out.scrollTop = out.scrollHeight;
  }

  const error = (message) =>
    print(`<span class="t-error">${escapeHtml(message)}</span>`);

  const blank = () => print("&nbsp;");

  function buildFs(pages) {
    const rootNode = { name: "", path: "/", children: new Map(), page: null };
    for (const page of pages) {
      const parts = page.path.split("/").filter(Boolean);
      let node = rootNode;
      let acc = "";
      for (const name of parts) {
        acc += `/${name}`;
        if (!node.children.has(name)) {
          node.children.set(name, {
            name,
            path: acc,
            children: new Map(),
            page: null,
          });
        }
        node = node.children.get(name);
      }
      node.page = page;
    }
    return rootNode;
  }

  function getNode(path) {
    const parts = path.split("/").filter(Boolean);
    let node = fs;
    for (const name of parts) {
      if (!node || !node.children.has(name)) return null;
      node = node.children.get(name);
    }
    return node || null;
  }

  function normalizePath(value) {
    let raw = String(value || "").trim();
    if (!raw || raw === "~") return "/";

    raw = raw.replace(/\/+$/, "").replace(/\.md$/i, "");
    let parts;
    if (raw === "~" || raw.startsWith("~/")) {
      parts = [];
      raw = raw.slice(1);
    } else if (raw.startsWith("/")) {
      parts = [];
    } else {
      parts = cwd.split("/").filter(Boolean);
    }

    for (const segment of raw.split("/")) {
      if (!segment || segment === ".") continue;
      if (segment === "..") parts.pop();
      else parts.push(segment);
    }
    return `/${parts.join("/")}`;
  }

  const sortedChildren = (node) =>
    [...node.children.values()].sort((a, b) => {
      const aDir = a.children.size > 0 ? 0 : 1;
      const bDir = b.children.size > 0 ? 0 : 1;
      return aDir - bDir || a.name.localeCompare(b.name);
    });

  function flatten(node, acc = []) {
    if (node.page) acc.push(node.page);
    for (const child of node.children.values()) flatten(child, acc);
    return acc;
  }

  function cmdHelp() {
    print('<span class="t-brand">可用命令</span>');
    const rows = [
      ["ls [路径]", "列出目录"],
      ["cd <路径>", "切换目录（.. 返回上级）"],
      ["pwd", "显示当前路径"],
      ["cat <页面>", "查看页面正文"],
      ["open <页面>", "在浏览器打开页面"],
      ["find <关键词>", "搜索标题与正文（别名 grep）"],
      ["tree [路径]", "显示目录树"],
      ["clear", "清屏"],
      ["history", "命令历史"],
      ["home", "回到首页"],
      ["whoami", "当前用户"],
      ["help", "显示这份帮助"],
    ];
    for (const [cmd, desc] of rows) {
      print(
        `<span class="t-help"><span class="t-help-cmd">${escapeHtml(
          cmd,
        )}</span><span class="t-dim">${escapeHtml(desc)}</span></span>`,
      );
    }
    print(
      '<span class="t-dim">提示：Tab 补全路径，↑ / ↓ 翻历史，Ctrl+L 清屏。</span>',
    );
  }

  function cmdLs(args) {
    const target = args[0] ? normalizePath(args[0]) : cwd;
    const node = getNode(target);
    if (!node) return error(`ls: no such file or directory: ${args[0] || target}`);

    if (!node.children.size) {
      if (node.page) {
        print(`<span class="t-page">${escapeHtml(node.name)}</span>`);
      } else {
        error(`ls: empty directory: ${target}`);
      }
      return;
    }

    print(
      sortedChildren(node)
        .map((child) =>
          child.children.size
            ? `<span class="t-dir">${escapeHtml(child.name)}/</span>`
            : `<span class="t-page">${escapeHtml(child.name)}</span>`,
        )
        .join("  "),
    );
  }

  function cmdCd(args) {
    const target = args[0] ? normalizePath(args[0]) : "/";
    const node = getNode(target);
    if (!node) return error(`cd: no such file or directory: ${args[0]}`);
    if (!node.children.size) {
      return error(`cd: not a directory: ${target} (try cat ${target})`);
    }
    cwd = target;
    updatePrompt();
  }

  function cmdPwd() {
    print(escapeHtml(cwd));
  }

  function cmdCat(args) {
    const target = args[0] ? normalizePath(args[0]) : cwd;
    const node = getNode(target);
    if (!node) return error(`cat: no such file or directory: ${args[0] || target}`);
    if (!node.page) {
      if (node.children.size) return error(`cat: ${target} is a directory (try ls)`);
      return error(`cat: ${target}: not a page`);
    }

    const page = node.page;
    print(
      `<span class="t-page-title">${escapeHtml(page.title)}</span> <span class="t-dim">${escapeHtml(
        page.path,
      )}</span>`,
    );

    let body = page.text || "";
    if (body.startsWith(page.title)) {
      body = body.slice(page.title.length).trim();
    }
    const limit = 3500;
    const truncated = body.length > limit;
    if (truncated) body = body.slice(0, limit);
    if (body) {
      print(`<pre class="t-pre">${escapeHtml(body)}${truncated ? "\n\n…" : ""}</pre>`);
    }
    if (truncated) {
      print(
        `<span class="t-dim">已截断。用 open ${
          page.path === "/" ? "/" : page.path
        } 阅读全文。</span>`,
      );
    }
  }

  function cmdOpen(args) {
    const target = args[0] ? normalizePath(args[0]) : cwd;
    const node = getNode(target);
    if (!node || !node.page) return error(`open: no page at ${target}`);
    print(
      `<span class="t-dim">opening ${escapeHtml(
        node.page.url || "/",
      )} …</span>`,
    );
    window.location.href = `${root}${node.page.url}`;
  }

  function cmdFind(args) {
    const query = args.join(" ").trim();
    if (!query) return error("find: 需要一个关键词，例如 find 上下文");
    const needle = query.toLowerCase();
    const results = flatten(fs)
      .map((page) => {
        const title = page.title.toLowerCase();
        const text = (page.text || "").toLowerCase();
        const path = page.path.toLowerCase();
        const score =
          (title.includes(needle) ? 10 : 0) +
          (text.includes(needle) ? 3 : 0) +
          (path.includes(needle) ? 1 : 0);
        return { page, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((item) => item.page);

    if (!results.length) return error(`find: 没有找到 “${query}”`);

    print(`<span class="t-dim">找到 ${results.length} 个页面：</span>`);
    for (const page of results) {
      print(
        `<a class="t-link" href="${root}${page.url}">${escapeHtml(
          page.path === "/" ? "/" : page.path,
        )}</a>  <span class="t-dim">${escapeHtml(page.title)}</span>`,
      );
    }
  }

  function cmdTree(args) {
    const target = args[0] ? normalizePath(args[0]) : cwd;
    const node = getNode(target);
    if (!node) return error(`tree: no such directory: ${args[0] || target}`);

    const rows = [];
    function walk(current, prefix, isLast, isRoot) {
      if (rows.length > 200) return;
      const label = isRoot
        ? target === "/"
          ? "/"
          : target
        : `${current.name}${current.children.size ? "/" : ""}`;
      if (isRoot) {
        rows.push(`<span class="t-dir">${escapeHtml(label)}</span>`);
      } else {
        rows.push(
          `${prefix}${isLast ? "└── " : "├── "}<span class="${
            current.children.size ? "t-dir" : "t-page"
          }">${escapeHtml(label)}</span>`,
        );
      }
      const kids = sortedChildren(current);
      kids.forEach((child, index) => {
        const childPrefix = isRoot
          ? ""
          : prefix + (isLast ? "    " : "│   ");
        walk(child, childPrefix, index === kids.length - 1, false);
      });
    }
    walk(node, "", true, true);
    print(`<pre class="t-pre t-tree">${rows.join("\n")}</pre>`);
  }

  function cmdHistory() {
    if (!history.length) return print('<span class="t-dim">还没有历史。</span>');
    history.forEach((item, index) => {
      print(
        `<span class="t-dim">${String(index + 1).padStart(3, " ")}</span>  ${escapeHtml(
          item,
        )}`,
      );
    });
  }

  function cmdEcho(args) {
    print(escapeHtml(args.join(" ")));
  }

  function cmdWhoami() {
    print("guest");
  }

  function cmdHome() {
    window.location.href = root;
  }

  function cmdExit() {
    print('<span class="t-dim">这里没有 exit。这个终端没有进程，只有页面。</span>');
  }

  function cmdClear() {
    out.textContent = "";
  }

  const commands = {
    cat: cmdCat,
    cd: cmdCd,
    clear: cmdClear,
    echo: cmdEcho,
    exit: cmdExit,
    find: cmdFind,
    grep: cmdFind,
    help: cmdHelp,
    history: cmdHistory,
    home: cmdHome,
    ls: cmdLs,
    open: cmdOpen,
    pwd: cmdPwd,
    tree: cmdTree,
    whoami: cmdWhoami,
  };

  function run(raw) {
    print(
      `<span class="t-prompt-text">${escapeHtml(
        promptText(),
      )}</span> <span class="t-cmd-text">${escapeHtml(raw)}</span>`,
    );

    const text = raw.trim();
    if (!text) return;

    if (history[history.length - 1] !== text) history.push(text);
    if (history.length > 100) history.shift();
    try {
      localStorage.setItem("wiki-term-history", JSON.stringify(history));
    } catch {
      /* ignore */
    }
    historyIndex = history.length;
    draft = "";

    const [name, ...args] = text.split(/\s+/);
    const command = commands[name];
    if (!command) {
      error(`command not found: ${name}`);
      print(
        '<span class="t-dim">输入 help 查看可用命令，或试试 ls。</span>',
      );
      return;
    }
    command(args);
  }

  const commonPrefix = (items) => {
    if (!items.length) return "";
    let prefix = items[0];
    for (const item of items.slice(1)) {
      while (prefix && !item.startsWith(prefix)) prefix = prefix.slice(0, -1);
    }
    return prefix;
  };

  function complete() {
    const value = input.value;
    if (!value.trim()) {
      print(COMMANDS.map((name) => escapeHtml(name)).join("  "));
      return;
    }

    const endsWithSpace = /\s$/.test(value);
    const tokens = value.split(/\s+/);
    const last = endsWithSpace ? "" : tokens[tokens.length - 1];
    const before = value.slice(0, value.length - last.length);

    if (!endsWithSpace && tokens.length === 1) {
      const matches = COMMANDS.filter((name) => name.startsWith(last)).sort();
      if (!matches.length) return;
      if (matches.length === 1) {
        input.value = `${matches[0]} `;
      } else {
        input.value = before + commonPrefix(matches);
        print(matches.map((name) => escapeHtml(name)).join("  "));
      }
      return;
    }

    const slash = last.lastIndexOf("/");
    const base = slash >= 0 ? last.slice(0, slash + 1) : "";
    const prefix = slash >= 0 ? last.slice(slash + 1) : last;
    const dir = getNode(normalizePath(base || "."));
    if (!dir) return;

    let candidates = sortedChildren(dir)
      .filter((child) => child.name.startsWith(prefix))
      .map((child) => `${base}${child.name}${child.children.size ? "/" : ""}`);

    if (!slash) {
      const extras = [];
      if ("..".startsWith(prefix)) extras.push("../");
      if (".".startsWith(prefix)) extras.push("./");
      candidates = [...extras, ...candidates];
    }

    candidates = [...new Set(candidates)];
    if (!candidates.length) return;

    if (candidates.length === 1) {
      const candidate = candidates[0];
      input.value = before + candidate + (candidate.endsWith("/") ? "" : " ");
    } else {
      input.value = before + commonPrefix(candidates);
      print(candidates.map(escapeHtml).join("  "));
    }
  }

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const value = input.value;
      input.value = "";
      run(value);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!history.length) return;
      if (historyIndex === history.length) draft = input.value;
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = history[historyIndex] || "";
      const end = input.value.length;
      requestAnimationFrame(() => input.setSelectionRange(end, end));
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex >= history.length) return;
      historyIndex += 1;
      input.value =
        historyIndex === history.length ? draft : history[historyIndex] || "";
      const end = input.value.length;
      requestAnimationFrame(() => input.setSelectionRange(end, end));
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      complete();
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      cmdClear();
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "c") {
      event.preventDefault();
      print(
        `<span class="t-prompt-text">${escapeHtml(
          promptText(),
        )}</span> <span class="t-dim">^C</span>`,
      );
      input.value = "";
    }
  });

  function loadFs() {
    fsLoading = true;
    fetch(`${root}terminal-fs.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        fs = buildFs(data.pages || []);
        fsLoaded = true;
        fsLoading = false;
        input.disabled = false;
        updatePrompt();
        if (!modal.hidden) input.focus({ preventScroll: true });
      })
      .catch((err) => {
        fsLoading = false;
        error(`终端文件系统加载失败：${err.message}`);
        error("重新打开终端可以重试。");
      });
  }

  function openTerminal() {
    if (!modal.hidden) return;
    clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("terminal-open");

    if (!started) {
      started = true;
      print(
        '<span class="t-brand">May\'s Wiki terminal</span> <span class="t-dim">v0.2</span>',
      );
      print(
        '<span class="t-dim">输入 </span><span class="t-cmd-text">help</span><span class="t-dim"> 查看命令，</span><span class="t-cmd-text">ls</span><span class="t-dim"> 浏览目录。</span>',
      );
      blank();
    }

    updatePrompt();
    requestAnimationFrame(() => {
      modal.classList.add("is-open");
      if (!input.disabled) input.focus({ preventScroll: true });
      out.scrollTop = out.scrollHeight;
    });

    if (!fsLoaded && !fsLoading) loadFs();
  }

  function closeTerminal() {
    if (modal.hidden) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("terminal-open");
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      modal.hidden = true;
    }, 150);
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus({ preventScroll: true });
    }
  }

  document.querySelectorAll("[data-terminal-open]").forEach((button) => {
    button.addEventListener("click", openTerminal);
  });

  modal.querySelectorAll("[data-terminal-close]").forEach((element) => {
    element.addEventListener("click", closeTerminal);
  });

  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-terminal-close]")) return;
    if (event.target.closest("a")) return;
    if (window.getSelection().toString()) return;
    if (!input.disabled) input.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.ctrlKey &&
      !event.repeat &&
      (event.code === "Backquote" || event.key === "`")
    ) {
      event.preventDefault();
      if (modal.hidden) openTerminal();
      else closeTerminal();
      return;
    }

    if (event.key === "Escape" && !modal.hidden) {
      event.preventDefault();
      closeTerminal();
    }
  });

  updatePrompt();
})();
