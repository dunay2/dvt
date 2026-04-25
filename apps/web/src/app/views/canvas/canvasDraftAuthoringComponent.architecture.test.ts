import type { Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { getCanvasRuntimeRegistrations } from '../../plugins/graphStrategyRegistry';
import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
import { buildController } from '../Canvas.test.controller';
import { readArchitectureSiblingSource } from '../architecture.test.support';
import { resolveActiveCanvasGraphStrategy } from './canvasActiveGraphStrategy';
import { createUnknownCanvasDraftReadModel } from './canvasDraftReadModel';
import type { CanvasDraftSession } from './canvasDraftSession';
import { resolveCanvasNodeAdmissionTransaction } from './canvasNodeAdmissionTransaction';
import { deriveCanvasRouteInteractionState } from './canvasRouteInteractionState';
import { canvasViewCopy } from './copy';

const NODE_DUPLICATE_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeDuplicateHandlers.ts'
);
const GRAPH_HANDLER_CONTRACTS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasGraphHandlerContracts.ts'
);
const NODE_DROP_AGGREGATE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasNodeDropAggregate.ts'
);
const GRAPH_STRATEGY_CONTRACTS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../plugins/graphStrategyContracts.ts'
);
const DBT_NODE_ADAPTER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../plugins/dbt/dbtNodeAdapter.ts'
);
const DVT_TRANSFORMATION_STRATEGY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../plugins/dvt/transformationGraphStrategy.ts'
);

function buildDraftReadModelWithCanvasKind(kind: string) {
  const record: WorkspaceGraphDraftRecord = {
    revision: 'rev-1',
    savedAt: '2026-04-25T00:00:00Z',
    draft: {
      canvas: {
        kind,
        title: `${kind} canvas`,
      },
      nodeIds: [],
      nodePositions: {},
      edges: [],
    },
  };

  return createUnknownCanvasDraftReadModel(record);
}

function buildDraftSession(visibleNodeIds: string[] = []): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: {
      record: null,
    },
    draftRevision: 'rev-1',
    workingSet: {
      visibleNodeIds,
      visibleEdges: [],
      pendingExplicitNodeIds: [],
    },
  };
}

function buildCanonicalNode(id: string): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:sql_transform',
    role: 'transform',
    status: 'idle',
    tags: [],
  };
}

describe('canvas draft authoring component architecture', () => {
  it('binds canvas kind, graph strategy, execution posture, and catalog in one runtime registration', () => {
    expect(
      getCanvasRuntimeRegistrations().map((registration) => ({
        kind: registration.kind,
        pluginId: registration.pluginId,
        graphStrategyId: registration.graphStrategy.id,
        executionKind: registration.executionStrategy.kind,
      }))
    ).toEqual([
      {
        kind: 'dbt',
        pluginId: 'dbt',
        graphStrategyId: 'dbt',
        executionKind: 'not_executable',
      },
      {
        kind: 'transformation',
        pluginId: 'dvt',
        graphStrategyId: 'transformation',
        executionKind: 'transformation_preview',
      },
    ]);
    expect(
      Object.fromEntries(
        getCanvasRuntimeRegistrations().map((registration) => [
          registration.kind,
          registration.nodeKinds.map((nodeKind) => nodeKind.kind).sort(),
        ])
      )
    ).toEqual({
      dbt: [
        'dbt:exposure',
        'dbt:macro',
        'dbt:metric',
        'dbt:model',
        'dbt:seed',
        'dbt:snapshot',
        'dbt:source',
        'dbt:test',
      ],
      transformation: ['dvt:sink', 'dvt:source', 'dvt:sql_transform'],
    });
  });

  it('fails closed for unsupported persisted canvas kinds before route mutation is allowed', () => {
    expect(
      resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind('unknown'))
    ).toEqual({
      kind: 'unsupported_kind',
      canvasKind: 'unknown',
    });

    const interactionState = deriveCanvasRouteInteractionState(
      buildController({
        canvasDocument: {
          kind: 'unknown',
          title: 'Unknown canvas',
        },
      }),
      null
    );

    expect(interactionState.effectiveWorkbenchState).toEqual({
      kind: 'error',
      message:
        'Canvas cannot open persisted canvas kind "unknown" because no runtime registration is available.',
    });
    expect(interactionState.effectiveUserPermissions).toMatchObject({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
    });
    expect(interactionState.readOnlyState).toBeNull();
  });

  it('computes node admission as a pure command transaction before React effects are applied', () => {
    const sourceNode: Node = {
      id: 'source-node',
      data: { name: 'source-node' },
      position: { x: 0, y: 0 },
    };
    const existingNodes = [sourceNode];
    const draftSession = buildDraftSession(['source-node']);

    const addedTransaction = resolveCanvasNodeAdmissionTransaction({
      canonicalNode: buildCanonicalNode('transform-node'),
      draftSession,
      existingNodes,
      position: { x: 120, y: 80 },
      columnLevelLineageEnabled: false,
    });

    expect(addedTransaction.outcome).toBe('added');
    if (addedTransaction.outcome !== 'added') {
      return;
    }
    expect(addedTransaction.nodes.map((node) => node.id)).toEqual([
      'source-node',
      'transform-node',
    ]);
    expect(addedTransaction.nodes).not.toBe(existingNodes);
    expect(addedTransaction.draftSession).not.toBe(draftSession);
    expect(existingNodes).toEqual([sourceNode]);
    expect(draftSession.workingSet.visibleNodeIds).toEqual(['source-node']);

    const noopTransaction = resolveCanvasNodeAdmissionTransaction({
      canonicalNode: buildCanonicalNode('source-node'),
      draftSession,
      existingNodes,
      position: { x: 120, y: 80 },
      columnLevelLineageEnabled: false,
    });

    expect(noopTransaction).toEqual({
      outcome: 'noop',
      reason: canvasViewCopy.nodeAlreadyOnCanvasMessage,
    });
    expect('nodes' in noopTransaction).toBe(false);
    expect('draftSession' in noopTransaction).toBe(false);
  });

  it('keeps source-text tripwires only for import ownership that runtime tests cannot observe', () => {
    expect(GRAPH_HANDLER_CONTRACTS_SOURCE).toContain(
      "from '../../plugins/graphStrategyContracts'"
    );
    expect(DBT_NODE_ADAPTER_SOURCE).toContain("from '../graphStrategyContracts'");
    expect(DVT_TRANSFORMATION_STRATEGY_SOURCE).toContain(
      'export const transformationCanvasGraphStrategy'
    );

    expect(GRAPH_STRATEGY_CONTRACTS_SOURCE).not.toContain('authoringPolicy');
    expect(DBT_NODE_ADAPTER_SOURCE).not.toContain('authoringPolicy');
    expect(DVT_TRANSFORMATION_STRATEGY_SOURCE).not.toContain('authoringPolicy');
    expect(NODE_DROP_AGGREGATE_SOURCE).not.toContain('CanvasGraphStrategy');
    expect(NODE_DROP_AGGREGATE_SOURCE).not.toContain('graphStrategy');
    expect(NODE_DUPLICATE_HANDLERS_SOURCE).not.toContain('setNodes((existingNodes)');
  });
});
