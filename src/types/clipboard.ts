export type ContentType = 'text' | 'image' | 'file';
export type DetectedFormat =
  | 'json' | 'jwt' | 'base64' | 'url' | 'url_encoded'
  | 'sql' | 'xml' | 'html' | 'uuid' | 'timestamp'
  // New formats
  | 'yaml' | 'color' | 'csv' | 'regex' | 'hex'
  | 'code_js' | 'code_ts' | 'code_python' | 'code_go'
  | 'code_rust' | 'code_java' | 'code_csharp'
  | 'plain';

export interface ClipboardItem {
  id: string;
  content: string;
  contentType: ContentType;
  detectedFormat: DetectedFormat;
  sourceApp?: string;
  isPinned: boolean;
  isSensitive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
