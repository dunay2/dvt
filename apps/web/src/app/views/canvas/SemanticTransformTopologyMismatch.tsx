/** Owned concern: explain why stored Transform semantics cannot be shown as current. */
import { AlertTriangle } from 'lucide-react';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasViewCopy } from './copy';
import { formatCanvasCopyTemplate } from './canvasCopyFormatting';

export type SemanticTransformTopologyMismatchProps = Readonly<{
  transformName: string;
  connectedInputCount: number;
}>;

export function SemanticTransformTopologyMismatch({
  transformName,
  connectedInputCount,
}: SemanticTransformTopologyMismatchProps): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(language);

  return (
    <section
      data-slot="semantic-transform-topology-mismatch"
      className="grid h-full place-items-center p-4"
    >
      <div className="max-w-md rounded-md border border-amber-500/35 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
          <AlertTriangle className="size-4" />
          {copy.operationalDrawerSemanticTopologyMismatchTitle}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatCanvasCopyTemplate(copy.operationalDrawerSemanticTopologyMismatchMessage, {
            transformName,
            connectedInputCount: String(connectedInputCount),
          })}
        </p>
      </div>
    </section>
  );
}
