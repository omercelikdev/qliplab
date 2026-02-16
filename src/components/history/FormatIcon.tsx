import { Braces, Key, Database, Binary, Link, Code, Type, Hash, Clock, FileCode, FileCode2, FileText, Palette, Table, Regex } from 'lucide-react';
import type { DetectedFormat } from '@/types/clipboard';
import { cn } from '@/lib/utils';

const iconMap: Record<DetectedFormat, { icon: React.ElementType; color: string }> = {
  json: { icon: Braces, color: 'text-yellow-500' },
  jwt: { icon: Key, color: 'text-purple-500' },
  sql: { icon: Database, color: 'text-blue-500' },
  base64: { icon: Binary, color: 'text-green-500' },
  url: { icon: Link, color: 'text-cyan-500' },
  url_encoded: { icon: Code, color: 'text-orange-500' },
  xml: { icon: FileCode, color: 'text-red-500' },
  html: { icon: FileCode, color: 'text-red-500' },
  uuid: { icon: Hash, color: 'text-pink-500' },
  timestamp: { icon: Clock, color: 'text-indigo-500' },
  // New formats
  yaml: { icon: FileText, color: 'text-amber-500' },
  color: { icon: Palette, color: 'text-rose-500' },
  csv: { icon: Table, color: 'text-emerald-500' },
  regex: { icon: Regex, color: 'text-violet-500' },
  hex: { icon: Binary, color: 'text-lime-500' },
  markdown: { icon: FileText, color: 'text-sky-400' },
  // Programming languages
  code_js: { icon: FileCode2, color: 'text-yellow-400' },
  code_ts: { icon: FileCode2, color: 'text-blue-400' },
  code_python: { icon: FileCode2, color: 'text-green-400' },
  code_go: { icon: FileCode2, color: 'text-cyan-400' },
  code_rust: { icon: FileCode2, color: 'text-orange-400' },
  code_java: { icon: FileCode2, color: 'text-red-400' },
  code_csharp: { icon: FileCode2, color: 'text-purple-400' },
  plain: { icon: Type, color: 'text-muted-foreground' },
};

export function FormatIcon({ format, size = 12 }: { format: DetectedFormat; size?: number }) {
  const { icon: Icon, color } = iconMap[format] || iconMap.plain;
  return <div className={cn('flex-shrink-0', color)}><Icon size={size} /></div>;
}
