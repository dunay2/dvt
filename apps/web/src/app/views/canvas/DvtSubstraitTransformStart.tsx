/** Owned concern: initialize an empty Transform with one admitted canonical Substrait shape. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import type { Dispatch, SetStateAction } from 'react';

import { Button } from '../../components/ui/button';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { DvtSubstraitCompositionStart } from './DvtSubstraitCompositionStart';
import { canvasViewCopy } from './copy';

export function DvtSubstraitTransformStart({
  disabled,
  node,
  nodes,
  edges,
  onChange,
}: Readonly<{
  disabled: boolean;
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element | null {
  const inputs = resolveCanvasDvtCompositionInputs({ targetNodeId: node.id, nodes, edges });
  const input = inputs.length === 1 ? inputs[0] : null;
  if (input == null) {
    return (
      <DvtSubstraitCompositionStart
        disabled={disabled}
        node={node}
        nodes={nodes}
        edges={edges}
        onChange={onChange}
      />
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={
        disabled ||
        (input.producer == null && input.fields.some((field) => field.joinDataType == null))
      }
      data-slot="dvt-start-substrait-projection"
      onClick={() => {
        if (disabled) return;
        const projection = createCanvasRelationalTreeProjectionDraft({
          input,
          targetNodeId: node.id,
        });
        onChange((currentDraft) => ({
          ...currentDraft,
          dvt: {
            kind: 'transform',
            materialized:
              currentDraft.dvt?.kind === 'transform' ? currentDraft.dvt.materialized : 'view',
            mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
            shape: 'projection',
            plan: projection.plan,
            sidecar: projection.sidecar,
          },
        }));
      }}
    >
      {canvasViewCopy.inspectorTransformOutputSubstraitLabel}
    </Button>
  );
}
