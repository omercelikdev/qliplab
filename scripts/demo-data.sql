-- Demo data for App Store screenshots

-- Python code (pinned)
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-py-001', 'def fibonacci(n: int) -> list[int]:
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    return fib[:n]

result = fibonacci(10)
print(f"First 10: {result}")', 'text', 'code_python', 'Visual Studio Code', 1, 0, '2026-03-22T14:00:00Z', '2026-03-22T14:00:00Z');

-- Rust code
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-rs-001', 'fn main() {
    let numbers = vec![1, 2, 3, 4, 5];
    let doubled: Vec<i32> = numbers.iter()
        .map(|x| x * 2)
        .collect();
    println!("{:?}", doubled);
}', 'text', 'code_rust', 'Visual Studio Code', 0, 0, '2026-03-22T13:55:00Z', '2026-03-22T13:55:00Z');

-- Go code
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-go-001', 'func fetchData(ctx context.Context, url string) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, fmt.Errorf("request: %w", err)
    }
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}', 'text', 'code_go', 'GoLand', 0, 0, '2026-03-22T13:50:00Z', '2026-03-22T13:50:00Z');

-- Beautiful JSON (pinned)
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-json-001', '{
  "name": "QlipLab",
  "version": "0.1.0",
  "description": "Smart clipboard manager",
  "features": ["history", "vault", "snippets", "transforms"],
  "platforms": { "macos": true, "windows": true, "linux": true }
}', 'text', 'json', 'Postman', 1, 0, '2026-03-22T13:45:00Z', '2026-03-22T13:45:00Z');

-- Base64
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-b64-001', 'SGVsbG8gV29ybGQhIFRoaXMgaXMgYSBiYXNlNjQgZW5jb2RlZCBtZXNzYWdl', 'text', 'base64', 'Terminal', 0, 0, '2026-03-22T13:40:00Z', '2026-03-22T13:40:00Z');

-- UUID
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-uuid-001', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'text', 'uuid', 'Xcode', 0, 0, '2026-03-22T13:35:00Z', '2026-03-22T13:35:00Z');

-- Colors
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-color-001', '#F97316', 'text', 'color', 'Figma', 0, 0, '2026-03-22T13:30:00Z', '2026-03-22T13:30:00Z');

INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-color-002', 'rgba(251, 191, 36, 0.85)', 'text', 'color', 'Figma', 0, 0, '2026-03-22T13:29:00Z', '2026-03-22T13:29:00Z');

-- SQL query
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-sql-001', 'SELECT u.name, u.email, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > ''2026-01-01''
GROUP BY u.id
HAVING order_count > 5
ORDER BY order_count DESC
LIMIT 20;', 'text', 'sql', 'DataGrip', 0, 0, '2026-03-22T13:25:00Z', '2026-03-22T13:25:00Z');

-- URL
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-url-001', 'https://docs.rs/tauri/latest/tauri/struct.Builder.html', 'text', 'url', 'Safari', 0, 0, '2026-03-22T13:20:00Z', '2026-03-22T13:20:00Z');

-- CSV data
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-csv-001', 'Name,Role,Department,Salary
Alice Johnson,Engineer,Engineering,125000
Bob Smith,Designer,Design,110000
Carol White,PM,Product,130000
David Lee,DevOps,Infrastructure,120000', 'text', 'csv', 'Numbers', 0, 0, '2026-03-22T13:15:00Z', '2026-03-22T13:15:00Z');

-- Hex
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-hex-001', '0x4a6f686e446f65313233', 'text', 'hex', 'Terminal', 0, 0, '2026-03-22T13:10:00Z', '2026-03-22T13:10:00Z');

-- Timestamp
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-ts-001', '1711108800', 'text', 'timestamp', 'Terminal', 0, 0, '2026-03-22T13:05:00Z', '2026-03-22T13:05:00Z');

-- YAML
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-yaml-001', 'apiVersion: apps/v1
kind: Deployment
metadata:
  name: qliplab-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: qliplab
  template:
    spec:
      containers:
        - name: api
          image: qliplab/api:latest
          ports:
            - containerPort: 8080', 'text', 'yaml', 'Visual Studio Code', 0, 0, '2026-03-22T13:00:00Z', '2026-03-22T13:00:00Z');

-- Regex
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-regex-001', '/^(?:(?:\+|00)(\d{1,3}))?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/gm', 'text', 'regex', 'Visual Studio Code', 0, 0, '2026-03-22T12:55:00Z', '2026-03-22T12:55:00Z');

-- Markdown (pinned)
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-md-001', '## Release Notes v0.1.0

### New Features
- **Clipboard History** — Auto-captures copied content
- **Smart Transforms** — Beautify JSON, decode Base64
- **Secure Vault** — AES-256-GCM encrypted storage
- **Diff Mode** — Compare two items side-by-side

### Bug Fixes
- Fixed window positioning on multi-monitor setups
- Improved paste speed for large content', 'text', 'markdown', 'Obsidian', 1, 0, '2026-03-22T12:50:00Z', '2026-03-22T12:50:00Z');

-- TypeScript code
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-ts-code-001', 'interface ClipboardItem {
  id: string;
  content: string;
  detectedFormat: DetectedFormat;
  sourceApp?: string;
  isPinned: boolean;
  createdAt: Date;
}

export function useClipboard(): ClipboardItem[] {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  useEffect(() => {
    loadItems().then(setItems);
  }, []);
  return items;
}', 'text', 'code_ts', 'Visual Studio Code', 0, 0, '2026-03-22T12:45:00Z', '2026-03-22T12:45:00Z');

-- XML
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-xml-001', '<?xml version="1.0" encoding="UTF-8"?>
<project>
  <name>QlipLab</name>
  <version>0.1.0</version>
  <dependencies>
    <dependency group="tauri" artifact="core" version="2.9.5"/>
    <dependency group="react" artifact="dom" version="19.0.0"/>
  </dependencies>
</project>', 'text', 'xml', 'IntelliJ IDEA', 0, 0, '2026-03-22T12:40:00Z', '2026-03-22T12:40:00Z');

-- JavaScript
INSERT OR IGNORE INTO clipboard_history (id, content, content_type, detected_format, source_app, is_pinned, is_sensitive, created_at, updated_at)
VALUES ('demo-js-001', 'const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};', 'text', 'code_js', 'Visual Studio Code', 0, 0, '2026-03-22T12:35:00Z', '2026-03-22T12:35:00Z');

-- Snippets
INSERT OR IGNORE INTO snippets (id, title, content, trigger, category_id, syntax, is_pinned, sort_order, created_at, updated_at)
VALUES ('demo-snip-001', 'React useState Hook', 'const [state, setState] = useState<Type>(initial);', 'rstate', NULL, 'typescript', 1, 0, '2026-03-20T10:00:00Z', '2026-03-20T10:00:00Z');

INSERT OR IGNORE INTO snippets (id, title, content, trigger, category_id, syntax, is_pinned, sort_order, created_at, updated_at)
VALUES ('demo-snip-002', 'Python List Comprehension', '[expr for item in iterable if condition]', 'pylist', NULL, 'python', 0, 1, '2026-03-20T10:01:00Z', '2026-03-20T10:01:00Z');

INSERT OR IGNORE INTO snippets (id, title, content, trigger, category_id, syntax, is_pinned, sort_order, created_at, updated_at)
VALUES ('demo-snip-003', 'SQL Join Template', 'SELECT a.*, b.*
FROM table1 a
INNER JOIN table2 b ON a.key = b.key
WHERE a.active = 1;', 'sqljoin', NULL, 'sql', 0, 2, '2026-03-20T10:02:00Z', '2026-03-20T10:02:00Z');

INSERT OR IGNORE INTO snippets (id, title, content, trigger, category_id, syntax, is_pinned, sort_order, created_at, updated_at)
VALUES ('demo-snip-004', 'Docker Compose Service', 'services:
  app:
    image: node:20-alpine
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped', 'dcomp', NULL, 'yaml', 0, 3, '2026-03-20T10:03:00Z', '2026-03-20T10:03:00Z');

INSERT OR IGNORE INTO snippets (id, title, content, trigger, category_id, syntax, is_pinned, sort_order, created_at, updated_at)
VALUES ('demo-snip-005', 'CSS Flexbox Center', 'display: flex;
align-items: center;
justify-content: center;
gap: 1rem;', 'flexc', NULL, 'css', 1, 4, '2026-03-20T10:04:00Z', '2026-03-20T10:04:00Z');

INSERT OR IGNORE INTO snippets (id, title, content, trigger, category_id, syntax, is_pinned, sort_order, created_at, updated_at)
VALUES ('demo-snip-006', 'Rust Error Handler', 'fn parse_config(path: &str) -> Result<Config, Box<dyn Error>> {
    let content = fs::read_to_string(path)?;
    let config: Config = serde_json::from_str(&content)?;
    Ok(config)
}', 'rserr', NULL, 'rust', 0, 5, '2026-03-20T10:05:00Z', '2026-03-20T10:05:00Z');

INSERT OR IGNORE INTO snippets (id, title, content, trigger, category_id, syntax, is_pinned, sort_order, created_at, updated_at)
VALUES ('demo-snip-007', 'API Fetch Wrapper', 'async function fetchAPI<T>(endpoint: string): Promise<T> {
  const res = await fetch(`/api/${endpoint}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}', 'apif', NULL, 'typescript', 0, 6, '2026-03-20T10:06:00Z', '2026-03-20T10:06:00Z');

INSERT OR IGNORE INTO snippets (id, title, content, trigger, category_id, syntax, is_pinned, sort_order, created_at, updated_at)
VALUES ('demo-snip-008', 'Git Commit Message', 'feat(scope): short description

Longer explanation of the change.

Refs: #123', 'gcommit', NULL, 'plain', 0, 7, '2026-03-20T10:07:00Z', '2026-03-20T10:07:00Z');
