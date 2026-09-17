import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import {
  appendCanvasRelationalTreeJoinInput,
  createCanvasRelationalTreeInitialJoinDraft,
  createCanvasRelationalTreeUnionAllDraft,
  resolveCanvasRelationalTreeAuthoringCandidates,
  resolveCanvasRelationalTreeAuthoringChoices,
} from './canvasRelationalTreeAuthoringModel';
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';
import { inspectDvtSubstraitNInputJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { inspectDvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { inspectDvtSubstraitUnionAllDraft } from './canvasDvtSubstraitSetComposition';

const TARGET_ID = 'transform';

function source(
  id: string,
  fields: readonly Readonly<{ name: string; type: string }>[]
): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      schema: 'raw',
      tableName: id,
      columns: fields,
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: `raw.${id}`,
      },
    },
  };
}

const orders = source('orders', [
  { name: 'customer_id', type: 'string' },
  { name: 'value', type: 'string' },
]);
const customers = source('customers', [
  { name: 'customer_id', type: 'string' },
  { name: 'value', type: 'string' },
]);
const tickets = source('tickets', [
  { name: 'customer_id', type: 'string' },
  { name: 'value', type: 'string' },
]);
const incompatible = source('incompatible', [{ name: 'created_at', type: 'date' }]);
const transform: CanonicalNode = {
  id: TARGET_ID,
  name: 'Model',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {},
};
const sources = [orders, customers, tickets, incompatible];
const nodes = [...sources, transform];
const edges: CanonicalEdge[] = sources.map((node) => ({
  id: `${node.id}-${TARGET_ID}`,
  sourceId: node.id,
  targetId: TARGET_ID,
  relation: 'lineage',
}));
const inputs = resolveCanvasDvtCompositionInputs({ targetNodeId: TARGET_ID, nodes, edges });

describe('Canvas relational-tree guided authoring model', () => {
  it('derives unary or multi-input operations from the occupied semantic slots', () => {
    expect(
      resolveCanvasRelationalTreeAuthoringChoices({
        inputs,
        selectedInputIds: [orders.id],
        readOnly: false,
        targetNodeId: TARGET_ID,
        nodes,
        edges,
      }).map(({ operation, availability, selectable }) => ({
        operation,
        availability,
        selectable,
      }))
    ).toEqual([{ operation: 'projection', availability: 'available', selectable: true }]);

    expect(
      resolveCanvasRelationalTreeAuthoringChoices({
        inputs,
        selectedInputIds: [orders.id, customers.id],
        readOnly: false,
        targetNodeId: TARGET_ID,
        nodes,
        edges,
      }).map(({ operation, availability, selectable }) => ({
        operation,
        availability,
        selectable,
      }))
    ).toEqual([
      { operation: 'inner_join', availability: 'needs-predicate', selectable: true },
      { operation: 'union_all', availability: 'available', selectable: true },
    ]);
  });

  it('builds one canonical PROJECT from a single occupied slot', () => {
    const draft = createCanvasRelationalTreeProjectionDraft({
      input: inputs.find((input) => input.nodeId === orders.id)!,
      targetNodeId: TARGET_ID,
    });
    const inspection = inspectDvtSubstraitProjectionDraft(draft);
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.source.table).toBe('orders');
    expect(inspection.projection.outputs.map((output) => output.name)).toEqual([
      'customer_id',
      'value',
    ]);
  });

  it('keeps incompatible Sources visible with a reason', () => {
    expect(
      resolveCanvasRelationalTreeAuthoringCandidates({
        operation: 'inner_join',
        inputs,
        selectedInputIds: [orders.id],
        joinDraft: null,
        targetNodeId: TARGET_ID,
        nodes,
        edges,
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: customers.id, selectable: true, reason: null }),
        expect.objectContaining({
          nodeId: incompatible.id,
          selectable: false,
          reason: 'semantically-unavailable',
        }),
      ])
    );
  });

  it('builds an explicit left-deep N-input JOIN in selection order', () => {
    const initial = createCanvasRelationalTreeInitialJoinDraft({
      inputs,
      targetNodeId: TARGET_ID,
      leftInputId: orders.id,
      rightInputId: customers.id,
    });
    expect(initial).not.toBeNull();
    if (initial == null) return;
    const initialInspection = inspectDvtSubstraitNInputJoinDraft(initial);
    expect(initialInspection.ok).toBe(true);
    if (!initialInspection.ok) return;
    const leftField = initialInspection.projection.outputs[0];
    expect(leftField).toBeDefined();
    if (leftField == null) return;

    const draft = appendCanvasRelationalTreeJoinInput({
      draft: initial,
      input: inputs.find((input) => input.nodeId === tickets.id)!,
      leftSourceFieldId: leftField.source.fieldId,
      rightFieldName: 'customer_id',
    });
    const inspection = inspectDvtSubstraitNInputJoinDraft(draft);
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.inputs.map((input) => input.table)).toEqual([
      orders.id,
      customers.id,
      tickets.id,
    ]);
    expect(inspection.projection.joins).toHaveLength(2);
  });

  it('builds one N-ary UNION ALL in the explicit Source order', () => {
    const draft = createCanvasRelationalTreeUnionAllDraft({
      selectedInputIds: [tickets.id, customers.id, orders.id],
      targetNodeId: TARGET_ID,
      nodes,
      edges,
    });
    expect(draft).not.toBeNull();
    if (draft == null) return;
    const inspection = inspectDvtSubstraitUnionAllDraft(draft);
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.inputs.map((input) => input.table)).toEqual([
      tickets.id,
      customers.id,
      orders.id,
    ]);
  });
});
