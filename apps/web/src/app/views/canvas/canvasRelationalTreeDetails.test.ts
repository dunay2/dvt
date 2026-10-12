/** Card details are local, ordered projections of canonical relations, never writes. */
import { describe, expect, it } from 'vitest';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import {
  expressionStageDraft,
  projectExpressionStage,
  withScalarOutput,
} from './canvasRelationalExpressionStage.test-support';
import { applyDvtSubstraitFetch, applyDvtSubstraitSort } from './canvasSortFetch.test-support';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { buildCanvasRelationalTreeRelation } from './canvasRelationalTreeRelationProjection';
import { projectCanvasRelationalTreeDetails } from './canvasRelationalTreeDetails';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';
import { filterProjectionInputFixture } from './canvasFilterProjection.test-support';
import { resolveDvtSubstraitFilterCapabilities } from './canvasFilterCapabilities';
import { createSourceCross } from './canvasSourceCross';
import { createSourceSet } from './canvasSourceSet';
import { source } from './canvasRelationalOperator.test-support';

function projectDetails(
  document: SubstraitDocument
): ReturnType<typeof projectCanvasRelationalTreeDetails> & { root: CanvasRelationalTreeNode } {
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) throw indexed.error;
  const root = buildCanvasRelationalTreeRelation({ index: indexed.index, digest: 'inspection' });
  const transformNode = applyDvtSubstraitSemanticDocument(
    projectExpressionStage(expressionStageDraft()).node,
    encodeDvtSubstraitSemanticDocument(document)
  );
  const before = structuredClone(transformNode);
  const details = projectCanvasRelationalTreeDetails(root, { transformNode });
  expect(transformNode).toEqual(before);
  return { root, ...details };
}

function roots(graph: SemanticWorkbenchGraph): SemanticWorkbenchGraph['nodes'] {
  const operands = new Set(graph.edges.map((edge) => edge.source));
  return graph.nodes.filter(
    (node) => !operands.has(node.id) && !['group', 'relation'].includes(node.data.semanticKind)
  );
}

describe('relational card detail projection', () => {
  it('shows Filter conditions and Aggregate grouping/measures through the same projection', async () => {
    const filtered = await filterProjectionInputFixture(expressionStageDraft(), {
      fieldId: 'output:country',
      dataType: 'string',
      value: 'ES',
      capabilityId: resolveDvtSubstraitFilterCapabilities({ dataType: 'string' })[0]!.capabilityId,
    });
    const filterDetails = projectDetails(filtered);
    const filter = filterDetails.root.children[0]!.node;
    const condition = filterDetails.graphs.get(filter.locator)!;
    expect(condition.nodes.some((node) => node.data.semanticKind === 'literal')).toBe(true);
    expect(condition.edges.length).toBeGreaterThan(0);
    const session = new CanvasRelationAnalysisSession('detail-test');
    session.receive(filtered);
    try {
      const grouped = await applySelectedRelationAggregate(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        intent: 'insert',
        fieldId: 'output:country',
        alias: 'population',
      });
      const { root, graphs } = projectDetails(grouped);
      expect(roots(graphs.get(root.locator)!).map((node) => node.data.semanticKind)).toEqual([
        'field',
        'expression',
      ]);
    } finally {
      session.dispose();
    }
  });

  it.each(['cross', 'set'] as const)('shows only local %s inputs and output fields', (operator) => {
    const inputs = [source('north'), source('south')].map((input) => ({
      ...input,
      fields: input.fields.map((field) => ({
        ...field,
        dataType: field.type,
        joinDataType: field.type,
      })),
    }));
    const document =
      operator === 'cross'
        ? createSourceCross(inputs)
        : createSourceSet({ inputs, targetNodeId: 'model', operation: 'union_all' });
    const { root, graphs } = projectDetails(document);
    const graph = graphs.get(root.locator)!;
    expect(graph.nodes.filter((node) => node.data.semanticKind === 'relation')).toHaveLength(
      root.children.length
    );
    expect(graph.nodes.filter((node) => node.data.semanticKind === 'field')).toHaveLength(
      root.output.fields.length +
        root.children.reduce((count, child) => count + child.node.output.fields.length, 0)
    );
    expect(new Set(graph.nodes.map((node) => node.id)).size).toBe(graph.nodes.length);
  });

  it('preserves Sort key priority, direction, null placement and each field subtree', () => {
    const sorted = applyDvtSubstraitSort(expressionStageDraft(), [
      { fieldId: 'output:country', direction: SortField_SortDirection.DESC_NULLS_LAST },
      { fieldId: 'output:customer_code', direction: SortField_SortDirection.ASC_NULLS_FIRST },
    ]);
    const { root, graphs } = projectDetails(sorted);
    const graph = graphs.get(root.locator);
    expect(graph).toBeDefined();
    const keys = roots(graph!);
    expect(keys.map((key) => key.data.label)).toEqual([
      'ORDER BY\nDESC NULLS LAST',
      'ORDER BY\nASC NULLS FIRST',
    ]);
    const fieldNames = keys.map((key) => {
      const fieldId = graph!.edges.find((edge) => edge.target === key.id)!.source;
      return graph!.nodes.find((node) => node.id === fieldId)!.data.detail;
    });
    expect(fieldNames).toEqual(['country', 'customer_code']);
  });

  it.each([
    { count: 73n, offset: 11n, expected: ['LIMIT\n73', 'OFFSET\n11'] },
    { count: null, offset: null, expected: ['LIMIT\nALL', 'OFFSET\n0'] },
  ])('projects Fetch parameters, including defaults: $expected', ({ count, offset, expected }) => {
    const { root, graphs } = projectDetails(
      applyDvtSubstraitFetch(expressionStageDraft(), { count, offset })
    );
    const graph = graphs.get(root.locator);
    expect(graph).toBeDefined();
    expect(roots(graph!).map((node) => node.data.label)).toEqual(expected);
    expect(roots(graph!)).toHaveLength(2);
  });

  it('shows direct Project and Read local fields without copying the upstream tree', () => {
    const { root, graphs, sizes } = projectDetails(expressionStageDraft());
    const source = root.children[0]!.node;
    for (const relation of [root, source]) {
      const graph = graphs.get(relation.locator);
      expect(graph).toBeDefined();
      const fields = graph!.nodes.filter((node) =>
        graph!.edges.some(
          (edge) => edge.source === node.id && edge.target === `${relation.locator}/output`
        )
      );
      expect(fields.map((field) => field.data.fieldReference?.fieldId)).toEqual(
        relation.output.fields.map((field) => field.fieldId)
      );
      expect(sizes.get(relation.locator)!.height).toBeGreaterThan(76);
    }
    expect(
      graphs.get(source.locator)!.nodes.some((node) => node.data.semanticKind === 'relation')
    ).toBe(false);
  });

  it('limits a Source Read detail to the external publication without changing its semantic fields', () => {
    const { node, projection } = projectExpressionStage(expressionStageDraft());
    const read = projection.root.children[0]!.node;
    const first = read.output.fields[0]!.displayName!;
    const details = projectCanvasRelationalTreeDetails(
      projection.root,
      { transformNode: node },
      new Map([[read.relationId!, [first]]])
    );
    expect(read.output.fields.length).toBeGreaterThan(1);
    expect(
      details.graphs
        .get(read.locator)!
        .nodes.filter((item) => item.data.semanticKind === 'field')
        .map((item) => item.data.detail)
    ).toEqual([first]);
    const parentGraph = details.graphs.get(projection.root.locator)!;
    const input = parentGraph.nodes.find((item) => item.data.semanticKind === 'relation')!;
    const inputFields = parentGraph.edges
      .filter((edge) => edge.target === input.id)
      .map((edge) => parentGraph.nodes.find((item) => item.id === edge.source)!.data.detail);
    expect(inputFields).toEqual([first]);
  });

  it('keeps local Input and Output fields visible alongside a named derived expression', () => {
    const { root, graphs, sizes } = projectDetails(withScalarOutput(expressionStageDraft()));
    const graph = graphs.get(root.locator)!;
    const input = graph.nodes.find((item) => item.data.semanticKind === 'relation')!;
    const output = graph.nodes.find((item) => item.data.label === 'OUTPUT')!;
    expect(input).toBeDefined();
    expect(output).toBeDefined();
    for (const [group, fields] of [
      [input, root.children[0]!.node.output.fields],
      [output, root.output.fields],
    ] as const) {
      const ids = graph.edges.filter((edge) => edge.target === group.id).map((edge) => edge.source);
      expect(
        ids.map((id) => graph.nodes.find((item) => item.id === id)!.data.fieldReference?.fieldId)
      ).toEqual(fields.map((field) => field.fieldId));
    }
    expect(graph.nodes.some((item) => item.data.semanticKind === 'expression')).toBe(true);
    expect(
      graph.nodes.find((item) => item.data.semanticKind === 'expression')?.data.fieldReference
    ).toEqual({ relationId: root.relationId, fieldId: root.output.fields.at(-1)!.fieldId });
    expect(new Set(graph.nodes.map((item) => item.id)).size).toBe(graph.nodes.length);
    expect(sizes.get(root.locator)!.height).toBeLessThanOrEqual(428);
  });

  it('does not project details without semantic context or invent detail for unsupported cards', () => {
    const { node, projection } = projectExpressionStage(expressionStageDraft());
    expect(projectCanvasRelationalTreeDetails(projection.root).graphs.size).toBe(0);
    const root = { ...projection.root, operator: 'unsupported' as const };
    const detail = projectCanvasRelationalTreeDetails(root, { transformNode: node });
    expect(detail.graphs.has(root.locator)).toBe(false);
  });

  it('bounds tall details without dropping any local output field', () => {
    const { node, projection } = projectExpressionStage(expressionStageDraft());
    const root = {
      ...projection.root,
      output: {
        ...projection.root.output,
        fields: Array.from({ length: 24 }, (_, index) => ({
          ...projection.root.output.fields[0]!,
          fieldId: `column-${index}`,
          displayName: `column_${index}`,
        })),
      },
    };
    const details = projectCanvasRelationalTreeDetails(root, { transformNode: node });
    const graph = details.graphs.get(root.locator)!;
    expect(graph.edges.filter((edge) => edge.target === `${root.locator}/output`)).toHaveLength(24);
    expect(details.sizes.get(root.locator)!.height).toBe(428);
  });
});
