import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdownRenderer';

// ─── Test 12: Markdown Rendering ─────────────────────────────

describe('renderMarkdown', () => {
  it('renders headings', () => {
    expect(renderMarkdown('# Hello')).toContain('<h1>');
    expect(renderMarkdown('## World')).toContain('<h2>');
    expect(renderMarkdown('### Sub')).toContain('<h3>');
  });

  it('renders bold text', () => {
    const html = renderMarkdown('This is **bold** text');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('renders italic text', () => {
    const html = renderMarkdown('This is *italic* text');
    expect(html).toContain('<em>italic</em>');
  });

  it('renders strikethrough', () => {
    const html = renderMarkdown('This is ~~deleted~~ text');
    expect(html).toContain('<del>deleted</del>');
  });

  it('renders links', () => {
    const html = renderMarkdown('[Google](https://google.com)');
    expect(html).toContain('<a href="https://google.com">Google</a>');
  });

  it('renders inline code', () => {
    const html = renderMarkdown('Use `console.log` here');
    expect(html).toContain('<code>console.log</code>');
  });

  it('renders code blocks with language class', () => {
    const html = renderMarkdown('```js\nconst x = 1;\n```');
    expect(html).toContain('<code');
    expect(html).toContain('const x = 1;');
  });

  it('renders unordered lists', () => {
    const html = renderMarkdown('- item 1\n- item 2\n- item 3');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>');
    expect((html.match(/<li>/g) || []).length).toBe(3);
  });

  it('renders ordered lists', () => {
    const html = renderMarkdown('1. first\n2. second\n3. third');
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>');
  });

  it('renders nested lists', () => {
    const html = renderMarkdown('- parent\n  - child\n  - child2\n- parent2');
    expect(html).toContain('<ul>');
    expect((html.match(/<ul>/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('renders task lists', () => {
    const html = renderMarkdown('- [x] done\n- [ ] todo');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked');
  });

  it('renders tables', () => {
    const md = '| Name | Age |\n|------|-----|\n| John | 30 |\n| Jane | 25 |';
    const html = renderMarkdown(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>');
    expect(html).toContain('<td>');
  });

  it('renders blockquotes', () => {
    const html = renderMarkdown('> This is a quote');
    expect(html).toContain('<blockquote>');
  });

  it('renders horizontal rules', () => {
    expect(renderMarkdown('---')).toContain('<hr');
  });

  it('renders images', () => {
    const html = renderMarkdown('![alt text](https://example.com/img.png)');
    expect(html).toContain('<img');
    expect(html).toContain('src="https://example.com/img.png"');
  });

  it('sanitizes XSS attempts', () => {
    const html = renderMarkdown('<script>alert("xss")</script>');
    expect(html).not.toContain('<script>');
  });

  it('sanitizes onclick handlers', () => {
    const html = renderMarkdown('[click](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });

  it('handles empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('handles complex document', () => {
    const md = `# Title

Some **bold** and *italic* text.

## List Section

- item 1
- item 2
  - nested

> A blockquote

\`\`\`js
const x = 42;
\`\`\`

| Col A | Col B |
|-------|-------|
| 1     | 2     |

---

[Link](https://example.com)`;

    const html = renderMarkdown(md);
    expect(html).toContain('<h1>');
    expect(html).toContain('<h2>');
    expect(html).toContain('<strong>');
    expect(html).toContain('<em>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<code');
    expect(html).toContain('<table>');
    expect(html).toContain('<hr');
    expect(html).toContain('<a href');
  });
});
