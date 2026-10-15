import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildCanvasNodePresentationTruth } from './canvasNodePresentationTruth';
import {
  isCanvasNodePresentationTruth,
  type CanvasInputBindingPresentation,
  type CanvasInputBindingPosture,
  type CanvasNodePresentationTruth,
} from './canvasNodePresentationTruth.contract';

function inputPostureTruth(): CanvasNodePresentationTruth &
  Readonly<{ inputBindings: readonly [CanvasInputBindingPresentation] }> {
  return {
    columns: {
      state: 'unavailable',
      declared: [],
      inherited: [],
      visible: [],
      declaredCount: 0,
      inheritedCount: 0,
      visibleCount: 0,
      visibleProvenance: 'none',
    },
    code: { kind: 'unavailable' },
    relationalComposition: { state: 'incomplete', connectedInputCount: 1, missingInputCount: 1 },
    inputBindings: [
      {
        inputId: 'retained-input',
        source: { nodeId: 'producer', columnId: 'removed-field' },
        name: 'amount',
        type: 'unknown',
        state: 'unresolved',
      },
    ],
  };
}

describe('explicit Input presentation posture', () => {
  const postures = [
    'current',
    'repair-only',
    'unavailable',
  ] as const satisfies readonly CanvasInputBindingPosture[];
  it('exports only the documented presentation tags', () => {
    expect(postures).toEqual(['current', 'repair-only', 'unavailable']);
  });
  it.each([
    ['current', 'ready'],
    ['current', 'unconfigured'],
    ['unavailable', 'pending'],
    ['unavailable', 'unavailable'],
  ])('accepts coherent %s posture with %s columns', (inputBindingPosture, state) => {
    const truth = inputPostureTruth();
    expect(
      isCanvasNodePresentationTruth({
        ...truth,
        inputBindingPosture,
        columns: { ...truth.columns, state },
      })
    ).toBe(true);
  });

  it('accepts admitted target-only recovery without interpreting diagnostic prose', () => {
    const truth = inputPostureTruth();
    expect(
      isCanvasNodePresentationTruth({
        ...truth,
        inputBindingPosture: 'repair-only',
        columns: { ...truth.columns, diagnostic: 'Any locale or explanatory copy' },
      })
    ).toBe(true);
  });

  it.each(['ready', 'repair_only', '', null, false, 1, {}, []])(
    'rejects invalid posture %j',
    (inputBindingPosture) => {
      expect(isCanvasNodePresentationTruth({ ...inputPostureTruth(), inputBindingPosture })).toBe(
        false
      );
    }
  );

  it.each(['pending', 'unavailable', undefined, 'unknown'])(
    'rejects current Input posture with %s columns',
    (state) => {
      const truth = inputPostureTruth();
      expect(
        isCanvasNodePresentationTruth({
          ...truth,
          inputBindingPosture: 'current',
          columns: { ...truth.columns, state },
        })
      ).toBe(false);
    }
  );

  it.each(['ready', 'unconfigured', undefined])(
    'rejects unavailable Input posture with %s columns',
    (state) => {
      const truth = inputPostureTruth();
      expect(
        isCanvasNodePresentationTruth({
          ...truth,
          inputBindingPosture: 'unavailable',
          columns: { ...truth.columns, state },
        })
      ).toBe(false);
    }
  );

  it.each(['ready', 'pending', 'unconfigured'])(
    'rejects repair-only with %s Output columns',
    (state) => {
      const truth = inputPostureTruth();
      expect(
        isCanvasNodePresentationTruth({
          ...truth,
          inputBindingPosture: 'repair-only',
          columns: { ...truth.columns, state },
        })
      ).toBe(false);
    }
  );

  it.each([
    undefined,
    null,
    { state: 'canonical', connectedInputCount: 1 },
    { state: 'pending', connectedInputCount: 1 },
  ])('rejects repair-only without incomplete composition %j', (relationalComposition) => {
    expect(
      isCanvasNodePresentationTruth({
        ...inputPostureTruth(),
        inputBindingPosture: 'repair-only',
        relationalComposition,
      })
    ).toBe(false);
  });

  it.each([
    undefined,
    [],
    [
      {
        inputId: 'current',
        source: { nodeId: 'producer', columnId: 'available' },
        name: 'amount',
        type: 'text',
        state: 'available',
      },
    ],
  ])('rejects repair-only without a retained unresolved Input %j', (inputBindings) => {
    expect(
      isCanvasNodePresentationTruth({
        ...inputPostureTruth(),
        inputBindingPosture: 'repair-only',
        inputBindings,
      })
    ).toBe(false);
  });

  it.each([
    { inputId: 1 },
    { inputId: '' },
    { source: null },
    { source: { nodeId: '', columnId: 'removed' } },
    { source: { nodeId: 'producer' } },
    { name: null },
    { type: 1 },
    { state: 'pending' },
  ])('rejects malformed repair Input %j', (invalid) => {
    const truth = inputPostureTruth();
    expect(
      isCanvasNodePresentationTruth({
        ...truth,
        inputBindingPosture: 'repair-only',
        inputBindings: [{ ...truth.inputBindings[0], ...invalid }],
      })
    ).toBe(false);
  });

  it('rejects a malformed second Input even when one unresolved slot is valid', () => {
    const truth = inputPostureTruth();
    expect(
      isCanvasNodePresentationTruth({
        ...truth,
        inputBindingPosture: 'repair-only',
        inputBindings: [...truth.inputBindings, { state: 'unresolved' }],
      })
    ).toBe(false);
  });

  it.each([
    ['current', 'ready'],
    ['unavailable', 'unavailable'],
  ])('rejects malformed Input data under %s posture', (inputBindingPosture, state) => {
    const truth = inputPostureTruth();
    expect(
      isCanvasNodePresentationTruth({
        ...truth,
        inputBindingPosture,
        columns: { ...truth.columns, state },
        inputBindings: [{ state: 'unresolved' }],
      })
    ).toBe(false);
  });

  it.each(['dvt', 'dbt'])('preserves legacy %s presentation without a posture', (pluginId) => {
    const node = buildNode({ pluginId, role: 'input', kind: `${pluginId}:source` });
    const truth = buildCanvasNodePresentationTruth({ node, nodes: [node], edges: [] });
    expect(isCanvasNodePresentationTruth(truth)).toBe(true);
  });
});

function buildNode(overrides: Partial<CanonicalNode> = {}): CanonicalNode {
  return {
    id: 'model.orders',
    name: 'Orders',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    ...overrides,
  };
}

const SOURCE = buildNode({
  id: 'source.orders',
  name: 'Raw orders',
  kind: 'dvt:source',
  role: 'input',
  path: 'models/sources.yml',
  metadata: {
    columns: [
      { name: 'order_id', type: 'integer', nullable: false, primaryKey: true },
      { name: 'customer_id', type: 'integer' },
      { name: 'amount', type: 'numeric' },
    ],
  },
});

const EDGE: CanonicalEdge = {
  id: 'source.orders->model.orders',
  sourceId: SOURCE.id,
  targetId: 'model.orders',
  relation: 'lineage',
};

describe('buildCanvasNodePresentationTruth', () => {
  it('keeps inherited columns distinct while exposing one shared visible count', () => {
    const model = buildNode({ path: 'models/orders.sql' });

    const truth = buildCanvasNodePresentationTruth({
      node: model,
      nodes: [SOURCE, model],
      edges: [EDGE],
    });

    expect(truth.columns).toMatchObject({
      declaredCount: 0,
      inheritedCount: 3,
      visibleCount: 3,
      visibleProvenance: 'inherited',
    });
    expect(truth.columns.visible.map((column) => column.name)).toEqual([
      'order_id',
      'customer_id',
      'amount',
    ]);
    expect(truth.columns.visible[0]).toMatchObject({ nullable: false, primaryKey: true });
  });

  it('preserves declared columns as authoritative without hiding inherited context', () => {
    const model = buildNode({
      metadata: {
        columns: [
          { name: 'order_id', dataType: 'bigint' },
          { name: 'gross_amount', type: 'numeric' },
        ],
      },
    });

    const truth = buildCanvasNodePresentationTruth({
      node: model,
      nodes: [SOURCE, model],
      edges: [EDGE],
    });

    expect(truth.columns).toMatchObject({
      declaredCount: 2,
      inheritedCount: 3,
      visibleCount: 2,
      visibleProvenance: 'declared',
    });
    expect(truth.columns.visible.map((column) => column.name)).toEqual([
      'order_id',
      'gross_amount',
    ]);
  });

  it('reports a workspace file as code authority instead of claiming code is missing', () => {
    const model = buildNode({ path: 'models/orders.sql' });

    expect(
      buildCanvasNodePresentationTruth({ node: model, nodes: [model], edges: [] }).code
    ).toEqual({
      kind: 'workspace-file',
      path: 'models/orders.sql',
      language: 'sql',
    });
  });

  it('prefers canonical workspace-file identity over duplicated graph SQL metadata', () => {
    const model = buildNode({
      path: 'models/orders.sql',
      metadata: {
        sql: 'select * from stale_orders',
        config: { sql: 'select * from raw_orders' },
      },
    });

    expect(
      buildCanvasNodePresentationTruth({ node: model, nodes: [model], edges: [] }).code
    ).toEqual({
      kind: 'workspace-file',
      path: 'models/orders.sql',
      language: 'sql',
    });
  });

  it('exposes generated code with provenance when no inline or workspace authority exists', () => {
    const model = buildNode();

    expect(
      buildCanvasNodePresentationTruth({
        node: model,
        nodes: [model],
        edges: [],
        generatedCode: {
          content: "select *\nfrom {{ ref('raw_orders') }}",
          path: 'models/orders.sql',
          language: 'sql',
        },
      }).code
    ).toEqual({
      kind: 'generated',
      content: "select *\nfrom {{ ref('raw_orders') }}",
      path: 'models/orders.sql',
      language: 'sql',
    });
  });
});
