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
  { id: 'json_to_csv', label: 'JSON → CSV', category: 'Convert', relevantFormats: ['json'], apply: transforms.jsonToCsv },
  { id: 'xml_to_json', label: 'XML → JSON', category: 'Convert', relevantFormats: ['xml'], apply: transforms.xmlToJson },
  { id: 'json_to_xml', label: 'JSON → XML', category: 'Convert', relevantFormats: ['json'], apply: transforms.jsonToXml },
  { id: 'timestamp_to_date', label: 'Timestamp → Date', category: 'Convert', relevantFormats: ['timestamp'], apply: transforms.timestampToDate },
  { id: 'date_to_timestamp', label: 'Date → Timestamp', category: 'Convert', relevantFormats: [], apply: transforms.dateToTimestamp },

  // Hash
  { id: 'hash_md5', label: 'MD5 Hash', category: 'Hash', relevantFormats: [], apply: transforms.hashMd5 },
  { id: 'hash_sha1', label: 'SHA-1 Hash', category: 'Hash', relevantFormats: [], apply: transforms.hashSha1 },
  { id: 'hash_sha256', label: 'SHA-256 Hash', category: 'Hash', relevantFormats: [], apply: transforms.hashSha256 },
  { id: 'hash_sha512', label: 'SHA-512 Hash', category: 'Hash', relevantFormats: [], apply: transforms.hashSha512 },
  { id: 'hash_all', label: 'All Hashes', category: 'Hash', relevantFormats: [], apply: transforms.hashAll },

  // Case
  { id: 'uppercase', label: 'UPPERCASE', category: 'Case', relevantFormats: [], apply: transforms.toUpperCase },
  { id: 'lowercase', label: 'lowercase', category: 'Case', relevantFormats: [], apply: transforms.toLowerCase },
  { id: 'camelcase', label: 'camelCase', category: 'Case', relevantFormats: [], apply: transforms.toCamelCase },
  { id: 'snakecase', label: 'snake_case', category: 'Case', relevantFormats: [], apply: transforms.toSnakeCase },
  { id: 'kebabcase', label: 'kebab-case', category: 'Case', relevantFormats: [], apply: transforms.kebabCase },
  { id: 'pascalcase', label: 'PascalCase', category: 'Case', relevantFormats: [], apply: transforms.pascalCase },
  { id: 'titlecase', label: 'Title Case', category: 'Case', relevantFormats: [], apply: transforms.titleCase },

  // Text
  { id: 'sort_lines', label: 'Sort Lines (A→Z)', category: 'Text', relevantFormats: [], apply: transforms.sortLines },
  { id: 'sort_lines_reverse', label: 'Sort Lines (Z→A)', category: 'Text', relevantFormats: [], apply: transforms.sortLinesReverse },
  { id: 'deduplicate_lines', label: 'Remove Duplicates', category: 'Text', relevantFormats: [], apply: transforms.deduplicateLines },
  { id: 'reverse_lines', label: 'Reverse Lines', category: 'Text', relevantFormats: [], apply: transforms.reverseLines },
  { id: 'reverse_text', label: 'Reverse Text', category: 'Text', relevantFormats: [], apply: transforms.reverseText },
  { id: 'trim_lines', label: 'Trim Lines', category: 'Text', relevantFormats: [], apply: transforms.trimLines },
  { id: 'remove_empty_lines', label: 'Remove Empty Lines', category: 'Text', relevantFormats: [], apply: transforms.removeEmptyLines },
  { id: 'number_lines', label: 'Number Lines', category: 'Text', relevantFormats: [], apply: transforms.numberLines },
  { id: 'wrap_lines', label: 'Word Wrap (80)', category: 'Text', relevantFormats: [], apply: transforms.wrapLines },
  { id: 'shuffle_lines', label: 'Shuffle Lines', category: 'Text', relevantFormats: [], apply: transforms.shuffleLines },
  { id: 'count_stats', label: 'Count Stats', category: 'Text', relevantFormats: [], apply: transforms.countStats },
];

export function getTransformById(id: string): TransformDef | undefined {
  return TRANSFORM_REGISTRY.find(t => t.id === id);
}

export function getTransformCategories(): string[] {
  const categories = new Set(TRANSFORM_REGISTRY.map(t => t.category));
  return Array.from(categories);
}

/**
 * Transforms whose relevance is specific to this format.
 *
 * Deliberately excludes universal transforms (empty relevantFormats). Base64
 * Encode applies to any text, but suggesting it for an SQL clip buries the one
 * transform that actually matters — SQL Format — under a pile of noise. Only
 * the format-specific ones earn the top "Suggested" slot.
 */
export function getSuggestedTransforms(format: DetectedFormat): TransformDef[] {
  return TRANSFORM_REGISTRY.filter(
    (t) => t.relevantFormats.length > 0 && t.relevantFormats.includes(format),
  );
}

/** Space- and case-insensitive so "base 64" finds "Base64 Encode". */
export function transformMatchesQuery(t: TransformDef, query: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  const q = norm(query);
  return norm(t.label).includes(q) || norm(t.category).includes(q);
}

export interface TransformGroup {
  /** 'results' while searching, else 'recent' | 'suggested' | a category name. */
  key: string;
  transforms: TransformDef[];
}

/**
 * Order the picker actually shows.
 *
 * Searching collapses everything into one ranked result list — a flat list is
 * what keyboard navigation wants. Otherwise the list is grouped: what you used
 * last, then what fits this format, then the full catalogue by category. Recent
 * entries intentionally repeat below; they are a shortcut, not a move.
 */
export function buildTransformGroups(
  format: DetectedFormat,
  recentIds: string[],
  query: string,
): TransformGroup[] {
  if (query.trim()) {
    const results = TRANSFORM_REGISTRY.filter((t) => transformMatchesQuery(t, query));
    return results.length ? [{ key: 'results', transforms: results }] : [];
  }

  const groups: TransformGroup[] = [];

  const recent = recentIds
    .map((id) => TRANSFORM_REGISTRY.find((t) => t.id === id))
    .filter((t): t is TransformDef => t !== undefined);
  if (recent.length) groups.push({ key: 'recent', transforms: recent });

  const suggested = getSuggestedTransforms(format);
  if (suggested.length) groups.push({ key: 'suggested', transforms: suggested });

  // Everything not already suggested, grouped by category in registry order.
  const suggestedIds = new Set(suggested.map((t) => t.id));
  const byCategory = new Map<string, TransformDef[]>();
  for (const t of TRANSFORM_REGISTRY) {
    if (suggestedIds.has(t.id)) continue;
    const bucket = byCategory.get(t.category);
    if (bucket) bucket.push(t);
    else byCategory.set(t.category, [t]);
  }
  for (const [category, transforms] of byCategory) {
    groups.push({ key: category, transforms });
  }

  return groups;
}

/** The visible transforms in display order — what keyboard nav steps through. */
export function flattenGroups(groups: TransformGroup[]): TransformDef[] {
  return groups.flatMap((g) => g.transforms);
}
