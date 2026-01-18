import { Braces, Key, Database, Binary, Link, Code, Type, Hash, Clock, FileCode } from 'lucide-react';
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
  plain: { icon: Type, color: 'text-muted-foreground' },
};

export function FormatIcon({ format, size = 12 }: { format: DetectedFormat; size?: number }) {
  const { icon: Icon, color } = iconMap[format] || iconMap.plain;
  return <div className={cn('flex-shrink-0', color)}><Icon size={size} /></div>;
}
