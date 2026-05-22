/** Owned concern: adapt one ready Templates generated-source preview to the read-only Monaco code viewer. */
import { FileCode2 } from 'lucide-react';

import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchFieldClassName,
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';

type TemplateMonacoPreviewPanelProps = Readonly<{
  exportFileName: string;
  language: string;
  provider: string;
  source: string;
}>;

export function TemplateMonacoPreviewPanel({
  exportFileName,
  language,
  provider,
  source,
}: TemplateMonacoPreviewPanelProps) {
  return (
    <Card data-slot="templates-preview-panel" className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-[var(--text-strong)]">
            <FileCode2 className="size-4 text-[var(--status-info)]" />
            Generated preview
          </h2>
          <p className={cn('mt-1 text-sm', routeWorkbenchMutedTextClassName)}>
            Read-only source preview for {provider} export review.
          </p>
        </div>
        <Badge variant="outline" className={cn(routeWorkbenchFieldClassName, 'text-xs')}>
          {exportFileName}
        </Badge>
      </div>

      <div data-slot="templates-generated-source-preview" className="mt-4">
        <span data-slot="templates-generated-source-readable-preview" className="sr-only">
          {source}
        </span>
        <MonacoCodeViewer
          ariaLabel={`Generated ${provider} preview: ${exportFileName}`}
          language={language}
          loadingLabel={`Loading ${exportFileName} preview...`}
          path={exportFileName}
          value={source}
        />
      </div>
    </Card>
  );
}
