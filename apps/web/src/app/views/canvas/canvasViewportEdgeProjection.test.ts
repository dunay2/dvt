import { describe, expect, it } from 'vitest';
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { CanonicalNode } from '../../types/canonical';
import {
  graphJoin,
  graphModel,
  graphSource,
  appendGraphSource,
} from './canvasRelationGraph.test-support';
import { createSourceSet, sourceSetOperations } from './canvasSourceSet';
import { source } from './canvasRelationalOperator.test-support';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';
import { applySelectedRelationWindow } from './canvasSelectedRelationWindow';
import { readCanvasDependencyEdgeData } from './canvasDependencyEdgeModel';
import { projectCanvasViewportEdges } from './canvasViewportEdgeProjection';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

function assertDependencies(
  model: CanonicalNode,
  sources: readonly CanonicalNode[],
  locale: string
): void {
  const visibleEdges = sources.map((input, index) => ({
    sourceId: input.id,
    targetId: model.id,
    executionGate: index === 0 ? ('closed' as const) : undefined,
  }));
  const signature = JSON.stringify({ model, sources, visibleEdges });
  const projected = projectCanvasViewportEdges({
    visibleEdges,
    allowedNodeIds: new Set([...sources.map((input) => input.id), model.id]),
    canonicalEdgeIdBySignature: new Map(
      sources.map((input) => [`${input.id}::${model.id}`, `edge-${input.id}`])
    ),
    canonicalEdgeBySignature: new Map(),
    canonicalNodesById: new Map([...sources, model].map((node) => [node.id, node])),
    locale,
  });
  expect(projected).toHaveLength(sources.length);
  projected.forEach((edge, index) => {
    const input = sources[index]!;
    expect(edge).toMatchObject({ id: `edge-${input.id}`, source: input.id, target: model.id });
    const dependency = readCanvasDependencyEdgeData(edge.data);
    expect(dependency?.execution.gateState).toBe(index === 0 ? 'closed' : 'open');
    expect(dependency).not.toHaveProperty('composition');
    expect(edge.data).not.toHaveProperty('composition');
    const copy = resolveCanvasViewCopy(locale);
    const label = copy.canvasEdgeAccessibleLabelTemplate
      .replace('{source}', input.name)
      .replace('{target}', model.name);
    expect(edge.ariaLabel).toBe(
      index === 0 ? `${label}, ${copy.canvasEdgeExcludedFromExecutionLabel}` : label
    );
  });
  expect(JSON.stringify({ model, sources, visibleEdges })).toBe(signature);
}

describe('Canvas viewport dependency projection', () => {
  it.each([
    JoinRel_JoinType.INNER,
    JoinRel_JoinType.LEFT,
    JoinRel_JoinType.RIGHT,
    JoinRel_JoinType.OUTER,
    JoinRel_JoinType.LEFT_SEMI,
    JoinRel_JoinType.RIGHT_SEMI,
    JoinRel_JoinType.LEFT_ANTI,
    JoinRel_JoinType.RIGHT_ANTI,
  ])('keeps internal JOIN %s and unary operations out of the outer graph', async (joinType) => {
    const { session, sources, document: joined } = graphJoin(joinType);
    const schema = await session.query(session.rootId);
    const grouped = await applySelectedRelationAggregate(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      intent: 'insert',
      fieldId: schema.bindings[0]!.fieldId,
      alias: 'total',
    });
    const groupedSchema = await session.query(session.rootId);
    const windowed = await applySelectedRelationWindow(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      intent: 'insert',
      alias: 'position',
      fieldId: groupedSchema.bindings[0]!.fieldId,
    });
    for (const document of [joined, grouped, windowed])
      for (const locale of ['en', 'es']) assertDependencies(graphModel(document), sources, locale);
  });

  it.each(Object.keys(sourceSetOperations))(
    'keeps internal %s out of the outer graph',
    (operation) => {
      const inputs = ['left', 'right'].map(source);
      const document = createSourceSet({
        inputs,
        targetNodeId: 'model',
        operation: operation as keyof typeof sourceSetOperations,
      });
      for (const locale of ['en', 'es'])
        assertDependencies(
          graphModel(document),
          inputs.map((input) => graphSource(input.nodeId)),
          locale
        );
    }
  );

  it('retains actual graph dependencies even while canonical bindings are incomplete', async () => {
    const { document, session, sources } = graphJoin();
    const recursive = await appendGraphSource(session, 'third');
    for (const locale of ['en', 'es']) {
      assertDependencies(graphModel(), sources, locale);
      assertDependencies(graphModel(document), [...sources, graphSource('extra')], locale);
      assertDependencies(graphModel(document), sources.slice(0, 1), locale);
      assertDependencies(graphModel(recursive), [...sources, graphSource('third')], locale);
    }
  });

  it('filters only out-of-scope dependencies and preserves canonical structural gates', () => {
    const projected = projectCanvasViewportEdges({
      visibleEdges: [
        { sourceId: 'orders', targetId: 'model' },
        { sourceId: 'outside', targetId: 'model' },
      ],
      allowedNodeIds: new Set(['orders', 'model']),
      canonicalEdgeIdBySignature: new Map([['orders::model', 'canonical-edge']]),
      canonicalEdgeBySignature: new Map([
        [
          'orders::model',
          {
            id: 'canonical-edge',
            sourceId: 'orders',
            targetId: 'model',
            relation: 'lineage',
            metadata: { executionDependency: false },
          },
        ],
      ]),
      canonicalNodesById: new Map(),
      locale: 'en',
    });
    expect(projected).toHaveLength(1);
    expect(projected[0]?.id).toBe('canonical-edge');
    expect(readCanvasDependencyEdgeData(projected[0]?.data)?.execution).toMatchObject({
      isGateable: false,
      isEffectivelyExecutable: false,
      unavailableReason: 'structural-execution-disabled',
    });
  });
});
