// Lightweight markdown-to-HTML renderer (no external dependencies)
// Supports: headings, bold, italic, code, links, images, lists, blockquotes, horizontal rules, tables

export function renderMarkdown(md: string): string {
  let html = md;

  // Escape HTML entities first to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (``` ... ```) — must be processed before inline rules
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const langAttr = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${langAttr}>${code.trimEnd()}</code></pre>`;
  });

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings (# to ######)
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Horizontal rules
  html = html.replace(/^(---|\*\*\*|___)$/gm, '<hr>');

  // Bold + Italic (***text*** or ___text___)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');

  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Strikethrough (~~text~~)
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Images (![alt](url))
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');

  // Links ([text](url))
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Blockquotes (> text) — simple single-level
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

  // Tables
  html = processMarkdownTables(html);

  // Unordered lists
  html = processLists(html);

  // Paragraphs — wrap standalone lines
  html = html.replace(/^(?!<[a-z/])((?!^\s*$).+)$/gm, '<p>$1</p>');
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

function processMarkdownTables(html: string): string {
  const lines = html.split('\n');
  const result: string[] = [];
  let inTable = false;
  let headerDone = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isTableRow = /^\|(.+)\|$/.test(line);
    const isSeparator = /^\|[\s:|-]+\|$/.test(line);

    if (isTableRow && !inTable) {
      inTable = true;
      headerDone = false;
      result.push('<table>');
      // Header row
      const cells = line.split('|').filter(c => c.trim() !== '');
      result.push('<thead><tr>' + cells.map(c => `<th>${c.trim()}</th>`).join('') + '</tr></thead>');
      result.push('<tbody>');
    } else if (isSeparator && inTable) {
      headerDone = true;
      // Skip separator row
    } else if (isTableRow && inTable && headerDone) {
      const cells = line.split('|').filter(c => c.trim() !== '');
      result.push('<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>');
    } else {
      if (inTable) {
        result.push('</tbody></table>');
        inTable = false;
        headerDone = false;
      }
      result.push(lines[i]);
    }
  }

  if (inTable) {
    result.push('</tbody></table>');
  }

  return result.join('\n');
}

function processLists(html: string): string {
  const lines = html.split('\n');
  const result: string[] = [];
  let inUl = false;
  let inOl = false;

  for (const line of lines) {
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)/);
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)/);

    if (ulMatch) {
      if (!inUl) { result.push('<ul>'); inUl = true; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      result.push(`<li>${ulMatch[2]}</li>`);
    } else if (olMatch) {
      if (!inOl) { result.push('<ol>'); inOl = true; }
      if (inUl) { result.push('</ul>'); inUl = false; }
      result.push(`<li>${olMatch[2]}</li>`);
    } else {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      result.push(line);
    }
  }

  if (inUl) result.push('</ul>');
  if (inOl) result.push('</ol>');

  return result.join('\n');
}
