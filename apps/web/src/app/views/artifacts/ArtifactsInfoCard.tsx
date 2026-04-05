import { FileText } from 'lucide-react';

import { Card } from '../../components/ui/card';
import { artifactsViewCopy } from './copy';

export function ArtifactsInfoCard() {
  return (
    <Card className="border-blue-800 bg-blue-900/20 p-4">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 size-5 shrink-0 text-blue-400" />
        <div>
          <h3 className="mb-1 font-semibold text-blue-100">{artifactsViewCopy.infoTitle}</h3>
          <p className="text-sm text-blue-100/90">{artifactsViewCopy.infoBody}</p>
        </div>
      </div>
    </Card>
  );
}
