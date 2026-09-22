import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { ConnectedSourceRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  appendDvtSubstraitJoinInput,
  createDvtSubstraitStringJoinDraft,
  encodeDvtSubstraitJoinDocument,
  inspectDvtSubstraitJoinDraft,
  type DvtSubstraitJoinDraft,
  type DvtSubstraitJoinInput,
  type DvtSubstraitJoinType,
} from './canvasDvtSubstraitJoinComposition';
import {
  createDvtSubstraitUnionAllDraft,
  createDvtSubstraitSetDraft,
  encodeDvtSubstraitUnionAllDocument,
} from './canvasDvtSubstraitSetComposition';
import {
  createDvtSubstraitCrossDraft,
  encodeDvtSubstraitCrossDocument,
} from './canvasDvtSubstraitCrossComposition';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { readCanvasDependencyEdgeData } from './canvasDependencyEdgeModel';
import { projectCanvasViewportEdges } from './canvasViewportEdgeProjection';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { applyCanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorCommands';
import { resolveCanvasRelationalOperatorTools } from './canvasRelationalTreeOperatorModel';

function source(id: string): CanonicalNode {
  const sourceRef: ConnectedSourceRef = {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-main',
      provider: 'postgres',
    },
    sourceObjectId: `raw.${id}`,
  };
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
      connectedSourceRef: sourceRef,
      columns: [{ name: 'id', type: 'text' }],
    },
  };
}

function transform(id = 'model'): CanonicalNode {
  return {
    id,
    name: 'Model',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {},
  };
}

function sourceRef(node: CanonicalNode): ConnectedSourceRef {
  return node.metadata!.connectedSourceRef as ConnectedSourceRef;
}

function joinInput(node: CanonicalNode): DvtSubstraitJoinInput {
  return {
    source: {
      nodeId: node.id,
      schema: 'raw',
      table: node.name,
      sourceRef: sourceRef(node),
    },
    fields: ['id'],
    fieldTypes: ['string' as const],
  };
}

function initialJoin(
  left: CanonicalNode,
  right: CanonicalNode,
  joinType: DvtSubstraitJoinType = JoinRel_JoinType.INNER
): DvtSubstraitJoinDraft {
  return createDvtSubstraitStringJoinDraft({
    left: joinInput(left),
    right: joinInput(right),
    leftFieldName: 'id',
    rightFieldName: 'id',
    targetNodeId: 'model',
    joinType,
  });
}

function canonicalJoin(left: CanonicalNode, right: CanonicalNode): CanonicalNode {
  return applyDvtSubstraitSemanticDocument(
    transform(),
    encodeDvtSubstraitJoinDocument(initialJoin(left, right))
  );
}

function canonicalLeftJoin(left: CanonicalNode, right: CanonicalNode): CanonicalNode {
  return applyDvtSubstraitSemanticDocument(
    transform(),
    encodeDvtSubstraitJoinDocument(initialJoin(left, right, JoinRel_JoinType.LEFT))
  );
}

function canonicalUnionAll(left: CanonicalNode, right: CanonicalNode): CanonicalNode {
  return applyDvtSubstraitSemanticDocument(
    transform(),
    encodeDvtSubstraitUnionAllDocument(
      createDvtSubstraitUnionAllDraft({
        inputs: [left, right].map((node) => ({
          nodeId: node.id,
          schema: 'raw',
          table: node.name,
          fields: [{ name: 'id', type: 'string' as const }],
          sourceRef: sourceRef(node),
        })),
        targetNodeId: 'model',
      })
    )
  );
}

function canonicalCross(left: CanonicalNode, right: CanonicalNode): CanonicalNode {
  return applyDvtSubstraitSemanticDocument(
    transform(),
    encodeDvtSubstraitCrossDocument(
      createDvtSubstraitCrossDraft({
        inputs: [left, right].map((node) => ({
          nodeId: node.id,
          schema: 'raw',
          table: node.name,
          fields: [
            { name: 'id', dataType: 'string', joinDataType: 'string' as const, nullable: true },
          ],
          sourceRef: sourceRef(node),
        })),
      })
    )
  );
}

function canonicalThreeInputJoin(
  left: CanonicalNode,
  right: CanonicalNode,
  third: CanonicalNode
): CanonicalNode {
  const initial = initialJoin(left, right);
  const inspection = inspectDvtSubstraitJoinDraft(initial);
  if (!inspection.ok) throw new Error('Expected initial JOIN inspection.');
  const leftSourceFieldId = inspection.projection.outputs[0]?.source.fieldId;
  if (leftSourceFieldId == null) throw new Error('Expected initial JOIN output.');
  const appended = appendDvtSubstraitJoinInput(initial, {
    source: {
      nodeId: third.id,
      schema: 'raw',
      table: third.name,
      sourceRef: sourceRef(third),
    },
    fields: ['id', 'detail'],
    predicate: { leftSourceFieldId, rightFieldName: 'id' },
    selectedFields: ['detail'],
  });
  return applyDvtSubstraitSemanticDocument(transform(), encodeDvtSubstraitJoinDocument(appended));
}

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
    JoinRel_JoinType.LEFT_ANTI,
    JoinRel_JoinType.RIGHT_SEMI,
    JoinRel_JoinType.RIGHT_ANTI,
  ] as const)('keeps internal JOIN %s and its wrappers out of the outer graph', (type) => {
    const left = source('left');
    const right = source('right');
    const joined = initialJoin(left, right, type);
    const field = resolveCanvasRelationalOperatorTools(joined).find(
      (tool) => tool.id === 'aggregate'
    )!.fields[0]!;
    const grouped = applyCanvasRelationalOperatorTool(joined, {
      tool: 'aggregate',
      fieldId: field.fieldId,
      alias: 'total',
    });
    const windowed = applyCanvasRelationalOperatorTool(grouped, {
      tool: 'window',
      alias: 'position',
    });
    expect(grouped).not.toBe(joined);
    expect(windowed).not.toBe(grouped);
    for (const draft of [joined, grouped, windowed]) {
      const model = applyDvtSubstraitSemanticDocument(
        transform(),
        encodeDvtSubstraitJoinDocument(draft)
      );
      for (const locale of ['en', 'es']) assertDependencies(model, [left, right], locale);
    }
  });

  it.each([
    'union_all',
    'union_distinct',
    'intersect_distinct',
    'except_distinct',
    'intersect_all',
    'except_all',
  ] as const)('keeps internal %s out of the outer graph', (operation) => {
    const sources = [source('left'), source('right')];
    const model = applyDvtSubstraitSemanticDocument(
      transform(),
      encodeDvtSubstraitUnionAllDocument(
        createDvtSubstraitSetDraft({
          inputs: sources.map((node) => ({
            nodeId: node.id,
            schema: 'raw',
            table: node.name,
            fields: [{ name: 'id', type: 'string' as const }],
            sourceRef: sourceRef(node),
          })),
          targetNodeId: 'model',
          operation,
        })
      )
    );
    for (const locale of ['en', 'es']) assertDependencies(model, sources, locale);
  });

  it('retains every real dependency for pending, canonical, extra and missing inputs', () => {
    const orders = source('orders');
    const clients = source('clients');
    const details = source('details');
    for (const locale of ['en', 'es']) {
      assertDependencies(transform(), [orders, clients], locale);
      assertDependencies(canonicalJoin(orders, clients), [orders, clients], locale);
      assertDependencies(canonicalLeftJoin(orders, clients), [orders, clients, details], locale);
      assertDependencies(canonicalUnionAll(orders, clients), [orders], locale);
      assertDependencies(canonicalCross(orders, clients), [orders, clients], locale);
      assertDependencies(
        canonicalThreeInputJoin(orders, clients, details),
        [orders, clients, details],
        locale
      );
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
