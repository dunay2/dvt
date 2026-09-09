import { describe, expect, it } from 'vitest';

import {
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
  it('derives both canonical source cards from the JSON dataset schemas', () => {
    const datasets = [
      loadSemanticWorkbenchDataset(ordersFixture),
      loadSemanticWorkbenchDataset(clientFixture),
    ];
    expect(SEMANTIC_WORKBENCH_SOURCE.map((source) => source.name)).toEqual(['Orders', 'Client']);
    expect(SEMANTIC_WORKBENCH_SOURCE.map((source) => source.metadata?.columns)).toEqual(
      datasets.map((dataset) => dataset.columns)
    );
    expect(SEMANTIC_WORKBENCH_SOURCE.map((source) => source.metadata?.sampleRows)).toEqual(
      datasets.map((dataset) => dataset.rows)
    );
    expect(SEMANTIC_WORKBENCH_EDGE.map((edge) => edge.sourceId)).toEqual([
      'lab-source-orders',
      'lab-source-client',
    ]);
    expect(
      SEMANTIC_WORKBENCH_SOURCE.map(
        (source) =>
          (source.metadata?.sourceMetricEvidence as { rowCount: { value: number } }).rowCount.value
      )
    ).toEqual([8, 5]);
  });

  it('projects the real join predicate into grouped semantic nodes', () => {
    const graph = projectSemanticWorkbenchGraph(SEMANTIC_WORKBENCH_TRANSFORM);
    const labels = graph.nodes.map((node) => node.data.label);

    expect(labels).toEqual(
      expect.arrayContaining([
        'FUENTES',
        'CONDICIÓN DEL JOIN',
        'TRANSFORMACIÓN',
        'SOURCE\nraw.orders',
        'SOURCE\nraw.client',
        'FIELD\nraw.orders.client_id',
        'FIELD\nraw.client.client_id',
        'EQUAL\n=',
        'JOIN\nJoinRel',
      ])
    );
    const joinNode = graph.nodes.find((node) => node.id === graph.relationId);
    expect(joinNode?.data.expression).toBe('raw.orders.client_id = raw.client.client_id');
    expect(joinNode?.data.inputSummary).toBe('2 fuentes');
    expect(joinNode?.data.outputSummary).toBe('15 columnas');
    expect(
      graph.nodes
        .filter((node) => node.data.semanticKind === 'field')
        .map((node) => node.data.joinOperand)
    ).toEqual([
      { joinRelationId: graph.relationId, operand: 'left' },
      { joinRelationId: graph.relationId, operand: 'right' },
    ]);
    expect(graph.expressionCount).toBe(3);
    expect(graph.edges.map((edge) => edge.data?.semanticEdgeKind)).toEqual(
      expect.arrayContaining(['relation', 'expression'])
    );
  });

  it('uses the admitted two-input Substrait join as transform authority', () => {
    const authority = readDvtTransformAuthoringAuthority(SEMANTIC_WORKBENCH_TRANSFORM);
    expect(authority?.mode).toBe('substrait');
    if (authority == null) throw new Error('Expected Substrait authority.');

    const inspection = inspectDvtSubstraitNInputJoinDraft(
      decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument)
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) throw new Error('Expected an accepted join.');
    expect(inspection.projection.inputs.map((input) => input.table)).toEqual(['orders', 'client']);
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
    });
  });

  it('projects the Transform sample from the real join and its selected outputs', () => {
    const fixture = buildSemanticWorkbenchFixture();
    const authority = readDvtTransformAuthoringAuthority(fixture.transform);
    if (authority == null) throw new Error('Expected Substrait authority.');
    const draft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
    const ordersEdge = fixture.edges[0];
    if (ordersEdge == null) throw new Error('Expected the Orders connection.');
    const selectedDraft = setDvtSubstraitJoinConnectionFieldSelected({
      draft,
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
    expect(sample?.rows).toHaveLength(8);
    expect(sample?.columns.map((column) => column.name)).not.toContain('discount');
    expect(sample?.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['order_id', 'client_client_id', 'client_name'])
    );
    const firstRow = Object.fromEntries(
      sample?.columns.map((column, index) => [column.name, sample.rows[0]?.values[index]]) ?? []
    );
    expect(firstRow).toMatchObject({
      order_id: 'ORD-1001',
      client_client_id: 'CLI-001',
      client_name: 'Acme Iberia',
    });
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
