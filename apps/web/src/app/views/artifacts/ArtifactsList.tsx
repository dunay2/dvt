import { Download, Eye, FileText } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { routeWorkbenchSectionTitleClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { artifactsViewCopy } from './copy';
import type { ArtifactPreview } from './types';

type ArtifactsListProps = {
  artifacts: ArtifactPreview[];
  panelClassName: string;
};

export function ArtifactsList({ artifacts, panelClassName }: ArtifactsListProps) {
  return (
    <div>
      <h2 className={routeWorkbenchSectionTitleClassName}>{artifactsViewCopy.artifactsTitle}</h2>
      <div className="space-y-3">
        {artifacts.map((artifact) => (
          <Card key={artifact.id} className={panelClassName}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded bg-[var(--surface-elevated)]">
                  <FileText className="size-5 text-[var(--status-info)]" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">{artifact.type}</h3>
                  <p className="mb-2 text-sm text-[var(--text-default)]">{artifact.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                    <span>Size: {artifact.size}</span>
                    <span>Updated: {new Date(artifact.lastUpdated).toLocaleString()}</span>
                    <span>Source: {artifact.sourceLabel}</span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 size-4" />
                  View
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 size-4" />
                  Download
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
