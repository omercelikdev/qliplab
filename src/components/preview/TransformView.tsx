import { usePreviewStore } from '@/stores/previewStore';
import { cn } from '@/lib/utils';

export function TransformView() {
  const { transformedContent, sourceItem } = usePreviewStore();
  const isCode = sourceItem?.detectedFormat && [
    'json', 'sql', 'xml', 'html', 'yaml', 'csv', 'regex', 'hex',
    'code_js', 'code_ts', 'code_python', 'code_go', 'code_rust', 'code_java', 'code_csharp'
  ].includes(sourceItem.detectedFormat);

  return (
    <pre className={cn('text-xs whitespace-pre-wrap break-all leading-relaxed', isCode && 'font-mono')}>
      {transformedContent}
    </pre>
  );
}
