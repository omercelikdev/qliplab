import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked for GFM (GitHub Flavored Markdown)
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Render markdown to sanitized HTML.
 *
 * Uses `marked` for full GFM support (tables, task lists, strikethrough,
 * autolinks, nested lists, code blocks, etc.) and `DOMPurify` for XSS protection.
 */
export function renderMarkdown(md: string): string {
  const rawHtml = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'em', 'del', 's',
      'a', 'img',
      'ul', 'ol', 'li',
      'blockquote',
      'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'input', // for task list checkboxes
      'div', 'span',
      'sup', 'sub',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id',
      'type', 'checked', 'disabled', // for task list checkboxes
    ],
    ALLOW_DATA_ATTR: false,
  });
}
