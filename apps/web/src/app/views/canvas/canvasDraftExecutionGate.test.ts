import { describe, expect, it } from 'vitest';
import type {
  WorkspaceGraphAuthoringDraft,
  WorkspaceGraphAuthoringEdgeExecutionGateCommand,
} from '@dvt/contracts';

import type { CanvasAuthoringDraftRecord } from './canvasDraftReadModel';
import { buildCanvasAuthoringDraft } from './canvasDraftAuthoring';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';

const SOURCE_ID = 'source';
const TARGET_ID = 'target';

function buildDraft(
  gate: WorkspaceGraphAuthoringEdgeExecutionGateCommand = 'open'
): WorkspaceGraphAuthoringDraft {
  return {
    canvas: { kind: 'transformation', title: 'Canvas' },
    nodeIds: [SOURCE_ID, TARGET_ID],
    nodePositions: {
      [SOURCE_ID]: { x: 0, y: 0 },
      [TARGET_ID]: { x: 200, y: 0 },
    },
    nodes: [SOURCE_ID, TARGET_ID].map((id) => ({
      id,
      name: id,
      pluginId: 'dvt',
      kind: 'transform',
      role: 'transform' as const,
      status: 'idle' as const,
      tags: [],
    })),
    edges: [
      {
        id: 'source-target',
        sourceId: SOURCE_ID,
        targetId: TARGET_ID,
        relation: 'lineage',
        ...(gate === 'closed' ? { metadata: { executionGate: 'closed' } } : {}),
      },
    ],
  } satisfies WorkspaceGraphAuthoringDraft;
}

function buildRecord(
  revision: string,
  gate: WorkspaceGraphAuthoringEdgeExecutionGateCommand = 'open'
): CanvasAuthoringDraftRecord {
  return {
    revision,
    savedAt: '2026-09-02T00:00:00.000Z',
    draft: buildDraft(gate),
  };
}

function bootstrap(
  gate: WorkspaceGraphAuthoringEdgeExecutionGateCommand = 'open'
): CanvasDraftSession {
  return canvasDraftSession.machine.bootstrap({
    remoteDraft: buildRecord('rev-1', gate),
    canonicalNodeIds: [SOURCE_ID, TARGET_ID],
    canonicalEdges: [{ sourceId: SOURCE_ID, targetId: TARGET_ID }],
  });
}

describe('Canvas draft edge execution gate', () => {
  it('hydrates a persisted closed gate and keeps it through edge replacement', () => {
    const session = bootstrap('closed');

    expect(session.workingSet.visibleEdges).toEqual([
      { sourceId: SOURCE_ID, targetId: TARGET_ID, executionGate: 'closed' },
    ]);
    expect(
      canvasDraftSession.workingSet.replaceEdges(session, [
        { sourceId: SOURCE_ID, targetId: TARGET_ID },
      ]).workingSet.visibleEdges
    ).toEqual([{ sourceId: SOURCE_ID, targetId: TARGET_ID, executionGate: 'closed' }]);
  });

  it('closes and reopens an existing edge but rejects a missing edge', () => {
    const session = bootstrap();
    const closed = canvasDraftSession.workingSet.setEdgeExecutionGate(session, {
      sourceId: SOURCE_ID,
      targetId: TARGET_ID,
      gate: 'closed',
    });

    expect(closed.workingSet.visibleEdges[0]?.executionGate).toBe('closed');
    expect(
      canvasDraftSession.workingSet.setEdgeExecutionGate(closed, {
        sourceId: SOURCE_ID,
        targetId: TARGET_ID,
        gate: 'open',
      }).workingSet.visibleEdges[0]?.executionGate
    ).toBeUndefined();
    expect(
      canvasDraftSession.workingSet.setEdgeExecutionGate(session, {
        sourceId: 'missing',
        targetId: TARGET_ID,
        gate: 'closed',
      })
    ).toBe(session);
  });

  it('does not transfer a closed gate when an edge is reconnected', () => {
    const session = bootstrap('closed');
    const reconnected = canvasDraftSession.workingSet.replaceEdges(session, [
      { sourceId: TARGET_ID, targetId: SOURCE_ID },
    ]);

    expect(reconnected.workingSet.visibleEdges).toEqual([
      { sourceId: TARGET_ID, targetId: SOURCE_ID },
    ]);
  });

  it('adopts a remote gate when local gate state is unchanged', () => {
    const locallyDirty = canvasDraftSession.workingSet.queueExplicitNodeIds(bootstrap(), [
      'pending-node',
    ]);
    const reloaded = canvasDraftSession.machine.reloadFromRemote(
      locallyDirty,
      buildRecord('rev-2', 'closed')
    );

    expect(reloaded.workingSet.visibleEdges[0]?.executionGate).toBe('closed');
    expect(reloaded.workingSet.pendingExplicitNodeIds).toEqual(['pending-node']);
  });

  it('keeps a local gate change when a remote revision arrives', () => {
    const locallyClosed = canvasDraftSession.workingSet.setEdgeExecutionGate(bootstrap(), {
      sourceId: SOURCE_ID,
      targetId: TARGET_ID,
      gate: 'closed',
    });
    const reloaded = canvasDraftSession.machine.reloadFromRemote(
      locallyClosed,
      buildRecord('rev-2')
    );

    expect(reloaded.workingSet.visibleEdges[0]?.executionGate).toBe('closed');
  });

  it('persists the gate without replacing structural execution metadata', () => {
    const draft = buildDraft();
    const result = buildCanvasAuthoringDraft({
      canvas: draft.canvas,
      nodeIds: draft.nodeIds,
      nodePositions: draft.nodePositions,
      visibleEdges: [{ sourceId: SOURCE_ID, targetId: TARGET_ID, executionGate: 'closed' }],
      canonicalNodes: draft.nodes.map((node) => ({
        ...node,
        kind: `dvt:${node.kind}`,
      })),
      canonicalEdges: [
        {
          id: 'source-target',
          sourceId: SOURCE_ID,
          targetId: TARGET_ID,
          relation: 'lineage',
          metadata: { executionDependency: false },
        },
      ],
    });

    expect(result.edges[0]?.metadata).toEqual({
      executionDependency: false,
      executionGate: 'closed',
    });
  });
});
