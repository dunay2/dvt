import { describe, expect, it } from 'vitest';

import {
  addDvtSubstraitJoinPredicateCondition,
  decodeDvtSubstraitInnerJoinDocument,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
  setDvtSubstraitJoinConnectionFieldSelected,
} from '../views/canvas/canvasDvtSubstraitJoinComposition';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from '../views/canvas/canvasDvtTransformAuthoringAuthority';
import clientFixture from './fixtures/client.json';
import orderDetailsFixture from './fixtures/order-details.json';
import ordersFixture from './fixtures/orders.json';
import {
  SEMANTIC_WORKBENCH_EDGE,
  SEMANTIC_WORKBENCH_SOURCE,
  SEMANTIC_WORKBENCH_TRANSFORM,
  buildSemanticWorkbenchFixture,
} from './semanticWorkbenchFixture';
import { loadSemanticWorkbenchDataset } from './semanticWorkbenchDataset';
import { projectSemanticWorkbenchGraph } from './semanticWorkbenchProjection';

describe('semanticWorkbenchFixture', () => {
  it('derives all three canonical source cards from the JSON dataset schemas', () => {
    const datasets = [
      loadSemanticWorkbenchDataset(ordersFixture),
      loadSemanticWorkbenchDataset(clientFixture),
      loadSemanticWorkbenchDataset(orderDetailsFixture),
    ];
    expect(SEMANTIC_WORKBENCH_SOURCE.map((source) => source.name)).toEqual([
      'Orders',
      'Client',
      'Order Details',
    ]);
    expect(SEMANTIC_WORKBENCH_SOURCE.map((source) => source.metadata?.columns)).toEqual(
      datasets.map((dataset) => dataset.columns)
    );
    expect(SEMANTIC_WORKBENCH_SOURCE.map((source) => source.metadata?.sampleRows)).toEqual(
      datasets.map((dataset) => dataset.rows)
    );
    expect(SEMANTIC_WORKBENCH_EDGE.map((edge) => edge.sourceId)).toEqual([
      'lab-source-orders',
      'lab-source-client',
      'lab-source-order_details',
    ]);
    expect(
      SEMANTIC_WORKBENCH_SOURCE.map(
        (source) =>
          (source.metadata?.sourceMetricEvidence as { rowCount: { value: number } }).rowCount.value
      )
    ).toEqual([8, 5, 10]);
  });

  it('projects each real predicate inside its closed JOIN card', () => {
    const graph = projectSemanticWorkbenchGraph(SEMANTIC_WORKBENCH_TRANSFORM);
    const labels = graph.nodes.map((node) => node.data.label);

    expect(labels).toEqual(
      expect.arrayContaining([
        'FUENTES',
        'TRANSFORMACIÓN',
        'SOURCE\nraw.orders',
        'SOURCE\nraw.client',
        'SOURCE\nraw.order_details',
        'JOIN\nJoinRel\nraw.orders.client_id = raw.client.client_id',
        'JOIN\nJoinRel\nraw.orders.order_id = raw.order_details.order_id',
      ])
    );
    const joinNode = graph.nodes.find((node) => node.id === graph.relationId);
    expect(joinNode?.data.expression).toBe('raw.orders.order_id = raw.order_details.order_id');
    expect(
      graph.nodes
        .filter((node) => node.data.semanticKind === 'relation')
        .map((node) => node.data.expression)
    ).toEqual(
      expect.arrayContaining([
        'raw.orders.client_id = raw.client.client_id',
        'raw.orders.order_id = raw.order_details.order_id',
      ])
    );
    expect(joinNode?.data.inputSummary).toBe('3 fuentes');
    expect(joinNode?.data.outputSummary).toBe('22 columnas');
    expect(graph.expressionCount).toBe(2);
    expect(graph.nodes.some((node) => node.data.semanticGroup === 'condition')).toBe(false);
    expect(new Set(graph.edges.map((edge) => edge.data?.semanticEdgeKind))).toEqual(
      new Set(['relation'])
    );
  });

  it('groups nodes for shared movement and stacks the JOIN chain in execution order', () => {
    const graph = projectSemanticWorkbenchGraph(SEMANTIC_WORKBENCH_TRANSFORM);
    const groups = graph.nodes.filter((node) => node.data.semanticKind === 'group');
    const members = graph.nodes.filter((node) => node.data.semanticKind !== 'group');

    expect(groups).toHaveLength(2);
    expect(groups.every((node) => node.draggable === true)).toBe(true);
    expect(
      members.every(
        (node) =>
          node.draggable === false &&
          node.extent === 'parent' &&
          node.parentId === `semantic-group-${node.data.semanticGroup}`
      )
    ).toBe(true);

    const firstJoin = members.find(
      (node) =>
        node.data.semanticKind === 'relation' &&
        node.data.expression === 'raw.orders.client_id = raw.client.client_id'
    );
    const secondJoin = members.find(
      (node) =>
        node.data.semanticKind === 'relation' &&
        node.data.expression === 'raw.orders.order_id = raw.order_details.order_id'
    );
    if (firstJoin == null || secondJoin == null) {
      throw new Error('Expected both closed JOIN stages.');
    }
    expect(firstJoin.position.x).toBe(secondJoin.position.x);
    expect(firstJoin.position.y).toBeLessThan(secondJoin.position.y);
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: firstJoin.id, target: secondJoin.id }),
      ])
    );

    const nodeById = new Map(graph.nodes.map((node) => [node.id, node] as const));
    const lanesByTransition = new Map<string, number[]>();
    graph.edges.forEach((edge) => {
      const sourceGroup = nodeById.get(edge.source)?.data.semanticGroup;
      const targetGroup = nodeById.get(edge.target)?.data.semanticGroup;
      const kind = edge.data?.semanticEdgeKind;
      const stepPosition = edge.pathOptions?.stepPosition;
      if (sourceGroup == null || targetGroup == null || kind == null || stepPosition == null) {
        throw new Error('Expected every semantic edge to have a deterministic routing lane.');
      }
      const key = `${kind}:${sourceGroup}->${targetGroup}`;
      lanesByTransition.set(key, [...(lanesByTransition.get(key) ?? []), stepPosition]);
    });
    expect(
      [...lanesByTransition.values()]
        .filter((lanes) => lanes.length > 1)
        .every((lanes) => new Set(lanes).size === lanes.length)
    ).toBe(true);
  });

  it('uses the admitted N-input Substrait join as transform authority', () => {
    const authority = readDvtTransformAuthoringAuthority(SEMANTIC_WORKBENCH_TRANSFORM);
    expect(authority?.mode).toBe('substrait');
    if (authority == null) throw new Error('Expected Substrait authority.');

    const inspection = inspectDvtSubstraitNInputJoinDraft(
      decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument)
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) throw new Error('Expected an accepted join.');
    expect(inspection.projection.inputs.map((input) => input.table)).toEqual([
      'orders',
      'client',
      'order_details',
    ]);
    expect(inspection.projection.joins).toHaveLength(2);
    expect(
      Object.fromEntries(
        inspection.projection.inputs.flatMap((input) =>
          input.fields.map((field) => [input.table + '.' + field.name, field.dataType])
        )
      )
    ).toMatchObject({
      'orders.order_id': 'string',
      'orders.amount': 'fp64',
      'orders.priority': 'bool',
      'orders.ordered_at': 'precisionTimestampTz',
      'client.lifetime_value': 'fp64',
      'client.active': 'bool',
      'client.signup_at': 'precisionTimestampTz',
      'order_details.quantity': 'i64',
      'order_details.unit_price': 'fp64',
      'order_details.gift': 'bool',
      'order_details.added_at': 'precisionTimestampTz',
    });
  });

  it('projects the Transform sample from the real join and its selected outputs', () => {
    const fixture = buildSemanticWorkbenchFixture();
    const authority = readDvtTransformAuthoringAuthority(fixture.transform);
    if (authority == null) throw new Error('Expected Substrait authority.');
    const draft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
    const ordersEdge = fixture.edges[0];
    const orderDetailsEdge = fixture.edges[2];
    if (ordersEdge == null || orderDetailsEdge == null) {
      throw new Error('Expected the Orders and Order Details connections.');
    }
    const selectedDraft = setDvtSubstraitJoinConnectionFieldSelected({
      draft: setDvtSubstraitJoinConnectionFieldSelected({
        draft,
        sourceNode: fixture.sources[2],
        targetNode: fixture.transform,
        edge: orderDetailsEdge,
        columnName: 'gift',
        selected: false,
      }),
      sourceNode: fixture.sources[0],
      targetNode: fixture.transform,
      edge: ordersEdge,
      columnName: 'discount',
      selected: false,
    });
    const selectedTransform = applyDvtSubstraitSemanticDocument(
      fixture.transform,
      encodeDvtSubstraitInnerJoinDocument(selectedDraft)
    );

    const sample = fixture.projectTransformSample(selectedTransform);
    expect(sample?.rows).toHaveLength(10);
    expect(sample?.columns.map((column) => column.name)).not.toContain('discount');
    expect(sample?.columns.map((column) => column.name)).not.toContain('gift');
    expect(sample?.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        'order_id',
        'client_client_id',
        'client_name',
        'order_detail_id',
        'order_details_order_id',
      ])
    );
    const firstRow = Object.fromEntries(
      sample?.columns.map((column, index) => [column.name, sample.rows[0]?.values[index]]) ?? []
    );
    expect(firstRow).toMatchObject({
      order_id: 'ORD-1001',
      client_client_id: 'CLI-001',
      client_name: 'Acme Iberia',
      order_detail_id: 'OD-1001-1',
      order_details_order_id: 'ORD-1001',
    });
  });

  it('applies a typed literal JOIN condition to the real Transform sample', () => {
    const fixture = buildSemanticWorkbenchFixture();
    const authority = readDvtTransformAuthoringAuthority(fixture.transform);
    if (authority == null) throw new Error('Expected Substrait authority.');
    const draft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
    const inspection = inspectDvtSubstraitNInputJoinDraft(draft);
    if (!inspection.ok) throw new Error('Expected an accepted N-input join.');
    const activeFieldId = inspection.projection.inputs[1]?.fields.find(
      (field) => field.name === 'active'
    )?.fieldId;
    const joinRelationId = inspection.projection.joinRelations[0]?.relationId;
    if (activeFieldId == null || joinRelationId == null) {
      throw new Error('Expected the Client active field and first JOIN identity.');
    }
    const conditioned = addDvtSubstraitJoinPredicateCondition({
      draft,
      joinRelationId,
      condition: {
        left: { kind: 'field', sourceFieldId: activeFieldId },
        right: { kind: 'literal', literal: { dataType: 'bool', value: false } },
        operator: 'not_equal',
      },
    });
    const transform = applyDvtSubstraitSemanticDocument(
      fixture.transform,
      encodeDvtSubstraitInnerJoinDocument(conditioned)
    );

    const sample = fixture.projectTransformSample(transform);
    expect(sample?.rows).toHaveLength(9);
    const orderIdIndex = sample?.columns.findIndex((column) => column.name === 'order_id') ?? -1;
    expect(sample?.rows.map((row) => row.values[orderIdIndex])).not.toContain('ORD-1004');
    const graph = projectSemanticWorkbenchGraph(transform);
    expect(graph.nodes.some((node) => node.data.semanticKind === 'literal')).toBe(false);
    expect(graph.nodes.some((node) => node.data.semanticKind === 'expression')).toBe(false);
    expect(graph.nodes.find((node) => node.id === joinRelationId)?.data.label).toContain(
      'raw.client.active != boolean: false'
    );
  });

  it('rejects Order Details rows that do not reference an existing order', () => {
    const invalidOrderDetails = structuredClone(orderDetailsFixture);
    invalidOrderDetails.rows[0]!.order_id = 'ORD-MISSING';

    expect(() => buildSemanticWorkbenchFixture({ orderDetails: invalidOrderDetails })).toThrow(
      'order_details.order_id references missing orders.order_id value "ORD-MISSING".'
    );
  });

  it('keeps field selection scoped to each source-to-transform connection in an N:M graph', () => {
    const authority = readDvtTransformAuthoringAuthority(SEMANTIC_WORKBENCH_TRANSFORM);
    if (authority == null) throw new Error('Expected Substrait authority.');
    const initialDraft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
    const orders = SEMANTIC_WORKBENCH_SOURCE[0];
    const clients = SEMANTIC_WORKBENCH_SOURCE[1];
    const ordersEdge = SEMANTIC_WORKBENCH_EDGE[0];
    const clientsEdge = SEMANTIC_WORKBENCH_EDGE[1];
    if (ordersEdge == null || clientsEdge == null) {
      throw new Error('Expected both fixture connections.');
    }

    const primaryDraft = setDvtSubstraitJoinConnectionFieldSelected({
      draft: setDvtSubstraitJoinConnectionFieldSelected({
        draft: initialDraft,
        sourceNode: orders,
        targetNode: SEMANTIC_WORKBENCH_TRANSFORM,
        edge: ordersEdge,
        columnName: 'discount',
        selected: false,
      }),
      sourceNode: clients,
      targetNode: SEMANTIC_WORKBENCH_TRANSFORM,
      edge: clientsEdge,
      columnName: 'segment',
      selected: false,
    });
    const secondaryTransform = {
      ...SEMANTIC_WORKBENCH_TRANSFORM,
      id: 'lab-transform-orders-secondary',
    };
    const secondaryDraft = setDvtSubstraitJoinConnectionFieldSelected({
      draft: initialDraft,
      sourceNode: orders,
      targetNode: secondaryTransform,
      edge: {
        ...ordersEdge,
        id: 'lab-source-orders-lab-transform-orders-secondary',
        targetId: secondaryTransform.id,
      },
      columnName: 'amount',
      selected: false,
    });

    const primary = inspectDvtSubstraitNInputJoinDraft(primaryDraft);
    const secondary = inspectDvtSubstraitNInputJoinDraft(secondaryDraft);
    expect(primary.ok).toBe(true);
    expect(secondary.ok).toBe(true);
    if (!primary.ok || !secondary.ok) throw new Error('Expected accepted N-input joins.');
    expect(primary.projection.outputs.map((output) => output.name)).not.toContain('discount');
    expect(primary.projection.outputs.map((output) => output.name)).not.toContain('segment');
    expect(primary.projection.outputs.map((output) => output.name)).toContain('amount');
    expect(
      primary.projection.inputs[0]?.fields.find((field) => field.name === 'amount')?.dataType
    ).toBe('fp64');
    expect(
      primary.projection.outputs.map((output) => [output.name, output.source.name, output.dataType])
    ).toContainEqual(['priority', 'priority', 'bool']);
    expect(secondary.projection.outputs.map((output) => output.name)).not.toContain('amount');
    expect(secondary.projection.outputs.map((output) => output.name)).toContain('discount');
  });

  it('rejects a field edit when the edge does not bind the supplied source and transform', () => {
    const authority = readDvtTransformAuthoringAuthority(SEMANTIC_WORKBENCH_TRANSFORM);
    if (authority == null) throw new Error('Expected Substrait authority.');
    const initialDraft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
    const clientsEdge = SEMANTIC_WORKBENCH_EDGE[1];
    if (clientsEdge == null) throw new Error('Expected the Client connection.');

    expect(
      setDvtSubstraitJoinConnectionFieldSelected({
        draft: initialDraft,
        sourceNode: SEMANTIC_WORKBENCH_SOURCE[0],
        targetNode: SEMANTIC_WORKBENCH_TRANSFORM,
        edge: clientsEdge,
        columnName: 'discount',
        selected: false,
      })
    ).toBe(initialDraft);
  });
});
