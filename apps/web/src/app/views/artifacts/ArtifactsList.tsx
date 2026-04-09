import { Download, Eye, FileText } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { artifactsViewCopy } from './copy';
import type { ArtifactPreview } from './types';

type ArtifactsListProps = {
  artifacts: ArtifactPreview[];
  panelClassName: string;
};

export function ArtifactsList({ artifacts, panelClassName }: ArtifactsListProps) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
        {artifactsViewCopy.artifactsTitle}
      </h2>
      <div className="space-y-3">
        {artifacts.map((artifact) => (
          <Card key={`${artifact.type}-${artifact.gitSha}`} className={panelClassName}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded bg-blue-900/30">
                  <FileText className="size-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">{artifact.type}</h3>
                  <p className="mb-2 text-sm text-slate-200">{artifact.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>Size: {artifact.size}</span>
                    <span>Updated: {new Date(artifact.lastUpdated).toLocaleString()}</span>
                    <span>SHA: {artifact.gitSha}</span>
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
