import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { buildGraphNodeCardReadModel } from './graphNodeCardReadModel';
import { sharedSourceModelGraphNodeCardStrategy } from './sharedSourceModelGraphNodeCardStrategy';

const TRANSFORM: CanonicalNode = {
  id: 'transform-composition',
  name: 'Composition',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};

const EMPTY_COLUMN_TRUTH = {
  declared: [],
  inherited: [],
  visible: [],
  declaredCount: 0,
  inheritedCount: 0,
  visibleCount: 0,
  visibleProvenance: 'inherited' as const,
};

describe('shared Source/Model relational-composition presentation', () => {
  it('does not duplicate the pending composition label owned by the converged edges', () => {
    const model = buildGraphNodeCardReadModel(
      TRANSFORM,
      {
        presentationTruth: {
          columns: EMPTY_COLUMN_TRUTH,
          code: { kind: 'unavailable' },
          relationalComposition: {
            state: 'pending',
            connectedInputCount: 2,
            pendingInputCount: 1,
          },
        },
      },
      [sharedSourceModelGraphNodeCardStrategy]
    );

    expect(model.kindLabel).toBeNull();
  });

  it('shows the fail-closed reconnect intent', () => {
    const model = buildGraphNodeCardReadModel(
      TRANSFORM,
      {
        presentationTruth: {
          columns: EMPTY_COLUMN_TRUTH,
          code: { kind: 'unavailable' },
          relationalComposition: {
            state: 'incomplete',
            connectedInputCount: 1,
            missingInputCount: 1,
          },
        },
      },
      [sharedSourceModelGraphNodeCardStrategy]
    );

    expect(model.kindLabel).toBe('RECONNECT INPUT');
  });
});
