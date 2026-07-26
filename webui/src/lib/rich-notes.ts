/** Lightweight Markdown markers for coach notes. */

export type HighlightColor = "yellow" | "green" | "pink";
export type FontColor = "red" | "blue" | "orange" | "purple" | "teal";

const HIGHLIGHT_RE = /==(yellow|green|pink):([\s\S]*?)==/g;
const LEGACY_HIGHLIGHT_RE = /==([^=]+)==/g;
const FONT_COLOR_RE = /\{\{(red|blue|orange|purple|teal):([\s\S]*?)\}\}/g;

const ALLOWED_TAGS = new Set([
  "P", "BR", "DIV", "SPAN", "STRONG", "B", "EM", "I", "U",
  "H1", "H2", "H3", "UL", "OL", "LI", "BLOCKQUOTE", "MARK",
]);

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Strip pasted HTML down to the coach-notes subset (no scripts/styles/images).
 * Preserves marks with data-color and spans with data-fg when present.
 */
export function sanitizePastedHtml(html: string): string {
  const root = document.createElement("div");
  root.innerHTML = html;

  const walk = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent ?? "");
    }
    if (!(node instanceof HTMLElement)) return null;

    const tag = node.tagName.toUpperCase();
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "IMG" || tag === "SVG" || tag === "IFRAME") {
      return null;
    }

    // Flatten unknown tags but keep their text/children.
    if (!ALLOWED_TAGS.has(tag)) {
      const frag = document.createDocumentFragment();
      for (const child of Array.from(node.childNodes)) {
        const cleaned = walk(child);
        if (cleaned) frag.appendChild(cleaned);
      }
      return frag.childNodes.length ? frag : null;
    }

    const out = document.createElement(tag.toLowerCase());
    if (tag === "MARK") {
      const color = node.getAttribute("data-color") || "yellow";
      out.setAttribute("data-color", color);
      out.className = `nb-mark nb-mark-${color}`;
    } else if (tag === "SPAN" && node.dataset.fg) {
      out.dataset.fg = node.dataset.fg;
      out.className = `nb-fg nb-fg-${node.dataset.fg}`;
    } else if (tag === "P" && node.classList.contains("nb-indent")) {
      out.className = "nb-indent";
    }

    for (const child of Array.from(node.childNodes)) {
      const cleaned = walk(child);
      if (cleaned) out.appendChild(cleaned);
    }
    return out;
  };

  const result = document.createElement("div");
  for (const child of Array.from(root.childNodes)) {
    const cleaned = walk(child);
    if (cleaned) result.appendChild(cleaned);
  }
  // Prefer plain text when paste has no useful structure.
  const text = result.textContent?.trim() ?? "";
  if (!result.querySelector("p,h1,h2,h3,ul,ol,li,mark,strong,b,blockquote") && text) {
    return escapeHtml(text).split(/\n+/).map((ln) => `<p>${ln || "<br>"}</p>`).join("");
  }
  return result.innerHTML || `<p>${escapeHtml(text) || "<br>"}</p>`;
}

/** Insert sanitized HTML at the current selection inside a contenteditable. */
export function insertSanitizedPaste(htmlOrText: string, isHtml: boolean): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const sanitized = isHtml
    ? sanitizePastedHtml(htmlOrText)
    : escapeHtml(htmlOrText).split(/\n/).map((ln) => `<p>${ln || "<br>"}</p>`).join("");
  const temp = document.createElement("div");
  temp.innerHTML = sanitized;
  const frag = document.createDocumentFragment();
  let last: Node | null = null;
  while (temp.firstChild) {
    last = temp.firstChild;
    frag.appendChild(last);
  }
  range.insertNode(frag);
  if (last) {
    range.setStartAfter(last);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

/** Convert coach Markdown (subset) to HTML for contenteditable display. */
export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const parts: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      parts.push(`<h${level}>${inlineMarkdownToHtml(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const chunks: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        chunks.push(inlineMarkdownToHtml(lines[i].replace(/^>\s?/, "")));
        i += 1;
      }
      parts.push(`<blockquote>${chunks.map((c) => `<p>${c}</p>`).join("")}</blockquote>`);
      continue;
    }
    if (/^\s{2,}[-*]\s+/.test(line) || /^\s{2,}\d+\.\s+/.test(line)) {
      // keep indented list items as nested-looking paragraphs with padding via blockquote-like indent
      parts.push(
        `<p class="nb-indent">${inlineMarkdownToHtml(line.replace(/^\s+/, ""))}</p>`,
      );
      i += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inlineMarkdownToHtml(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>`);
        i += 1;
      }
      parts.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inlineMarkdownToHtml(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>`);
        i += 1;
      }
      parts.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    if (line.trim() === "") {
      parts.push("<p><br></p>");
      i += 1;
      continue;
    }
    parts.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
    i += 1;
  }
  return parts.join("") || "<p><br></p>";
}

function inlineMarkdownToHtml(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(HIGHLIGHT_RE, (_m, color: string, body: string) => {
    return `<mark data-color="${color}" class="nb-mark nb-mark-${color}">${body}</mark>`;
  });
  s = s.replace(LEGACY_HIGHLIGHT_RE, (_m, body: string) => {
    return `<mark data-color="yellow" class="nb-mark nb-mark-yellow">${body}</mark>`;
  });
  s = s.replace(FONT_COLOR_RE, (_m, color: string, body: string) => {
    return `<span data-fg="${color}" class="nb-fg nb-fg-${color}">${body}</span>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return s;
}

/** Serialize contenteditable HTML back to coach Markdown subset. */
export function htmlToMarkdown(html: string): string {
  const root = document.createElement("div");
  root.innerHTML = html;
  return nodesToMarkdown(root).replace(/\n{3,}/g, "\n\n").trimEnd();
}

function nodesToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (!(node instanceof HTMLElement)) return "";

  const tag = node.tagName.toLowerCase();
  if (tag === "br") return "\n";
  if (tag === "strong" || tag === "b") {
    return `**${Array.from(node.childNodes).map(nodesToMarkdown).join("")}**`;
  }
  if (tag === "mark") {
    const color = (node.getAttribute("data-color") || "yellow") as HighlightColor;
    const body = Array.from(node.childNodes).map(nodesToMarkdown).join("");
    return `==${color}:${body}==`;
  }
  if (tag === "span" && node.dataset.fg) {
    const color = node.dataset.fg as FontColor;
    const body = Array.from(node.childNodes).map(nodesToMarkdown).join("");
    return `{{${color}:${body}}}`;
  }
  if (/^h[1-3]$/.test(tag)) {
    const level = Number(tag[1]);
    const body = Array.from(node.childNodes).map(nodesToMarkdown).join("").trim();
    return `${"#".repeat(level)} ${body}\n`;
  }
  if (tag === "blockquote") {
    const body = Array.from(node.childNodes)
      .map(nodesToMarkdown)
      .join("")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((ln) => `> ${ln}`)
      .join("\n");
    return `${body}\n`;
  }
  if (tag === "ul") {
    return (
      Array.from(node.children)
        .map((li) => `- ${Array.from(li.childNodes).map(nodesToMarkdown).join("").trim()}`)
        .join("\n") + "\n"
    );
  }
  if (tag === "ol") {
    return (
      Array.from(node.children)
        .map((li, idx) => `${idx + 1}. ${Array.from(li.childNodes).map(nodesToMarkdown).join("").trim()}`)
        .join("\n") + "\n"
    );
  }
  if (tag === "p" || tag === "div") {
    const indent = node.classList.contains("nb-indent") ? "  " : "";
    const inner = Array.from(node.childNodes).map(nodesToMarkdown).join("");
    return `${indent}${inner}\n`;
  }
  return Array.from(node.childNodes).map(nodesToMarkdown).join("");
}

export function wrapSelectionAsHighlight(color: HighlightColor): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const mark = document.createElement("mark");
  mark.dataset.color = color;
  mark.className = `nb-mark nb-mark-${color}`;
  try {
    range.surroundContents(mark);
  } catch {
    const frag = range.extractContents();
    mark.appendChild(frag);
    range.insertNode(mark);
  }
  sel.removeAllRanges();
  const next = document.createRange();
  next.selectNodeContents(mark);
  next.collapse(false);
  sel.addRange(next);
}

export function clearHighlightFromSelection(): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  let node: Node | null = sel.anchorNode;
  while (node && !(node instanceof HTMLElement && node.tagName === "MARK")) {
    node = node.parentNode;
  }
  if (!(node instanceof HTMLElement)) return;
  const parent = node.parentNode;
  if (!parent) return;
  while (node.firstChild) parent.insertBefore(node.firstChild, node);
  parent.removeChild(node);
  parent.normalize();
}

export function wrapSelectionAsFontColor(color: FontColor): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const span = document.createElement("span");
  span.dataset.fg = color;
  span.className = `nb-fg nb-fg-${color}`;
  try {
    range.surroundContents(span);
  } catch {
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }
}

export function applyHeading(level: 1 | 2 | 3): void {
  document.execCommand("formatBlock", false, `h${level}`);
}

export function indentBlock(): void {
  document.execCommand("indent");
}

export function outdentBlock(): void {
  document.execCommand("outdent");
}

/** Build a Markdown TOC from ATX headings in the note body. */
export function generateTableOfContents(md: string, title = "TOC"): string {
  const items: string[] = [];
  for (const line of md.replace(/\r\n/g, "\n").split("\n")) {
    const m = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (!m) continue;
    const depth = m[1].length;
    const heading = m[2].replace(/[#*`]/g, "").trim();
    if (!heading) continue;
    // Skip existing TOC titles so we don't nest them.
    if (/^(TOC|目录)$/i.test(heading)) continue;
    const pad = "  ".repeat(depth - 1);
    items.push(`${pad}- ${heading}`);
  }
  if (items.length === 0) return "";
  return `## ${title}\n\n${items.join("\n")}\n`;
}

/** Insert or replace a leading TOC section (supports ## TOC / ## 目录). */
export function upsertTableOfContents(md: string, title = "TOC"): string {
  const toc = generateTableOfContents(md, title);
  if (!toc) return md;
  const stripped = md
    .replace(/^##\s*(?:TOC|目录)\s*\n(?:\n|.)*?(?=\n##\s|\n#\s|$)/im, "")
    .trimStart();
  const withoutOldTocHeadings = stripped.replace(/^##\s*(?:TOC|目录)\s*$/gim, "");
  const rebuilt = generateTableOfContents(withoutOldTocHeadings, title) || toc;
  return `${rebuilt}\n${stripped}`.replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
