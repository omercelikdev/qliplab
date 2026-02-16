import * as transforms from './transforms';

export interface TransformDef {
  id: string;
  label: string;
  category: string;
  apply: (input: string) => string | Promise<string>;
}

export const TRANSFORM_REGISTRY: TransformDef[] = [
  // Encode
  { id: 'base64_encode', label: 'Base64 Encode', category: 'Encode', apply: transforms.encodeBase64 },
  { id: 'url_encode', label: 'URL Encode', category: 'Encode', apply: transforms.encodeUrl },
  { id: 'html_escape', label: 'HTML Escape', category: 'Encode', apply: transforms.escapeHtml },
  { id: 'text_to_hex', label: 'Text → Hex', category: 'Encode', apply: transforms.textToHex },

  // Decode
  { id: 'base64_decode', label: 'Base64 Decode', category: 'Decode', apply: transforms.decodeBase64 },
  { id: 'url_decode', label: 'URL Decode', category: 'Decode', apply: transforms.decodeUrl },
  { id: 'html_unescape', label: 'HTML Unescape', category: 'Decode', apply: transforms.unescapeHtml },
  { id: 'hex_to_text', label: 'Hex → Text', category: 'Decode', apply: transforms.hexToText },

  // Format
  { id: 'json_beautify', label: 'JSON Beautify', category: 'Format', apply: transforms.beautifyJson },
  { id: 'json_minify', label: 'JSON Minify', category: 'Format', apply: transforms.minifyJson },
  { id: 'sql_format', label: 'SQL Format', category: 'Format', apply: transforms.formatSql },
  { id: 'yaml_beautify', label: 'YAML Beautify', category: 'Format', apply: transforms.beautifyYaml },
  { id: 'js_beautify', label: 'JS Beautify', category: 'Format', apply: transforms.beautifyJavaScript },
  { id: 'ts_beautify', label: 'TS Beautify', category: 'Format', apply: transforms.beautifyTypeScript },

  // Convert
  { id: 'json_to_yaml', label: 'JSON → YAML', category: 'Convert', apply: transforms.jsonToYaml },
  { id: 'yaml_to_json', label: 'YAML → JSON', category: 'Convert', apply: transforms.yamlToJson },
  { id: 'csv_to_json', label: 'CSV → JSON', category: 'Convert', apply: transforms.csvToJson },
  { id: 'timestamp_to_date', label: 'Timestamp → Date', category: 'Convert', apply: transforms.timestampToDate },

  // Case
  { id: 'uppercase', label: 'UPPERCASE', category: 'Case', apply: transforms.toUpperCase },
  { id: 'lowercase', label: 'lowercase', category: 'Case', apply: transforms.toLowerCase },
  { id: 'camelcase', label: 'camelCase', category: 'Case', apply: transforms.toCamelCase },
  { id: 'snakecase', label: 'snake_case', category: 'Case', apply: transforms.toSnakeCase },
];

export function getTransformById(id: string): TransformDef | undefined {
  return TRANSFORM_REGISTRY.find(t => t.id === id);
}

export function getTransformCategories(): string[] {
  const categories = new Set(TRANSFORM_REGISTRY.map(t => t.category));
  return Array.from(categories);
}
