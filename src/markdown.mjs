import { Marked } from 'marked';
import katex from 'katex';
import hljs from 'highlight.js';
import { resolveHref, slugify } from './url.mjs';

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function mathSegment(text, stash) {
  const store = (tex, displayMode) => {
    stash.push(
      katex.renderToString(tex, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: false,
      }),
    );
    return `MATHPLACEHOLDER${stash.length - 1}`;
  };

  let out = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) =>
    store(tex.trim(), true),
  );
  out = out.replace(
    /(?<!\\)\$(?!\s)([^\n$]+?)(?<!\s)\$/g,
    (_, tex) => store(tex.trim(), false),
  );
  return out;
}

/** Replace $...$ and $$...$$ outside code spans/fences with KaTeX HTML. */
function protectMath(markdown) {
  const stash = [];
  const parts = markdown.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g);
  const out = parts
    .map((part) => {
      if (/^(?:```|~~~|`)/.test(part)) return part;
      return mathSegment(part, stash);
    })
    .join('');
  return { markdown: out, stash };
}

const slugCounts = new Map();

/**
 * Render a Markdown document to HTML with clean-URL rewriting, highlighted
 * code, KaTeX math and heading anchors.
 */
export function renderMarkdown(markdown, { sourceRel, outDir }) {
  const { markdown: withMath, stash } = protectMath(markdown);
  slugCounts.clear();

  const marked = new Marked({ gfm: true, breaks: false });

  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const base = slugify(inner) || `section-${depth}`;
        const seen = (slugCounts.get(base) || 0) + 1;
        slugCounts.set(base, seen);
        const id = seen > 1 ? `${base}-${seen}` : base;
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      code({ text, lang }) {
        let highlighted;
        if (lang && hljs.getLanguage(lang)) {
          highlighted = hljs.highlight(text, { language: lang }).value;
        } else {
          highlighted = hljs.highlightAuto(text).value;
        }
        const cls = `hljs${lang ? ` language-${escapeHtml(lang)}` : ''}`;
        return `<pre><code class="${cls}">${highlighted}</code></pre>\n`;
      },
    },
    walkTokens(token) {
      if (token.type === 'link') {
        token.href = resolveHref(token.href, sourceRel, outDir);
      } else if (token.type === 'image') {
        token.href = resolveHref(token.href, sourceRel, outDir);
      }
    },
  });

  let html = marked.parse(withMath);
  html = html.replace(/MATHPLACEHOLDER(\d+)/g, (_, i) => stash[Number(i)]);
  return html;
}

/** Plain text for the client-side search index. */
export function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
