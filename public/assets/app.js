(() => {
  const input = document.querySelector(".token input");
  // Keep the wiki open when a citation or external link leaves the site.
  document.querySelectorAll(".wiki a[href]").forEach((link) => {
    if (!/^https?:/i.test(link.href)) return;
    try {
      if (new URL(link.href).origin !== location.origin) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
    } catch {
      /* ignore malformed links */
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "/" &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !document.body.classList.contains("terminal-open") &&
      !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)
    ) {
      event.preventDefault();
      input?.focus();
      input?.select();
    }
  });

  const box = document.getElementById("search-results");
  if (!box) return;

  const root = document.documentElement.dataset.root || "./";
  const query = (new URLSearchParams(location.search).get("q") || "").trim();
  const heading = document.querySelector(".wiki h1");

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const snippetFor = (text, needle) => {
    if (!text) return "";
    if (!needle) return text.slice(0, 120);
    const index = text.toLowerCase().indexOf(needle.toLowerCase());
    if (index < 0) return text.slice(0, 120);
    const start = Math.max(0, index - 45);
    const end = Math.min(text.length, index + needle.length + 80);
    return `${start > 0 ? "…" : ""}${text.slice(start, end)}${
      end < text.length ? "…" : ""
    }`;
  };

  const show = (entries, total) => {
    box.textContent = "";
    if (!entries.length) {
      box.append(el("p", "muted", `没有找到与 “${query}” 相关的页面。`));
      return;
    }

    const summary = el(
      "p",
      "muted",
      query
        ? `找到 ${entries.length} / ${total} 个页面。`
        : `共 ${total} 个页面。输入关键词开始搜索。`,
    );
    box.append(summary);

    for (const entry of entries) {
      const item = el("div", "result");
      const title = el("p", "result-title");
      const link = el("a", null, entry.title);
      link.href = `${root}${entry.url}`;
      title.append(link);

      const meta = el(
        "p",
        "result-meta",
        [entry.section, entry.url || "/"].filter(Boolean).join(" · "),
      );
      const snippet = el("p", "result-snippet", snippetFor(entry.text, query));

      item.append(title, meta, snippet);
      box.append(item);
    }
  };

  fetch(`${root}search-index.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((index) => {
      const needle = query.toLowerCase();
      if (!needle) {
        show(index, index.length);
        return;
      }
      const matched = index
        .map((entry) => {
          const title = entry.title.toLowerCase();
          const text = entry.text.toLowerCase();
          const score =
            (title.includes(needle) ? 10 : 0) +
            (text.includes(needle) ? 3 : 0) +
            (entry.url.toLowerCase().includes(needle) ? 1 : 0);
          return { entry, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.entry);
      show(matched, index.length);
    })
    .catch((error) => {
      box.textContent = "";
      box.append(
        el(
          "p",
          "muted",
          `搜索索引加载失败（${error.message}）。请刷新页面重试。`,
        ),
      );
    });
})();
