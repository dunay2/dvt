/** Initialize a composition through the same canonical constructors as the workbench. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import type { Dispatch, SetStateAction } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { createSourceSet } from './canvasSourceSet';
import { createSourceCross } from './canvasSourceCross';
import type { CanvasPredicateFreeOperation } from './DvtRelationCompositionConfirmation';
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
  const apply = (
    document: SubstraitDocument,
    shape: CanvasJoinOperation | CanvasPredicateFreeOperation
  ) => {
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
      onStartWithoutPredicate={{
        cross_join: () => apply(createSourceCross(inputs), 'cross_join'),
        union_all: startSet('union_all'),
        union_distinct: startSet('union_distinct'),
        intersect_distinct: startSet('intersect_distinct'),
        except_distinct: startSet('except_distinct'),
        intersect_all: startSet('intersect_all'),
        except_all: startSet('except_all'),
      }}
    />
  );
}
