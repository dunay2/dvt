import { describe, expect, it } from 'vitest';

import { derivePlannerGraphSourceFromManifest, PlannerErrorCode } from '../../src/index.js';

const BASE_MANIFEST = {
  nodes: {
    'model.analytics.orders': {
      resource_type: 'model',
      depends_on: { nodes: [] },
    },
    'test.analytics.orders_not_null': {
      resource_type: 'test',
      depends_on: { nodes: ['model.analytics.orders'] },
    },
  },
};

describe('derivePlannerGraphSourceFromManifest', () => {
  it('derives a typed graph source from a dbt manifest payload', () => {
    expect(derivePlannerGraphSourceFromManifest(BASE_MANIFEST)).toEqual({
      kind: 'generic-graph-v1',
      sourceFamily: 'dbt',
      sourceVersion: '1.0',
      nodes: [
        {
          nodeId: 'model.analytics.orders',
          stepKind: 'DBT_MODEL',
          dependsOn: [],
        },
        {
          nodeId: 'test.analytics.orders_not_null',
          stepKind: 'DBT_TEST',
          dependsOn: ['model.analytics.orders'],
        },
      ],
    });
  });

  it('sorts manifest node ids with binary comparison for deterministic graph source output', () => {
    expect(
      derivePlannerGraphSourceFromManifest({
        nodes: {
          'model.analytics.orders': {
            resource_type: 'model',
            depends_on: { nodes: [] },
          },
          'model.analytics.order_items': {
            resource_type: 'model',
            depends_on: { nodes: [] },
          },
        },
      })
    ).toEqual({
      kind: 'generic-graph-v1',
      sourceFamily: 'dbt',
      sourceVersion: '1.0',
      nodes: [
        {
          nodeId: 'model.analytics.order_items',
          stepKind: 'DBT_MODEL',
          dependsOn: [],
        },
        {
          nodeId: 'model.analytics.orders',
          stepKind: 'DBT_MODEL',
          dependsOn: [],
        },
      ],
    });
  });

  it('preserves current invalid-input semantics for unsupported manifests', () => {
    expectInvalidInput(
      () => derivePlannerGraphSourceFromManifest({ nodes: {} }),
      'manifest.nodes does not contain supported dbt resources'
    );
  });
});

function expectInvalidInput(fn: () => unknown, messageFragment: string): void {
  try {
    fn();
    throw new Error('expected derivePlannerGraphSourceFromManifest to reject');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error & { code?: string }).code).toBe(PlannerErrorCode.INVALID_INPUT);
    expect((error as Error).message).toContain(messageFragment);
  }
}
