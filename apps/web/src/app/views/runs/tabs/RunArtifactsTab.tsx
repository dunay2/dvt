import { Download } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import type { Run } from '../../../types/dbt';
import { RunSurfaceCard } from './RunTabPrimitives';

type RunArtifactsTabProps = {
  run: Run;
};

type ArtifactCardProps = {
  title: string;
  path?: string;
};

function ArtifactCard({ title, path }: Readonly<ArtifactCardProps>) {
  return (
    <RunSurfaceCard className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold mb-1">{title}</h3>
          <p className="text-xs text-slate-300">{path}</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="size-4 mr-2" />
          Download
        </Button>
      </div>
    </RunSurfaceCard>
  );
}

export default function RunArtifactsTab({ run }: Readonly<RunArtifactsTabProps>) {
  return (
    <div className="space-y-3">
      <ArtifactCard title="manifest.json" path={run.artifacts?.manifest} />
      <ArtifactCard title="run_results.json" path={run.artifacts?.runResults} />
      <ArtifactCard title="catalog.json" path={run.artifacts?.catalog} />
    </div>
  );
}
