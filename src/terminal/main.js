import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { marked } from 'marked';
import '@xterm/xterm/css/xterm.css';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const ITALIC = '\x1b[3m';
const UNDERLINE = '\x1b[4m';
const fg = (n) => `\x1b[38;5;${n}m`;

const COLOR = {
  heading: fg(62),
  prompt: fg(62),
  path: fg(33),
  dir: fg(33),
  page: fg(141),
  link: fg(62),
  muted: fg(244),
  error: fg(160),
};

const modal = document.getElementById('terminal-modal');
if (modal) init();

function init() {
  const host = document.getElementById('xterm-host');
  const root = document.documentElement.dataset.root || './';
  const triggers = document.querySelectorAll('[data-terminal-open]');
  const data = window.__WIKI_TERMINAL_FS__;

  let term = null;
  let fitAddon = null;
  let closeTimer = null;
  let lastFocus = null;
  let shell = null;
  let opened = false;

  const pages = (data?.pages || []).map((page) => ({
    ...page,
    markdown: page.markdown || page.text || '',
  }));
  const pageByPath = new Map(pages.map((page) => [page.path, page]));
  const fs = buildFs(pages);

  function buildFs(items) {
    const rootNode = { name: '', path: '/', children: new Map(), page: null };
    for (const page of items) {
      const parts = page.path.split('/').filter(Boolean);
      let node = rootNode;
      let acc = '';
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
    const parts = path.split('/').filter(Boolean);
    let node = fs;
    for (const name of parts) {
      if (!node || !node.children.has(name)) return null;
      node = node.children.get(name);
    }
    return node || null;
  }

  function normalizePath(value) {
    let raw = String(value || '').trim();
    if (!raw || raw === '~') return '/';
    raw = raw.replace(/\/+$/, '').replace(/\.md$/i, '');
    let parts;
    if (raw === '~' || raw.startsWith('~/')) {
      parts = [];
      raw = raw.slice(1);
    } else if (raw.startsWith('/')) {
      parts = [];
    } else {
      parts = cwd.split('/').filter(Boolean);
    }
    for (const segment of raw.split('/')) {
      if (!segment || segment === '.') continue;
      if (segment === '..') parts.pop();
      else parts.push(segment);
    }
    return `/${parts.join('/')}`;
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

  function charWidth(code) {
    if (
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1faff)
    ) {
      return 2;
    }
    return 1;
  }

  function stripAnsi(text) {
    return String(text)
      .replace(/\x1b\][^\x07]*?(?:\x07|\x1b\\)/g, '')
      .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');
  }

  function displayWidth(text) {
    let width = 0;
    for (const char of stripAnsi(text)) width += charWidth(char.codePointAt(0));
    return width;
  }

  // ---- markdown → ANSI -------------------------------------------------

  function resolveHref(href, page) {
    if (!href) return null;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return href;
    if (href.startsWith('#')) return null;
    const clean = href.split('#')[0];
    let target;
    if (clean.startsWith('/')) {
      target = clean;
    } else {
      const base = page.path.includes('/')
        ? page.path.split('/').slice(0, -1).join('/')
        : '';
      target = normalizePath(`${base}/${clean}`);
    }
    if (target.endsWith('.md')) target = target.slice(0, -3);
    if (target.endsWith('/index')) target = target.slice(0, -6);
    const found = pageByPath.get(target) || pageByPath.get(target.replace(/\/$/, ''));
    const url = found ? found.url : target.replace(/^\//, '');
    return new URL(`${root}${url}`, location.href).href;
  }

  function oscLink(href, label) {
    return `\x1b]8;;${href}\x1b\\${UNDERLINE}${label}${RESET}\x1b]8;;\x1b\\`;
  }

  function inline(tokens, page) {
    if (!tokens) return '';
    return tokens
      .map((token) => {
        switch (token.type) {
          case 'strong':
            return BOLD + inline(token.tokens, page) + RESET;
          case 'em':
            return ITALIC + inline(token.tokens, page) + RESET;
          case 'codespan':
            return `${COLOR.muted}${UNDERLINE}${token.text}${RESET}`;
          case 'link': {
            const label = inline(token.tokens, page) || token.text || token.href;
            const href = resolveHref(token.href, page);
            return href ? oscLink(href, label) : label;
          }
          case 'image':
            return `${DIM}[img: ${token.text || token.href}]${RESET}`;
          case 'br':
            return '\n';
          case 'escape':
            return token.text;
          case 'text':
          default:
            return token.tokens ? inline(token.tokens, page) : token.text || '';
        }
      })
      .join('');
  }

  function renderBlock(token, page, width) {
    switch (token.type) {
      case 'heading': {
        const prefix = '#'.repeat(token.depth) + ' ';
        const body = inline(token.tokens, page);
        if (token.depth === 1) {
          const rule = '─'.repeat(Math.min(width || 48, 48));
          return `${BOLD}${COLOR.heading}${prefix}${body}${RESET}\n${COLOR.muted}${rule}${RESET}\n\n`;
        }
        return `\n${BOLD}${COLOR.heading}${prefix}${body}${RESET}\n\n`;
      }
      case 'paragraph':
        return `${inline(token.tokens, page)}\n\n`;
      case 'list': {
        const lines = [];
        token.items.forEach((item, index) => {
          const bullet = token.ordered ? `${index + 1}. ` : '• ';
          const inner = item.tokens
            ? inline(item.tokens, page).trim()
            : '';
          lines.push(`  ${COLOR.muted}${bullet}${RESET}${inner}`);
        });
        return lines.join('\n') + '\n\n';
      }
      case 'code':
        return `${DIM}${token.text.replace(/\n$/, '')}${RESET}\n\n`;
      case 'blockquote': {
        const inner = (token.tokens || [])
          .map((child) => renderBlock(child, page, width))
          .join('')
          .trimEnd();
        return (
          inner
            .split('\n')
            .map((line) => `${COLOR.muted}│${RESET} ${line}`)
            .join('\n') + '\n\n'
        );
      }
      case 'hr':
        return `${COLOR.muted}${'─'.repeat(Math.min(width || 40, 40))}${RESET}\n\n`;
      case 'table': {
        const header = token.header
          .map((cell) => inline(cell.tokens, page))
          .join(' | ');
        const rows = token.rows.map((row) =>
          row.map((cell) => inline(cell.tokens, page)).join(' | '),
        );
        return [header, ...rows].map((row) => `  ${row}`).join('\n') + '\n\n';
      }
      case 'html': {
        const text = token.text
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim();
        return text ? `${text}\n\n` : '';
      }
      case 'space':
        return '';
      default:
        return '';
    }
  }

  function renderMarkdown(markdown, page, width) {
    const tokens = marked.lexer(markdown || '');
    return (
      tokens
        .map((token) => renderBlock(token, page, width))
        .join('')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd() + '\n'
    );
  }

  // ---- shell -----------------------------------------------------------

  let cwd = '/';
  let buffer = '';
  let cursor = 0;
  let history = [];
  let historyIndex = 0;
  let draft = '';
  let promptWidth = 0;
  let pager = null;

  try {
    const stored = JSON.parse(localStorage.getItem('wiki-term-history') || '[]');
    if (Array.isArray(stored)) history = stored;
  } catch {
    history = [];
  }
  historyIndex = history.length;

  function promptText() {
    const shown = cwd === '/' ? '~' : `~${cwd}`;
    return `${COLOR.prompt}guest@wiki${RESET}:${COLOR.path}${shown}${RESET}$ `;
  }

  function write(text) {
    term.write(String(text).replace(/(?<!\r)\n/g, '\r\n'));
  }

  function writeOutput(text) {
    if (!text) return;
    write(text);
    if (!text.endsWith('\n')) write('\r\n');
  }

  function prompt() {
    const text = promptText();
    promptWidth = displayWidth(text);
    write(text);
  }

  function redraw() {
    write(`\r\x1b[2K${promptText()}${buffer}`);
    const back = displayWidth(buffer.slice(cursor));
    if (back > 0) write(`\x1b[${back}D`);
  }

  function setBuffer(value, nextCursor = value.length) {
    buffer = value;
    cursor = nextCursor;
    redraw();
  }

  function resetLine() {
    buffer = '';
    cursor = 0;
    historyIndex = history.length;
    draft = '';
  }

  function finishLine(line) {
    resetLine();
    void execute(line)
      .then((result) => {
        if (result === 'close') {
          closeTerminal();
          return;
        }
        if (result === 'navigate' || result === 'pager') return;
        prompt();
      })
      .catch((error) => {
        write(`${COLOR.error}error: ${String(error)}${RESET}\n`);
        prompt();
      });
  }

  function onData(data) {
    if (pager) {
      pagerKey(data);
      return;
    }
    switch (data) {
      case '\r':
      case '\n': {
        const line = buffer;
        write('\r\n');
        finishLine(line);
        return;
      }
      case '\x7f':
      case '\b': {
        if (cursor > 0) {
          buffer = buffer.slice(0, cursor - 1) + buffer.slice(cursor);
          cursor -= 1;
          redraw();
        }
        return;
      }
      case '\x1b[A':
      case '\x1bOA': {
        if (!history.length) return;
        if (historyIndex === history.length) draft = buffer;
        historyIndex = Math.max(0, historyIndex - 1);
        setBuffer(history[historyIndex] || '');
        return;
      }
      case '\x1b[B':
      case '\x1bOB': {
        if (historyIndex >= history.length) return;
        historyIndex += 1;
        setBuffer(
          historyIndex === history.length ? draft : history[historyIndex] || '',
        );
        return;
      }
      case '\x1b[C':
      case '\x1bOC': {
        if (cursor < buffer.length) {
          const width = charWidth(buffer.codePointAt(cursor));
          cursor += 1;
          write(`\x1b[${width}C`);
        }
        return;
      }
      case '\x1b[D':
      case '\x1bOD': {
        if (cursor > 0) {
          cursor -= 1;
          const width = charWidth(buffer.codePointAt(cursor));
          write(`\x1b[${width}D`);
        }
        return;
      }
      case '\x1b[H':
      case '\x1bOH':
        write(`\x1b[${promptWidth + displayWidth(buffer.slice(0, cursor))}D`);
        cursor = 0;
        return;
      case '\x1b[F':
      case '\x1bOF': {
        const tail = displayWidth(buffer.slice(cursor));
        cursor = buffer.length;
        if (tail > 0) write(`\x1b[${tail}C`);
        return;
      }
      case '\x1b[3~':
        if (cursor < buffer.length) {
          buffer = buffer.slice(0, cursor) + buffer.slice(cursor + 1);
          redraw();
        }
        return;
      case '\t':
        complete();
        return;
      case '\x03':
        write('^C\r\n');
        resetLine();
        prompt();
        return;
      case '\x0c':
        write('\x1b[2J\x1b[3J\x1b[H');
        redraw();
        return;
      case '\x15':
        buffer = buffer.slice(cursor);
        cursor = 0;
        redraw();
        return;
      default:
        if (!data || /[\x00-\x1f\x7f]/.test(data)) return;
        buffer = buffer.slice(0, cursor) + data + buffer.slice(cursor);
        cursor += data.length;
        redraw();
    }
  }

  function complete() {
    const before = buffer.slice(0, cursor);
    const wordStart = before.lastIndexOf(' ') + 1;
    const prefix = before.slice(wordStart);
    const slash = prefix.lastIndexOf('/');
    const base = slash >= 0 ? prefix.slice(0, slash + 1) : '';
    const leaf = slash >= 0 ? prefix.slice(slash + 1) : prefix;
    const dirPath = slash >= 0 ? normalizePath(base || '/') : cwd;
    const node = getNode(dirPath);
    const names = new Map();
    if (node) {
      for (const child of node.children.values()) {
        names.set(child.name, child.children.size > 0);
      }
    }
    if (wordStart === 0 && slash < 0) {
      for (const command of COMMANDS) names.set(command, false);
    }
    const matches = [...names.entries()]
      .filter(([name]) => name.startsWith(leaf))
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (!matches.length) return;
    const candidates = matches.map(
      ([name, isDir]) => `${base}${name}${isDir ? '/' : ' '}`,
    );
    if (candidates.length === 1) {
      replaceWord(wordStart, candidates[0]);
      return;
    }
    let common = candidates[0];
    for (const candidate of candidates.slice(1)) {
      while (common && !candidate.startsWith(common)) common = common.slice(0, -1);
    }
    if (common.length > prefix.length) {
      replaceWord(wordStart, common);
      return;
    }
    write(`\r\n${candidates.map((c) => c.trimEnd()).join('  ')}\r\n`);
    redraw();
  }

  function replaceWord(wordStart, replacement) {
    buffer =
      buffer.slice(0, wordStart) + replacement + buffer.slice(cursor);
    cursor = wordStart + replacement.length;
    redraw();
  }

  // ---- pager -----------------------------------------------------------

  function startPager(text, title) {
    pager = {
      title,
      lines: String(text).replace(/\r\n/g, '\n').split('\n'),
      offset: 0,
    };
    layoutPager();
    write('\x1b[?1049h\x1b[?25l\x1b[2J\x1b[H');
    renderPager();
  }

  function clipPlain(text, maxWidth) {
    let out = '';
    let width = 0;
    for (const char of String(text)) {
      const w = charWidth(char.codePointAt(0));
      if (width + w > maxWidth) break;
      out += char;
      width += w;
    }
    return out + ' '.repeat(Math.max(0, maxWidth - width));
  }

  function wrapAnsi(text, width) {
    const rows = [];
    let current = '';
    let used = 0;
    let active = '';
    let index = 0;
    while (index < text.length) {
      if (text[index] === '\x1b') {
        const rest = text.slice(index);
        const match = rest.match(
          /^\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*?(?:\x07|\x1b\\))/,
        );
        if (match) {
          const sequence = match[0];
          current += sequence;
          if (/^\x1b\[[0-9;]*m$/.test(sequence)) {
            if (sequence === '\x1b[0m' || sequence === '\x1b[m') active = '';
            else active += sequence;
          }
          index += sequence.length;
          continue;
        }
      }
      const code = text.codePointAt(index);
      const char = String.fromCodePoint(code);
      const charWidthValue = charWidth(code);
      if (used + charWidthValue > width) {
        rows.push(`${current}\x1b]8;;\x1b\\\x1b[0m`);
        current = active;
        used = 0;
      }
      current += char;
      used += charWidthValue;
      index += char.length;
    }
    rows.push(`${current}\x1b]8;;\x1b\\\x1b[0m`);
    return rows;
  }

  function layoutPager() {
    if (!pager) return;
    const cols = term.cols || 80;
    pager.display = pager.lines.flatMap((line) => wrapAnsi(line, cols));
  }

  function clipAnsi(text, maxWidth) {
    let out = '';
    let width = 0;
    let index = 0;
    while (index < text.length) {
      if (text[index] === '\x1b') {
        const rest = text.slice(index);
        const match = rest.match(
          /^\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*?(?:\x07|\x1b\\))/,
        );
        if (match) {
          out += match[0];
          index += match[0].length;
          continue;
        }
      }
      const code = text.codePointAt(index);
      const char = String.fromCodePoint(code);
      const w = charWidth(code);
      if (width + w > maxWidth) break;
      out += char;
      width += w;
      index += char.length;
    }
    return out + '\x1b]8;;\x1b\\\x1b[0m';
  }

  function renderPager() {
    if (!pager) return;
    layoutPager();
    const rows = term.rows || 24;
    const cols = term.cols || 80;
    const pageHeight = Math.max(1, rows - 1);
    const maxOffset = Math.max(0, pager.display.length - 1);
    pager.offset = Math.max(0, Math.min(pager.offset, maxOffset));

    let out = '\x1b[2J';
    for (let row = 1; row <= pageHeight; row += 1) {
      const line = pager.display[pager.offset + row - 1] || '';
      out += `\x1b[${row};1H${clipAnsi(line, cols)}`;
    }
    const last = Math.min(pager.display.length, pager.offset + pageHeight);
    const status = ` ${pager.title}  ${pager.offset + 1}-${last}/${pager.display.length}  q 退出 · ↓/Space 下一页 · ↑/b 上一页 · g/G 首尾 `;
    out += `\x1b[${rows};1H\x1b[7m${clipPlain(status, cols)}\x1b[0m`;
    term.write(out);
  }

  function pagerKey(data) {
    if (!pager) return;
    const pageHeight = Math.max(1, (term.rows || 24) - 1);
    switch (data) {
      case 'q':
      case 'Q':
      case '\x1b':
      case '\x03':
        exitPager();
        return;
      case 'j':
      case '\x1b[B':
      case '\x1bOB':
        pager.offset += 1;
        renderPager();
        return;
      case 'k':
      case '\x1b[A':
      case '\x1bOA':
        pager.offset -= 1;
        renderPager();
        return;
      case ' ':
      case '\x1b[6~':
      case '\x04':
        pager.offset += pageHeight;
        renderPager();
        return;
      case 'b':
      case '\x1b[5~':
      case '\x15':
        pager.offset -= pageHeight;
        renderPager();
        return;
      case 'g':
      case '\x1b[H':
      case '\x1bOH':
        pager.offset = 0;
        renderPager();
        return;
      case 'G':
      case '\x1b[F':
      case '\x1bOF':
        pager.offset = Math.max(0, (pager.display?.length || pager.lines.length) - pageHeight);
        renderPager();
        return;
      default:
        return;
    }
  }

  function exitPager() {
    if (!pager) return;
    pager = null;
    write('\x1b[?1049l\x1b[?25h');
    resetLine();
    prompt();
  }

  // ---- commands --------------------------------------------------------

  const COMMANDS = [
    'cat',
    'cd',
    'clear',
    'echo',
    'exit',
    'find',
    'grep',
    'head',
    'help',
    'history',
    'home',
    'ls',
    'open',
    'pwd',
    'tail',
    'tree',
    'wc',
    'whoami',
  ];

  function splitPipe(line) {
    const parts = [];
    let current = '';
    let quoted = false;
    for (const char of line) {
      if (char === '"') {
        quoted = !quoted;
        current += char;
      } else if (char === '|' && !quoted) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);
    return parts.map((part) => part.trim()).filter(Boolean);
  }

  function tokenize(line) {
    const args = [];
    let current = '';
    let quoted = false;
    for (const char of line) {
      if (char === '"') {
        quoted = !quoted;
        continue;
      }
      if (!quoted && /\s/.test(char)) {
        if (current) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current) args.push(current);
    return args;
  }

  function pageFor(name) {
    const path = normalizePath(name);
    const node = getNode(path);
    return node?.page || null;
  }

  function currentDir() {
    const node = getNode(cwd);
    return node && node.children.size ? node : null;
  }

  function cmdLs(args) {
    const node = getNode(normalizePath(args[0] || cwd));
    if (!node) return `${COLOR.error}ls: no such directory${RESET}\n`;
    if (!node.children.size) {
      return node.page ? `${COLOR.page}${node.name}${RESET}\n` : '';
    }
    return (
      sortedChildren(node)
        .map((child) =>
          child.children.size
            ? `${BOLD}${COLOR.dir}${child.name}/${RESET}`
            : `${COLOR.page}${child.name}${RESET}`,
        )
        .join('  ') + '\n'
    );
  }

  function cmdCd(args) {
    const path = normalizePath(args[0] || '/');
    const node = getNode(path);
    if (!node || !node.children.size) {
      return { output: `${COLOR.error}cd: not a directory: ${args[0] || path}${RESET}\n` };
    }
    cwd = path;
    return { output: '' };
  }

  function cmdCat(args) {
    const page = pageFor(args[0] || cwd);
    if (!page) {
      if (getNode(normalizePath(args[0] || cwd))?.children.size) {
        return `${COLOR.error}cat: directory (try ls)${RESET}\n`;
      }
      return `${COLOR.error}cat: no such page: ${args[0] || cwd}${RESET}\n`;
    }
    return renderMarkdown(page.markdown, page, term.cols);
  }

  function cmdTree(args) {
    const target = normalizePath(args[0] || cwd);
    const start = getNode(target);
    if (!start) return `${COLOR.error}tree: no such directory${RESET}\n`;
    const rows = [];
    function walk(node, prefix, last, rootLevel) {
      const label = rootLevel
        ? target === '/'
          ? '/'
          : target
        : `${node.name}${node.children.size ? '/' : ''}`;
      rows.push(
        rootLevel
          ? `${COLOR.dir}${label}${RESET}`
          : `${prefix}${last ? '└── ' : '├── '}${
              node.children.size
                ? `${BOLD}${COLOR.dir}${label}${RESET}`
                : `${COLOR.page}${label}${RESET}`
            }`,
      );
      const children = sortedChildren(node);
      children.forEach((child, index) => {
        walk(
          child,
          rootLevel ? '' : prefix + (last ? '    ' : '│   '),
          index === children.length - 1,
          false,
        );
      });
    }
    walk(start, '', true, true);
    return rows.join('\n') + '\n';
  }

  function cmdFind(args) {
    const query = args.join(' ').trim();
    if (!query) return `${COLOR.error}find: need a keyword${RESET}\n`;
    const needle = query.toLowerCase();
    const found = flatten(fs).filter(
      (page) =>
        page.title.toLowerCase().includes(needle) ||
        (page.text || '').toLowerCase().includes(needle),
    );
    if (!found.length) return `${COLOR.error}no matches${RESET}\n`;
    return found
      .slice(0, 20)
      .map((page) => `${COLOR.page}${page.path}${RESET}  ${page.title}`)
      .join('\n') + '\n';
  }

  function cmdGrep(args, stdin) {
    const pattern = args[0];
    if (!pattern) return `${COLOR.error}grep: need a pattern${RESET}\n`;
    let text = stdin;
    if (!text && args[1]) {
      const page = pageFor(args[1]);
      if (!page) return `${COLOR.error}grep: no such page${RESET}\n`;
      text = page.text || '';
    }
    if (!text) return '';
    const needle = pattern.toLowerCase();
    return (
      text
        .split('\n')
        .filter((line) => stripAnsi(line).toLowerCase().includes(needle))
        .join('\n') + '\n'
    );
  }

  function cmdHead(args, stdin) {
    const count = Number(args[0]) || 10;
    return stdin.split('\n').slice(0, count).join('\n') + '\n';
  }

  function cmdTail(args, stdin) {
    const count = Number(args[0]) || 10;
    return stdin.split('\n').slice(-count).join('\n') + '\n';
  }

  function cmdWc(args, stdin) {
    const text = stripAnsi(stdin);
    const lines = text ? text.split('\n').length : 0;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    if (args.includes('-l')) return `${lines}\n`;
    if (args.includes('-w')) return `${words}\n`;
    if (args.includes('-c')) return `${chars}\n`;
    return `${lines} ${words} ${chars}\n`;
  }

  function cmdHelp() {
    const rows = [
      ['ls [path]', '列出目录'],
      ['cd <path>', '切换目录'],
      ['cat <page>', '查看页面（Markdown 渲染为终端样式）'],
      ['less <page>', '分页查看页面或管道输入'],
      ['tree [path]', '显示目录树'],
      ['find <text>', '搜索标题和正文'],
      ['grep <text>', '过滤管道输入'],
      ['head/tail [n]', '截取管道输入'],
      ['wc [-l]', '统计管道输入'],
      ['open <page>', '在浏览器打开页面'],
      ['clear', '清屏'],
      ['help', '显示帮助'],
    ];
    return (
      `${BOLD}${COLOR.heading}命令${RESET}\n` +
      rows
        .map(
          ([cmd, desc]) =>
            `  ${COLOR.path}${cmd.padEnd(16)}${RESET}${COLOR.muted}${desc}${RESET}`,
        )
        .join('\n') +
      `\n\n${COLOR.muted}支持管道：cat notes/foo | grep 模型 | head 5${RESET}\n`
    );
  }

  function cmdOpen(args) {
    const page = pageFor(args[0] || cwd);
    if (!page) return { output: `${COLOR.error}open: no such page${RESET}\n` };
    const url = new URL(`${root}${page.url}`, location.href).href;
    window.location.href = url;
    return { navigate: true };
  }

  async function run(argv, stdin, last) {
    const [name, ...args] = argv;
    switch (name) {
      case 'less':
      case 'more': {
        let text = stdin;
        let title = 'stdin';
        if (!text && args[0]) {
          const page = pageFor(args[0]);
          if (!page) {
            return { output: `${COLOR.error}less: no such page${RESET}\n` };
          }
          text = renderMarkdown(page.markdown, page, term.cols);
          title = page.title;
        }
        if (!text) {
          return { output: `${COLOR.error}less: empty input${RESET}\n` };
        }
        if (!last) return { output: text };
        startPager(text, title);
        return { pager: true };
      }
      case 'ls':
        return { output: cmdLs(args) };
      case 'cd':
        return cmdCd(args);
      case 'cat':
        return { output: cmdCat(args) };
      case 'tree':
        return { output: cmdTree(args) };
      case 'find':
        return { output: cmdFind(args) };
      case 'grep':
        return { output: cmdGrep(args, stdin) };
      case 'head':
        return { output: cmdHead(args, stdin) };
      case 'tail':
        return { output: cmdTail(args, stdin) };
      case 'wc':
        return { output: cmdWc(args, stdin) };
      case 'pwd':
        return { output: `${cwd}\n` };
      case 'whoami':
        return { output: 'guest\n' };
      case 'echo':
        return { output: `${args.join(' ')}\n` };
      case 'help':
        return { output: cmdHelp() };
      case 'history':
        return {
          output: history.map((item, index) => `${String(index + 1).padStart(3)}  ${item}`).join('\n') + '\n',
        };
      case 'open':
        return cmdOpen(args);
      case 'home':
        window.location.href = root;
        return { navigate: true };
      case 'clear':
        return { clear: true, output: '' };
      case 'exit':
        return { close: true, output: '' };
      default:
        return {
          output: `${COLOR.error}command not found: ${name}${RESET} — try help\n`,
        };
    }
  }

  async function execute(line) {
    const trimmed = line.trim();
    if (!trimmed) return 'ok';

    if (history[history.length - 1] !== trimmed) history.push(trimmed);
    if (history.length > 100) history.shift();
    historyIndex = history.length;
    draft = '';
    try {
      localStorage.setItem('wiki-term-history', JSON.stringify(history));
    } catch {
      /* ignore */
    }

    let stdin = '';
    const segments = splitPipe(trimmed);
    for (let index = 0; index < segments.length; index += 1) {
      const argv = tokenize(segments[index]);
      if (!argv.length) continue;
      const isLast = index === segments.length - 1;
      const result = await run(argv, stdin, isLast);
      if (result.navigate) return 'navigate';
      if (result.close) return 'close';
      if (result.pager) return 'pager';
      if (result.clear) {
        term.write('\x1b[2J\x1b[3J\x1b[H');
        return 'ok';
      }
      stdin = result.output || '';
      if (isLast) writeOutput(stdin);
    }
    return 'ok';
  }

  function banner() {
    write(
      `${BOLD}${COLOR.heading}May's Wiki terminal${RESET} ${COLOR.muted}v0.3${RESET}\n`,
    );
    write(
      `${COLOR.muted}输入 help 查看命令；支持 | 管道。${RESET}\n\n`,
    );
  }

  // ---- xterm + modal ---------------------------------------------------

  function ensureTerm() {
    if (term) return;
    term = new Terminal({
      fontFamily:
        '"Fira Mono", "SFMono-Regular", Menlo, Consolas, "PingFang SC", "Microsoft YaHei", monospace',
      fontSize: 13,
      lineHeight: 1.25,
      cursorBlink: true,
      allowProposedApi: true,
      scrollback: 2000,
      theme: {
        background: '#fffdfa',
        foreground: '#334155',
        cursor: '#4f46e5',
        cursorAccent: '#fffdfa',
        selectionBackground: '#dbe4ff',
        black: '#1e293b',
        red: '#b91c1c',
        green: '#15803d',
        yellow: '#a16207',
        blue: '#1d4ed8',
        magenta: '#7c3aed',
        cyan: '#0e7490',
        white: '#e2e8f0',
        brightBlack: '#64748b',
        brightRed: '#dc2626',
        brightGreen: '#16a34a',
        brightYellow: '#ca8a04',
        brightBlue: '#2563eb',
        brightMagenta: '#8b5cf6',
        brightCyan: '#0891b2',
        brightWhite: '#f8fafc',
      },
      linkHandler: {
        allowNonHttpProtocols: false,
        activate: (_event, target) => {
          window.open(target, '_blank', 'noopener,noreferrer');
        },
      },
    });
    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    try {
      term.loadAddon(new Unicode11Addon());
      term.unicode.activeVersion = '11';
    } catch {
      /* optional */
    }
    term.open(host);
    term.onData(onData);
    term.attachCustomKeyEventHandler((event) => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        if (pager) return true;
        closeTerminal();
        return false;
      }
      return true;
    });

    new ResizeObserver(() => {
      if (!modal.hidden) fit();
    }).observe(host);
  }

  function fit() {
    try {
      fitAddon?.fit();
    } catch {
      /* not visible yet */
    }
    if (pager) renderPager();
  }

  function openTerminal() {
    if (!modal.hidden) return;
    clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('terminal-open');
    ensureTerm();
    if (!opened) {
      opened = true;
      banner();
      if (!data) {
        write(
          `${COLOR.error}终端数据没有加载，刷新页面后重试。${RESET}\n\n`,
        );
      }
      prompt();
    }
    requestAnimationFrame(() => {
      modal.classList.add('is-open');
      fit();
      term.focus();
      term.scrollToBottom();
    });
    setTimeout(() => {
      if (modal.hidden) return;
      fit();
      term?.focus();
    }, 180);
  }

  function closeTerminal() {
    if (modal.hidden) return;
    if (pager) {
      pager = null;
      write('\x1b[?1049l\x1b[?25h');
    }
    modal.classList.remove('is-open');
    document.body.classList.remove('terminal-open');
    term?.blur();
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      modal.hidden = true;
    }, 150);
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus({ preventScroll: true });
    }
  }

  triggers.forEach((button) => button.addEventListener('click', openTerminal));
  modal.querySelectorAll('[data-terminal-close]').forEach((element) => {
    element.addEventListener('click', closeTerminal);
  });
  modal.addEventListener('click', (event) => {
    if (event.target.closest('[data-terminal-close]')) return;
    if (event.target.closest('a')) return;
    term?.focus();
  });

  document.addEventListener(
    'keydown',
    (event) => {
      if (
        event.ctrlKey &&
        !event.repeat &&
        (event.code === 'Backquote' || event.key === '`')
      ) {
        event.preventDefault();
        event.stopPropagation();
        if (modal.hidden) openTerminal();
        else closeTerminal();
        return;
      }
      if (event.key === 'Escape' && !modal.hidden) {
        if (pager) return;
        event.preventDefault();
        event.stopPropagation();
        closeTerminal();
      }
    },
    true,
  );

}
