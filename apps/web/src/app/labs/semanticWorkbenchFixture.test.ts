import { describe, expect, it } from 'vitest';

import {
  decodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
} from '../views/canvas/canvasDvtSubstraitJoinComposition';
import { readDvtTransformAuthoringAuthority } from '../views/canvas/canvasDvtTransformAuthoringAuthority';
import clientFixture from './fixtures/client.json';
import ordersFixture from './fixtures/orders.json';
import {
  SEMANTIC_WORKBENCH_EDGE,
  SEMANTIC_WORKBENCH_SOURCE,
  SEMANTIC_WORKBENCH_TRANSFORM,
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
  });
});
