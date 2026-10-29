import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.zip': 'application/zip',
  '.py': 'text/plain; charset=utf-8',
};

function build(reason = 'startup') {
  const started = Date.now();
  const result = spawnSync(process.execPath, [path.join(ROOT, 'build.mjs'), '--quiet'], {
    stdio: 'inherit',
  });
  if (result.status === 0) {
    const stamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    console.log(`[${stamp}] build ok (${reason}) ${Date.now() - started}ms`);
  } else {
    console.error(`[build failed] ${reason}`);
  }
}

build();

const server = http.createServer((request, response) => {
  let pathname;
  let search = '';
  try {
    const parsed = new URL(request.url, 'http://localhost');
    pathname = decodeURIComponent(parsed.pathname);
    search = parsed.search;
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  if (pathname.endsWith('/')) pathname += 'index.html';
  let file = path.resolve(DIST, `.${pathname}`);
  const relative = path.relative(DIST, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!pathname.endsWith('/')) {
      response.writeHead(301, { Location: `${pathname}/${search}` });
      response.end();
      return;
    }
    file = path.join(file, 'index.html');
  } else if (!fs.existsSync(file)) {
    const asDirectory = path.join(file, 'index.html');
    const asHtml = `${file}.html`;
    if (fs.existsSync(asDirectory)) file = asDirectory;
    else if (fs.existsSync(asHtml)) file = asHtml;
  }

  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('404 Not Found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  fs.createReadStream(file).pipe(response);
});

server.listen(PORT, () => {
  console.log(`\n  wiki dev server: http://localhost:${PORT}\n  watching content/, src/, public/ — Ctrl+C to stop\n`);
});

let timer = null;
for (const dir of ['content', 'src', 'public']) {
  const target = path.join(ROOT, dir);
  if (!fs.existsSync(target)) continue;
  const onChange = (_event, filename) => {
    if (filename && (String(filename).includes('.DS_Store') || String(filename).endsWith('~'))) {
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => build('change'), 120);
  };
  try {
    fs.watch(target, { recursive: true }, onChange);
  } catch {
    fs.watch(target, onChange);
  }
}

process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});
