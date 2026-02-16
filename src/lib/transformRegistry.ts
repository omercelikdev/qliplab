import type { DetectedFormat } from '@/types/clipboard';
import * as transforms from './transforms';

export interface TransformDef {
  id: string;
  label: string;
  category: string;
  /** Formats where this transform is most useful. Empty = universal (always relevant). */
  relevantFormats: DetectedFormat[];
  apply: (input: string) => string | Promise<string>;
}

export const TRANSFORM_REGISTRY: TransformDef[] = [
  // Encode — universal, any text can be encoded
  { id: 'base64_encode', label: 'Base64 Encode', category: 'Encode', relevantFormats: [], apply: transforms.encodeBase64 },
  { id: 'url_encode', label: 'URL Encode', category: 'Encode', relevantFormats: [], apply: transforms.encodeUrl },
  { id: 'html_escape', label: 'HTML Escape', category: 'Encode', relevantFormats: [], apply: transforms.escapeHtml },
  { id: 'text_to_hex', label: 'Text → Hex', category: 'Encode', relevantFormats: [], apply: transforms.textToHex },

  // Decode
  { id: 'base64_decode', label: 'Base64 Decode', category: 'Decode', relevantFormats: ['base64'], apply: transforms.decodeBase64 },
  { id: 'url_decode', label: 'URL Decode', category: 'Decode', relevantFormats: ['url', 'url_encoded'], apply: transforms.decodeUrl },
  { id: 'html_unescape', label: 'HTML Unescape', category: 'Decode', relevantFormats: ['html'], apply: transforms.unescapeHtml },
  { id: 'hex_to_text', label: 'Hex → Text', category: 'Decode', relevantFormats: ['hex'], apply: transforms.hexToText },

  // Format
  { id: 'json_beautify', label: 'JSON Beautify', category: 'Format', relevantFormats: ['json'], apply: transforms.beautifyJson },
  { id: 'json_minify', label: 'JSON Minify', category: 'Format', relevantFormats: ['json'], apply: transforms.minifyJson },
  { id: 'sql_format', label: 'SQL Format', category: 'Format', relevantFormats: ['sql'], apply: transforms.formatSql },
  { id: 'yaml_beautify', label: 'YAML Beautify', category: 'Format', relevantFormats: ['yaml'], apply: transforms.beautifyYaml },
  { id: 'js_beautify', label: 'JS Beautify', category: 'Format', relevantFormats: ['code_js'], apply: transforms.beautifyJavaScript },
  { id: 'ts_beautify', label: 'TS Beautify', category: 'Format', relevantFormats: ['code_ts'], apply: transforms.beautifyTypeScript },

  // Convert
  { id: 'json_to_yaml', label: 'JSON → YAML', category: 'Convert', relevantFormats: ['json'], apply: transforms.jsonToYaml },
  { id: 'yaml_to_json', label: 'YAML → JSON', category: 'Convert', relevantFormats: ['yaml'], apply: transforms.yamlToJson },
  { id: 'csv_to_json', label: 'CSV → JSON', category: 'Convert', relevantFormats: ['csv'], apply: transforms.csvToJson },
  { id: 'timestamp_to_date', label: 'Timestamp → Date', category: 'Convert', relevantFormats: ['timestamp'], apply: transforms.timestampToDate },

  // Case
  { id: 'uppercase', label: 'UPPERCASE', category: 'Case', relevantFormats: [], apply: transforms.toUpperCase },
  { id: 'lowercase', label: 'lowercase', category: 'Case', relevantFormats: [], apply: transforms.toLowerCase },
  { id: 'camelcase', label: 'camelCase', category: 'Case', relevantFormats: [], apply: transforms.toCamelCase },
  { id: 'snakecase', label: 'snake_case', category: 'Case', relevantFormats: [], apply: transforms.toSnakeCase },
];

export function getTransformById(id: string): TransformDef | undefined {
  return TRANSFORM_REGISTRY.find(t => t.id === id);
}

export function getTransformCategories(): string[] {
  const categories = new Set(TRANSFORM_REGISTRY.map(t => t.category));
  return Array.from(categories);
}

/** Split transforms into recommended (for this format) and others */
export function getRecommendedTransforms(format: DetectedFormat): {
  recommended: TransformDef[];
  others: TransformDef[];
} {
  const recommended: TransformDef[] = [];
  const others: TransformDef[] = [];

  for (const t of TRANSFORM_REGISTRY) {
    if (t.relevantFormats.length === 0 || t.relevantFormats.includes(format)) {
      recommended.push(t);
    } else {
      others.push(t);
    }
  }

  return { recommended, others };
}
