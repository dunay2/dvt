/** Owned concern: project canonical relational semantics into the editable node draft. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

export function createCanvasRelationalTreeNodeDraft(
  node: CanonicalNode,
  shape: CanvasRelationalOperation | null,
  semantic: Pick<SubstraitDocument, 'plan' | 'sidecar'> | null
): CanvasInspectorNodeDraft {
  const draft = createCanvasInspectorNodeDraft(node);
  const disposition =
    draft.dvt?.kind === 'transform'
      ? draft.dvt
      : { kind: 'transform' as const, mode: 'uninitialized' as const, materialized: 'view' };
  const common = {
    kind: 'transform' as const,
    materialized: disposition.materialized,
    ...(disposition.resultTarget === undefined ? {} : { resultTarget: disposition.resultTarget }),
  };
  if (semantic == null) return { ...draft, dvt: { ...common, mode: 'uninitialized' } };
  if (shape == null) throw new Error('A configured relation requires its presentation operation.');
  return {
    ...draft,
    dvt: {
      ...common,
      mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
      shape,
      plan: semantic.plan,
      sidecar: semantic.sidecar,
    },
  };
}
