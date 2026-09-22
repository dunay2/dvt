/** Read-only output inspection using the same scalar graph as relational operations. */
import { useState } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanvasOutputExpressionProjection } from './canvasOutputExpressionProjection';
import { CanvasRelationalScalarGraph } from './CanvasRelationalScalarGraph';

export function SemanticOutputExpressionPanel({
  projection,
  fieldId,
}: Readonly<{
  projection: CanvasOutputExpressionProjection;
  fieldId: string;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    projection.status === 'available'
      ? (projection.graph.nodes.find((node) => node.id === selectedId) ?? projection.graph.nodes[0])
      : undefined;
  return (
    <section
      data-slot="semantic-output-expression"
      data-field-id={fieldId}
      data-semantic-digest={
        projection.status === 'available' ? projection.semanticDigest : undefined
      }
      className="flex h-full min-h-0 flex-col gap-2 p-3"
    >
      {projection.status === 'unavailable' ? (
        <p role="status" className="text-sm text-(--text-muted)">
          {language === 'es'
            ? 'Esta salida no admite inspección escalar.'
            : 'Scalar inspection is unavailable for this output.'}
        </p>
      ) : (
        <>
          <div className="min-h-0 flex-1">
            <CanvasRelationalScalarGraph
              graph={projection.graph}
              selectedNodeId={selected?.id}
              onSelectedNodeChange={setSelectedId}
            />
          </div>
          <pre
            data-slot="semantic-output-expression-detail"
            className="max-h-32 overflow-auto whitespace-pre-wrap break-words text-xs text-(--text-muted)"
          >
            {selected?.data.detail}
          </pre>
          <span className="text-xs text-(--text-muted)">{projection.dataType}</span>
        </>
      )}
    </section>
  );
}
