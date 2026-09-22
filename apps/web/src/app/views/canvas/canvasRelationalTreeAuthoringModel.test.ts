import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import {
  appendCanvasRelationalTreeJoinInput,
  createCanvasRelationalTreeInitialJoinDraft,
  resolveCanvasRelationalTreeAuthoringChoices,
} from './canvasRelationalTreeAuthoringModel';
import { resolveCanvasRelationalTreeAuthoringCandidates } from './canvasRelationalTreeAuthoringCandidates';
import {
  createCanvasRelationalTreeSetDraft,
  createCanvasRelationalTreeUnionAllDraft,
} from './canvasRelationalTreeUnionAuthoring';
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';
import { inspectDvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { inspectDvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { inspectDvtSubstraitUnionAllDraft } from './canvasDvtSubstraitSetComposition';
import { createDvtSubstraitCrossDraft } from './canvasDvtSubstraitCrossComposition';
import { inspectDvtSubstraitCrossDraft } from '@dvt/postgres-projection';
import { resolveCanvasRelationalTreeOperationTransition } from './canvasRelationalTreeOperationTransition';

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
  it('rebuilds a projection as a JOIN instead of trying to mutate the projection as a JOIN', () => {
    const projection = createCanvasRelationalTreeProjectionDraft({
      input: inputs.find((input) => input.nodeId === orders.id)!,
      targetNodeId: TARGET_ID,
    });

    const transition = resolveCanvasRelationalTreeOperationTransition({
      operation: 'inner_join',
      inputs,
      selectedInputIds: [orders.id, customers.id],
      targetNodeId: TARGET_ID,
      draft: projection,
      appendInputId: null,
    });

    expect(transition).not.toBeNull();
    expect(inspectDvtSubstraitJoinDraft(transition!.draft).ok).toBe(true);
  });

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
    ).toEqual([
      { operation: 'projection', availability: 'available', selectable: true },
      { operation: 'inner_join', availability: 'needs-input', selectable: false },
      { operation: 'left_join', availability: 'needs-input', selectable: false },
      { operation: 'right_join', availability: 'needs-input', selectable: false },
      { operation: 'full_outer_join', availability: 'needs-input', selectable: false },
      { operation: 'left_semi_join', availability: 'needs-input', selectable: false },
      { operation: 'left_anti_join', availability: 'needs-input', selectable: false },
      { operation: 'right_semi_join', availability: 'needs-input', selectable: false },
      { operation: 'right_anti_join', availability: 'needs-input', selectable: false },
      { operation: 'cross_join', availability: 'needs-input', selectable: false },
      { operation: 'union_all', availability: 'needs-input', selectable: false },
      { operation: 'union_distinct', availability: 'needs-input', selectable: false },
      { operation: 'intersect_distinct', availability: 'needs-input', selectable: false },
      { operation: 'except_distinct', availability: 'needs-input', selectable: false },
      { operation: 'intersect_all', availability: 'needs-input', selectable: false },
      { operation: 'except_all', availability: 'needs-input', selectable: false },
    ]);

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
      { operation: 'left_join', availability: 'needs-predicate', selectable: true },
      { operation: 'right_join', availability: 'needs-predicate', selectable: true },
      { operation: 'full_outer_join', availability: 'needs-predicate', selectable: true },
      { operation: 'left_semi_join', availability: 'needs-predicate', selectable: true },
      { operation: 'left_anti_join', availability: 'needs-predicate', selectable: true },
      { operation: 'right_semi_join', availability: 'needs-predicate', selectable: true },
      { operation: 'right_anti_join', availability: 'needs-predicate', selectable: true },
      { operation: 'cross_join', availability: 'available', selectable: true },
      { operation: 'union_all', availability: 'available', selectable: true },
      { operation: 'union_distinct', availability: 'available', selectable: true },
      { operation: 'intersect_distinct', availability: 'available', selectable: true },
      { operation: 'except_distinct', availability: 'available', selectable: true },
      { operation: 'intersect_all', availability: 'available', selectable: true },
      { operation: 'except_all', availability: 'available', selectable: true },
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

  it.each(['projection', 'inner_join'] as const)(
    'keeps incompatible Sources unavailable in %s',
    (operation) => {
      expect(
        resolveCanvasRelationalTreeAuthoringCandidates({
          operation,
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
    }
  );

  it('keeps every unary and binary choice disabled for read-only authoring', () => {
    const choices = resolveCanvasRelationalTreeAuthoringChoices({
      inputs,
      selectedInputIds: [orders.id],
      readOnly: true,
      targetNodeId: TARGET_ID,
      nodes,
      edges,
    });
    expect(choices).toHaveLength(16);
    expect(
      choices.every((choice) => !choice.selectable && choice.availability === 'read-only')
    ).toBe(true);
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
    const initialInspection = inspectDvtSubstraitJoinDraft(initial);
    expect(initialInspection.ok).toBe(true);
    if (!initialInspection.ok) return;
    const initialResultRelationId = initialInspection.projection.joinRelations.at(-1)?.relationId;
    const initialOutputIds = new Map(
      initialInspection.projection.outputs.map((output) => [output.name, output.fieldId] as const)
    );
    const leftField = initialInspection.projection.outputs[0];
    expect(leftField).toBeDefined();
    if (leftField == null) return;

    const draft = appendCanvasRelationalTreeJoinInput({
      draft: initial,
      input: inputs.find((input) => input.nodeId === tickets.id)!,
      leftSourceFieldId: leftField.source.fieldId,
      rightFieldName: 'customer_id',
    });
    const inspection = inspectDvtSubstraitJoinDraft(draft);
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.inputs.map((input) => input.table)).toEqual([
      orders.id,
      customers.id,
      tickets.id,
    ]);
    expect(inspection.projection.joins).toHaveLength(2);
    expect(inspection.projection.inputs.slice(0, 2).map((input) => input.relationId)).toEqual(
      initialInspection.projection.inputs.map((input) => input.relationId)
    );
    expect(inspection.projection.joinRelations.at(-1)?.relationId).toBe(initialResultRelationId);
    initialOutputIds.forEach((fieldId, name) => {
      expect(inspection.projection.outputs.find((output) => output.name === name)?.fieldId).toBe(
        fieldId
      );
    });
    const appendedCondition = inspection.projection.joins[1]?.conditions[0];
    if (appendedCondition == null || appendedCondition.kind === 'group') return;
    expect(appendedCondition.left).toMatchObject({
      kind: 'field',
      sourceFieldId: leftField.source.fieldId,
    });
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

  it('builds an explicit left-associated CrossRel without predicates or field matching', () => {
    const draft = createDvtSubstraitCrossDraft({
      inputs: [orders, customers, tickets].map((source) =>
        inputs.find((input) => input.nodeId === source.id)!
      ),
    });
    const inspection = inspectDvtSubstraitCrossDraft(draft);
    expect(inspection).toMatchObject({
      ok: true,
      projection: {
        inputs: [{ table: 'orders' }, { table: 'customers' }, { table: 'tickets' }],
        crossRelations: [{}, {}],
      },
    });
    const root = draft.plan.relations[0]?.relType;
    expect(root?.case === 'root' ? root.value.input?.relType.case : null).toBe('cross');
  });

  it.each([
    'union_distinct',
    'intersect_distinct',
    'except_distinct',
    'intersect_all',
    'except_all',
  ] as const)('builds %s through the same ordered N-ary Set path', (operation) => {
    const draft = createCanvasRelationalTreeSetDraft(
      {
        selectedInputIds: [tickets.id, customers.id, orders.id],
        targetNodeId: TARGET_ID,
        nodes,
        edges,
      },
      operation
    );
    expect(draft).not.toBeNull();
    if (draft == null) return;
    const inspection = inspectDvtSubstraitUnionAllDraft(draft);
    expect(inspection).toMatchObject({
      ok: true,
      projection: {
        operation,
        inputs: [{ table: tickets.id }, { table: customers.id }, { table: orders.id }],
      },
    });
  });
});
