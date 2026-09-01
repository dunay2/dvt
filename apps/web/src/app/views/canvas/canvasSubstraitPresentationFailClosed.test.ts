import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitPilotDraft,
  encodeDvtSubstraitPilotDocument,
} from './canvasDvtSubstraitPilot';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

function sourceNode(): CanonicalNode {
  return {
    id: 'source-customers',
    name: 'customers',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['authoring'],
    metadata: {
      columns: [
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'country', type: 'string' },
      ],
    },
  };
}

function transformNode(): CanonicalNode {
  return {
    id: 'transform-customers',
    name: 'Customers',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata: {},
  };
}

describe('Substrait card presentation fail-closed behavior', () => {
  it('does not present inherited columns when persisted Substrait authority is outside the pilot', () => {
    const draft = createDvtSubstraitPilotDraft({
      sourceNodeId: 'source-customers',
      targetNodeId: 'transform-customers',
    });
    draft.plan.relations = [];
    const node = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitPilotDocument(draft)
    );
    const source = sourceNode();

    const presentation = projectCanvasNodePresentationTruth({
      node,
      nodes: [source, node],
      edges: [{ sourceId: source.id, targetId: node.id }],
    });

    expect(presentation.columns).toMatchObject({
      declared: [],
      inherited: [],
      visible: [],
      declaredCount: 0,
      inheritedCount: 0,
      visibleCount: 0,
      visibleProvenance: 'none',
    });
  });
});
