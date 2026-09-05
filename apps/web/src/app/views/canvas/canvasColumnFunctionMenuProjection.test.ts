import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { projectCanvasColumnFunctionMenus } from './canvasColumnFunctionMenuProjection';

function node(
  kind: CanonicalNode['kind'],
  pluginId: string,
  role: CanonicalNode['role']
): CanonicalNode {
  return { id: kind, name: kind, kind, pluginId, role, status: 'idle', tags: [] };
}

describe('Canvas column function menu projection', () => {
  it.each([
    node('dvt:source', 'dvt.warehouse-source', 'input'),
    node('dvt:source', 'dbt', 'input'),
    node('dvt:transform', 'dbt', 'transform'),
  ])('withholds Transform functions from $kind authority', (candidate) => {
    expect(
      projectCanvasColumnFunctionMenus({ node: candidate, nodes: [candidate], edges: [] })
    ).toEqual({
      hasEditableProjection: false,
      supportsCalculatedColumns: false,
    });
  });
});
