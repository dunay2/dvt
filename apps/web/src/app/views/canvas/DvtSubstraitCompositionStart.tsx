/** Initialize a composition through the same canonical constructors as the workbench. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import type { Dispatch, SetStateAction } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { createSourceSet } from './canvasSourceSet';
import { resolveConnectedSetEntry } from './canvasConnectedRelationInputs';
import { DvtSubstraitCompositionStartSection } from './DvtSubstraitCompositionStartSection';
import type { CanvasRelationalPredicateSeed } from './canvasRelationalPredicateSeed';
import type { CanvasSetOperation } from './canvasRelationalOperationChoices';
import type { CanvasJoinOperation } from './canvasRelationalTreeJoinType';

export function DvtSubstraitCompositionStart({
  disabled,
  node,
  nodes,
  edges,
  predicateSeed,
  onClearPredicateSeed,
  onChange,
}: Readonly<{
  disabled: boolean;
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  predicateSeed?: CanvasRelationalPredicateSeed;
  onClearPredicateSeed?: () => void;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element | null {
  const inputs = resolveCanvasDvtCompositionInputs({ targetNodeId: node.id, nodes, edges });
  if (inputs.length < 2) return null;
  const entry = resolveConnectedSetEntry({ targetNode: node, nodes, edges });
  const apply = (document: SubstraitDocument, shape: CanvasJoinOperation | CanvasSetOperation) => {
    if (disabled) return;
    onChange((current) => ({
      ...current,
      dvt: {
        kind: 'transform',
        materialized: current.dvt?.kind === 'transform' ? current.dvt.materialized : 'view',
        mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
        shape,
        ...document,
      },
    }));
  };
  const startSet = (operation: CanvasSetOperation) =>
    entry == null ? undefined : () => apply(createSourceSet({ ...entry, operation }), operation);
  return (
    <DvtSubstraitCompositionStartSection
      disabled={disabled}
      inputs={inputs}
      predicateSeed={predicateSeed}
      onClearPredicateSeed={onClearPredicateSeed}
      onStartInnerJoin={apply}
      onStartUnionAll={startSet('union_all')}
      onStartUnionDistinct={startSet('union_distinct')}
      onStartIntersectDistinct={startSet('intersect_distinct')}
      onStartExceptDistinct={startSet('except_distinct')}
      onStartIntersectAll={startSet('intersect_all')}
      onStartExceptAll={startSet('except_all')}
    />
  );
}
