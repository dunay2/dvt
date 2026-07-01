import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';

function buildCanonicalNode(): CanonicalNode {
  return {
    id: 'source-node',
    name: 'Raw orders',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {},
  };
}

describe('canvasNodeMapper', () => {
  it('projects localized Canvas port labels into React Flow node data', () => {
    const mappedNode = mapCanonicalNodeToCanvasNode({
      canonicalNode: buildCanonicalNode(),
      index: 0,
      showColumns: false,
      locale: 'es-ES',
    });

    expect(mappedNode.data.portLabels).toEqual({
      target: 'Conectar puerto de entrada',
      source: 'Conectar puerto de salida',
    });
  });
});
