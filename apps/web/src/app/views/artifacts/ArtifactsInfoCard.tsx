import { FileText } from 'lucide-react';

import { Card } from '../../components/ui/card';
import { artifactsViewCopy } from './copy';

export function ArtifactsInfoCard() {
  return (
    <Card className="border-[color:var(--status-info)] bg-[var(--surface-elevated)] p-4">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 size-5 shrink-0 text-[var(--status-info)]" />
        <div>
          <h3 className="mb-1 font-semibold text-[var(--text-strong)]">{artifactsViewCopy.infoTitle}</h3>
          <p className="text-sm text-[var(--text-default)]">{artifactsViewCopy.infoBody}</p>
        </div>
      </div>
    </Card>
  );
}
