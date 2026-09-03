/** Owned concern: initialize an empty Transform with one admitted canonical Substrait shape. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import type { Dispatch, SetStateAction } from 'react';

import { Button } from '../../components/ui/button';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  createDvtSubstraitPilotDraft,
  resolveDvtSubstraitPilotEntry,
} from './canvasDvtSubstraitPilot';
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
  if (resolveCanvasDvtCompositionInputs({ targetNodeId: node.id, nodes, edges }).length > 1) {
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
  const sourceNodeId = resolveDvtSubstraitPilotEntry({ targetNode: node, nodes, edges });
  if (sourceNodeId == null) {
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
      disabled={disabled}
      data-slot="dvt-start-substrait-pilot"
      onClick={() => {
        const pilot = createDvtSubstraitPilotDraft({
          sourceNodeId,
          targetNodeId: node.id,
        });
        onChange((currentDraft) => ({
          ...currentDraft,
          dvt: {
            kind: 'transform',
            mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
            shape: 'pilot',
            plan: pilot.plan,
            sidecar: pilot.sidecar,
          },
        }));
      }}
    >
      {canvasViewCopy.inspectorTransformOutputSubstraitLabel}
    </Button>
  );
}
