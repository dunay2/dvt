import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitColumnFunctions,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectCanvasRelationalTree } from './canvasRelationalTreeProjection';
import { projectCanvasRelationalTreeSemanticZoom } from './canvasRelationalTreeSemanticZoom';

const source: CanonicalNode = {
  id: 'customers',
  name: 'Customers',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    schema: 'public',
    tableName: 'customers',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgres-main',
        provider: 'postgres',
      },
      sourceObjectId: 'public.customers',
    },
    columns: [
      { name: 'customer_code', type: 'text' },
      { name: 'country', type: 'text' },
    ],
  },
};

const edge: CanonicalEdge = {
  id: 'customers-transform',
  sourceId: source.id,
  targetId: 'transform-customers',
  relation: 'lineage',
};

function baseDraft(): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'public',
      table: 'customers',
      sourceRef: source.metadata?.connectedSourceRef as never,
      fields: [
        { name: 'customer_code', dataType: 'text' },
        { name: 'country', dataType: 'text' },
      ],
    },
    targetNodeId: 'transform-customers',
    outputs: [
      {
        fieldId: 'output:customer_code',
        name: 'customer_code',
        sourceFieldName: 'customer_code',
      },
      { fieldId: 'output:country', name: 'country', sourceFieldName: 'country' },
    ],
  });
}

function transform(draft: DvtSubstraitProjectionDraft): CanonicalNode {
  return applyDvtSubstraitSemanticDocument(
    {
      id: 'transform-customers',
      name: 'Customer normalization',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    },
    encodeDvtSubstraitProjectionDocument(draft)
  );
}

function project(draft: DvtSubstraitProjectionDraft) {
  const node = transform(draft);
  const result = projectCanvasRelationalTree({
    node,
    nodes: [source, node],
    edges: [edge],
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected a relational-tree projection.');
  return { node, projection: result.projection };
}

describe('Canvas relational Expression/Derive stage projection', () => {
  it('keeps a direct ProjectRel as projection with only passthrough outputs', () => {
    const { projection } = project(baseDraft());

    expect(projection.root.operator).toBe('project');
    expect(projection.root.projectionSummary).toEqual({
      derivedFieldCount: 0,
      passthroughFieldCount: 2,
    });
  });

  it('derives stage counts from emitted ProjectRel outputs, not from UI state', () => {
    const upper = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'upper');
    if (upper == null) throw new Error('Expected admitted UPPER capability.');

    const result = createDvtSubstraitProjectionOutput(
      baseDraft(),
      {
        alias: 'customer_code_norm',
        expression: {
          kind: 'scalar-function',
          operandFieldIds: ['output:customer_code'],
          capabilityId: upper.capabilityId,
        },
      },
      { inputDataTypes: ['text'], provider: 'postgres' }
    );
    if (result.outcome !== 'applied') throw new Error(result.reason);

    const { projection } = project(result.draft);
    expect(projection.root.projectionSummary).toEqual({
      derivedFieldCount: 1,
      passthroughFieldCount: 2,
    });
    expect(projection.root.expressionRefs).toEqual([
      { slot: 'project-expression', ordinal: 0 },
    ]);
  });

  it('reuses the canonical scalar graph as semantic zoom for a derived ProjectRel', () => {
    const upper = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'upper');
    if (upper == null) throw new Error('Expected admitted UPPER capability.');

    const result = createDvtSubstraitProjectionOutput(
      baseDraft(),
      {
        alias: 'customer_code_norm',
        expression: {
          kind: 'scalar-function',
          operandFieldIds: ['output:customer_code'],
          capabilityId: upper.capabilityId,
        },
      },
      { inputDataTypes: ['text'], provider: 'postgres' }
    );
    if (result.outcome !== 'applied') throw new Error(result.reason);

    const { node, projection } = project(result.draft);
    const detail = projectCanvasRelationalTreeSemanticZoom(projection.root, {
      transformNode: node,
    });
    const graph = detail.graphs.get(projection.root.locator);

    expect(graph).toBeDefined();
    expect(graph?.nodes.some((entry) => entry.data.label.startsWith('UPPER'))).toBe(true);
    expect(graph?.nodes.some((entry) => entry.data.semanticKind === 'field')).toBe(true);
    expect(detail.sizes.has(projection.root.locator)).toBe(true);
  });
});
