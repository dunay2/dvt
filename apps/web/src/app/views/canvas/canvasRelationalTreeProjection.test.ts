import { describe, expect, it } from 'vitest';
import {
  projectCanvasRelationalTree,
  type CanvasRelationalTreeNode,
} from './canvasRelationalTreeProjection';
import {
  graphJoin,
  graphModel,
  graphSource,
  appendGraphSource,
} from './canvasRelationGraph.test-support';
import { createSourceSet, sourceSetOperations } from './canvasSourceSet';
import { source } from './canvasRelationalOperator.test-support';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';
import type { CanonicalNode } from '../../types/canonical';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { buildCanvasRelationalTreeRelation } from './canvasRelationalTreeRelationProjection';
import {
  withPublicExpressionStage,
  withScalarOutput,
  withWindowOutput,
} from './canvasRelationalExpressionStage.test-support';

function project(
  node: CanonicalNode,
  sources: readonly CanonicalNode[]
): ReturnType<typeof projectCanvasRelationalTree> {
  return projectCanvasRelationalTree({
    node,
    nodes: [...sources, node],
    edges: sources.map((input) => ({
      id: input.id,
      sourceId: input.id,
      targetId: node.id,
      relation: 'lineage',
    })),
  });
}
function flatten(root: CanvasRelationalTreeNode): readonly CanvasRelationalTreeNode[] {
  return [root, ...root.children.flatMap((child) => flatten(child.node))];
}

describe('canonical relation tree projection', () => {
  it.each([withScalarOutput, withWindowOutput])(
    'projects an explicit authoring group as one card without flattening canonical semantics',
    async (build) => {
      const document = await withPublicExpressionStage(build(), true);
      const indexed = indexSubstraitRelations(document);
      if (!indexed.ok) throw indexed.error;
      const before = structuredClone(document);
      const root = buildCanvasRelationalTreeRelation({ index: indexed.index, digest: 'group' });
      expect(flatten(root).map((node) => node.operator)).toEqual(['project', 'read']);
      expect(root.relationId).toBe(indexed.index.rootId);
      expect(root.expressionRefs).toEqual([
        {
          relationId: document.sidecar.relations.find(
            (binding) => binding.authoringOwnerRelationId === indexed.index.rootId
          )!.relationId,
          slot: 'project-expression',
          ordinal: 0,
        },
      ]);
      expect(root.output.fields.map((field) => field.fieldId)).toEqual(
        indexed.index.relations.get(indexed.index.rootId)!.fields.map((field) => field.fieldId)
      );
      expect(root.projectionSummary).toEqual({
        passthroughFieldCount: 2,
        scalarFieldCount: build === withScalarOutput ? 1 : 0,
        windowFieldCount: build === withWindowOutput ? 1 : 0,
      });
      expect(indexed.index.relations.size).toBe(3);
      expect(document).toEqual(before);
    }
  );

  it('keeps adjacent independent Transform cards separate', async () => {
    const document = await withPublicExpressionStage(withScalarOutput(), false);
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) throw indexed.error;
    const root = buildCanvasRelationalTreeRelation({ index: indexed.index, digest: 'separate' });
    expect(flatten(root).map((node) => node.operator)).toEqual(['project', 'project', 'read']);
    expect(root.projectionSummary).toEqual({
      passthroughFieldCount: 3,
      scalarFieldCount: 0,
      windowFieldCount: 0,
    });
  });

  it('preserves recursive port order and stable identities across reopening', async () => {
    const { session, sources } = graphJoin();
    const document = await appendGraphSource(session, 'third');
    const nodes = [...sources, graphSource('third')];
    const model = graphModel(document);
    const result = project(model, nodes);
    expect(result).toEqual(project(structuredClone(model), structuredClone(nodes)));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected canonical tree');
    expect(result.projection.root).toMatchObject({
      operator: 'join',
      children: [
        { role: 'left', node: { operator: 'join' } },
        { role: 'right', node: { operator: 'read' } },
      ],
    });
    expect(result.projection.inputs.map((input) => input.state)).toEqual([
      'participating',
      'participating',
      'participating',
    ]);
    expect(
      flatten(result.projection.root)
        .map((node) => node.relationId)
        .sort()
    ).toEqual(document.sidecar.relations.map((binding) => binding.relationId).sort());
  });

  it.each(Object.keys(sourceSetOperations))('keeps every ordered operand of %s', (operation) => {
    const inputs = ['north', 'south', 'west'].map(source);
    const document = createSourceSet({
      inputs,
      targetNodeId: 'model',
      operation: operation as keyof typeof sourceSetOperations,
    });
    const result = project(
      graphModel(document),
      inputs.map((input) => graphSource(input.nodeId))
    );
    if (!result.ok) throw new Error('Expected canonical SET tree');
    expect(result.projection.root).toMatchObject({ operator: 'set', operation });
    expect(result.projection.root.children.map(({ role, ordinal }) => ({ role, ordinal }))).toEqual(
      [
        { role: 'primary', ordinal: 0 },
        { role: 'secondary', ordinal: 1 },
        { role: 'secondary', ordinal: 2 },
      ]
    );
  });

  it('keeps a unary operation above its complete binary input', async () => {
    const { session, sources } = graphJoin();
    const schema = await session.query(session.rootId);
    const document = await applySelectedRelationAggregate(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      intent: 'insert',
      fieldId: schema.bindings[0]!.fieldId,
      alias: 'total',
    });
    const result = project(graphModel(document), sources);
    if (!result.ok) throw new Error('Expected aggregate tree');
    expect(result.projection.root).toMatchObject({
      operator: 'aggregate',
      children: [{ role: 'input', ordinal: 0, node: { operator: 'join' } }],
    });
    expect(result.projection.output.fields).toHaveLength(2);
  });

  it('distinguishes missing and pending connections without inventing canonical inputs', () => {
    const { document, sources } = graphJoin();
    const result = project(graphModel(document), [sources[0]!, graphSource('extra')]);
    if (!result.ok) throw new Error('Expected canonical tree');
    expect(
      result.projection.inputs.map(({ sourceRef, state }) => [sourceRef?.sourceObjectId, state])
    ).toEqual([
      ['public.left', 'participating'],
      ['public.right', 'missing'],
      ['public.extra', 'pending'],
    ]);
    expect(flatten(result.projection.root).filter((node) => node.operator === 'read')).toHaveLength(
      2
    );
  });

  it('returns a typed failure for invalid authority', () => {
    const node = {
      ...graphModel(),
      metadata: {
        transformAuthoring: {
          version: 'v1',
          mode: 'substrait',
          semanticDocument: { broken: true },
        },
      },
    };
    expect(project(node, [])).toEqual({
      ok: false,
      failure: { code: 'invalid-semantic-authority' },
    });
  });
});
