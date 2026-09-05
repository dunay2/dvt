import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { buildLineageWorkbenchState } from './lineageWorkbenchStateModel';

function buildCanonicalNode(overrides?: Partial<CanonicalNode>): CanonicalNode {
  return {
    id: 'model.fct_orders',
    name: 'fct_orders',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'success',
    tags: [],
    ...overrides,
  };
}

describe('lineageWorkbenchStateModel', () => {
  it('returns loading while the graph snapshot is still pending with no nodes', () => {
    expect(
      buildLineageWorkbenchState({
        canonicalNodes: [],
        focusNode: null,
        isLoadingSnapshot: true,
        snapshotError: null,
        snapshotErrorMessage: 'unused',
      })
    ).toEqual({ kind: 'loading' });
  });

  it('returns error when the graph snapshot fails before any nodes load', () => {
    expect(
      buildLineageWorkbenchState({
        canonicalNodes: [],
        focusNode: null,
        isLoadingSnapshot: false,
        snapshotError: new Error('Graph snapshot unavailable'),
        snapshotErrorMessage: 'Graph snapshot unavailable',
      })
    ).toEqual({
      kind: 'error',
      message: 'Graph snapshot unavailable',
    });
  });

  it('returns empty when no lineage focus is available', () => {
    expect(
      buildLineageWorkbenchState({
        canonicalNodes: [],
        focusNode: null,
        isLoadingSnapshot: false,
        snapshotError: null,
        snapshotErrorMessage: 'unused',
      })
    ).toEqual({ kind: 'empty' });
  });

  it('returns ready when a focus node exists', () => {
    expect(
      buildLineageWorkbenchState({
        canonicalNodes: [buildCanonicalNode()],
        focusNode: buildCanonicalNode(),
        isLoadingSnapshot: false,
        snapshotError: null,
        snapshotErrorMessage: 'unused',
      })
    ).toEqual({ kind: 'ready' });
  });
});
