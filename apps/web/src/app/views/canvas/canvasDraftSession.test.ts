import { describe, expect, it } from 'vitest';

import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
import { canvasDraftSession } from './canvasDraftSession';

function buildRemoteDraftRecord(
  overrides?: Partial<WorkspaceGraphDraftRecord>
): WorkspaceGraphDraftRecord {
  return {
    revision: 'rev-1',
    savedAt: '2026-04-17T00:00:00Z',
    draft: {
      canvas: {
        kind: 'transformation',
        title: 'Main canvas',
      },
      nodeIds: ['node_1', 'node_2'],
      nodePositions: {
        node_1: { x: 0, y: 0 },
        node_2: { x: 100, y: 0 },
      },
      edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
    },
    ...overrides,
  };
}

describe('canvasDraftSession', () => {
  it('bootstraps to the canonical snapshot when no remote draft exists', () => {
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: ['node_1', 'node_2'],
      canonicalEdges: [{ sourceId: 'node_1', targetId: 'node_2' }],
    });

    expect(session.syncState).toBe('editing');
    expect(session.draftRevision).toBeNull();
    expect(session.workingSet).toEqual({
      visibleNodeIds: ['node_1', 'node_2'],
      visibleEdges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      pendingExplicitNodeIds: [],
    });
  });

  it('bootstraps to the persisted draft subset when a remote draft exists', () => {
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: buildRemoteDraftRecord({
        draft: {
          canvas: {
            kind: 'transformation',
            title: 'Main canvas',
          },
          nodeIds: ['node_2', 'node_remote_only'],
          nodePositions: {
            node_2: { x: 220, y: 120 },
            node_remote_only: { x: 320, y: 160 },
          },
          edges: [{ sourceId: 'node_2', targetId: 'node_remote_only' }],
        },
      }),
      canonicalNodeIds: ['node_1', 'node_2'],
      canonicalEdges: [{ sourceId: 'node_1', targetId: 'node_2' }],
    });

    expect(session.syncState).toBe('editing');
    expect(session.draftRevision).toBe('rev-1');
    expect(session.workingSet.visibleNodeIds).toEqual(['node_2', 'node_remote_only']);
    expect(session.workingSet.visibleEdges).toEqual([
      { sourceId: 'node_2', targetId: 'node_remote_only' },
    ]);
  });

  it('promotes queued explicit nodes and their canonical edges when they appear in a refreshed snapshot', () => {
    const queuedSession = canvasDraftSession.workingSet.queueExplicitNodeIds(
      canvasDraftSession.machine.bootstrap({
        remoteDraft: buildRemoteDraftRecord({
          draft: {
            canvas: {
              kind: 'transformation',
              title: 'Main canvas',
            },
            nodeIds: ['node_1'],
            nodePositions: {
              node_1: { x: 0, y: 0 },
            },
            edges: [],
          },
        }),
        canonicalNodeIds: ['node_1'],
        canonicalEdges: [],
      }),
      ['node_imported']
    );

    const reconciledSession = canvasDraftSession.workingSet.reconcileSnapshot(queuedSession, {
      canonicalNodeIds: ['node_1', 'node_imported'],
      canonicalEdges: [{ sourceId: 'node_1', targetId: 'node_imported' }],
    });

    expect(reconciledSession.workingSet.visibleNodeIds).toEqual(['node_1', 'node_imported']);
    expect(reconciledSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'node_1', targetId: 'node_imported' },
    ]);
    expect(reconciledSession.workingSet.pendingExplicitNodeIds).toEqual([]);
  });

  it('does not auto-merge unrelated new snapshot nodes into an active draft', () => {
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: buildRemoteDraftRecord({
        draft: {
          canvas: {
            kind: 'transformation',
            title: 'Main canvas',
          },
          nodeIds: ['node_1'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
          },
          edges: [],
        },
      }),
      canonicalNodeIds: ['node_1'],
      canonicalEdges: [],
    });

    const reconciledSession = canvasDraftSession.workingSet.reconcileSnapshot(session, {
      canonicalNodeIds: ['node_1', 'node_new'],
      canonicalEdges: [],
    });

    expect(reconciledSession.workingSet.visibleNodeIds).toEqual(['node_1']);
    expect(reconciledSession.workingSet.pendingExplicitNodeIds).toEqual([]);
  });

  it('returns the same session reference when reconciliation produces no working-set change', () => {
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: ['node_1', 'node_2'],
      canonicalEdges: [{ sourceId: 'node_1', targetId: 'node_2' }],
    });

    expect(
      canvasDraftSession.workingSet.reconcileSnapshot(session, {
        canonicalNodeIds: ['node_1', 'node_2'],
        canonicalEdges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      })
    ).toBe(session);
  });

  it('preserves authoritative remote members when the current snapshot is behind', () => {
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: buildRemoteDraftRecord({
        draft: {
          canvas: {
            kind: 'transformation',
            title: 'Main canvas',
          },
          nodeIds: ['node_1', 'node_remote_only'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_remote_only: { x: 220, y: 140 },
          },
          edges: [{ sourceId: 'node_1', targetId: 'node_remote_only' }],
        },
      }),
      canonicalNodeIds: ['node_1', 'node_remote_only'],
      canonicalEdges: [{ sourceId: 'node_1', targetId: 'node_remote_only' }],
    });

    const reconciledSession = canvasDraftSession.workingSet.reconcileSnapshot(session, {
      canonicalNodeIds: ['node_1'],
      canonicalEdges: [],
    });

    expect(reconciledSession.workingSet.visibleNodeIds).toEqual(['node_1', 'node_remote_only']);
    expect(reconciledSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'node_1', targetId: 'node_remote_only' },
    ]);
  });

  it('stores local overrides for visible persisted nodes without changing the working set', () => {
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: buildRemoteDraftRecord({
        draft: {
          canvas: {
            kind: 'transformation',
            title: 'Main canvas',
          },
          nodeIds: ['node_1'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
          },
          edges: [],
        },
      }),
      canonicalNodeIds: ['node_1'],
      canonicalEdges: [],
    });

    const updatedSession = canvasDraftSession.workingSet.upsertNode(session, {
      id: 'node_1',
      name: 'orders_renamed',
      description: 'Inspector-authored description',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
    });

    expect(updatedSession.workingSet).toEqual(session.workingSet);
    expect(updatedSession.localNodeCatalog).toEqual({
      node_1: expect.objectContaining({
        id: 'node_1',
        name: 'orders_renamed',
        description: 'Inspector-authored description',
      }),
    });
  });

  it('transitions to conflict while retaining the new remote baseline', () => {
    const session = canvasDraftSession.machine.applyConflict(
      canvasDraftSession.machine.bootstrap({
        remoteDraft: null,
        canonicalNodeIds: ['node_1'],
        canonicalEdges: [],
      }),
      buildRemoteDraftRecord({ revision: 'rev-conflict' })
    );

    expect(session.syncState).toBe('conflict');
    expect(session.draftRevision).toBe('rev-conflict');
    expect(session.baseline.record?.revision).toBe('rev-conflict');
  });

  it('promotes a successful save into the new editing baseline', () => {
    const session = canvasDraftSession.machine.applySaveSuccess(
      canvasDraftSession.machine.markSaving(
        canvasDraftSession.machine.bootstrap({
          remoteDraft: null,
          canonicalNodeIds: ['node_1'],
          canonicalEdges: [],
        })
      ),
      buildRemoteDraftRecord({ revision: 'rev-saved' })
    );

    expect(session.syncState).toBe('editing');
    expect(session.draftRevision).toBe('rev-saved');
    expect(session.baseline.record?.revision).toBe('rev-saved');
    expect(session.workingSet.visibleNodeIds).toEqual(['node_1', 'node_2']);
    expect(session.workingSet.visibleEdges).toEqual([{ sourceId: 'node_1', targetId: 'node_2' }]);
    expect(session.savingWorkingSet).toBeUndefined();
  });

  it('preserves local edits made while a save request is in flight', () => {
    const savingSession = canvasDraftSession.machine.markSaving(
      canvasDraftSession.machine.bootstrap({
        remoteDraft: null,
        canonicalNodeIds: ['node_1'],
        canonicalEdges: [],
      })
    );
    const editedWhileSavingSession = canvasDraftSession.workingSet.queueExplicitNodeIds(
      savingSession,
      ['node_local']
    );

    const session = canvasDraftSession.machine.applySaveSuccess(
      editedWhileSavingSession,
      buildRemoteDraftRecord({ revision: 'rev-saved' })
    );

    expect(session.syncState).toBe('editing');
    expect(session.draftRevision).toBe('rev-saved');
    expect(session.baseline.record?.revision).toBe('rev-saved');
    expect(session.workingSet).toEqual({
      visibleNodeIds: ['node_1'],
      visibleEdges: [],
      pendingExplicitNodeIds: ['node_local'],
    });
    expect(session.savingWorkingSet).toBeUndefined();
  });

  it('transitions to missing_remote when the persisted draft disappears', () => {
    const session = canvasDraftSession.machine.markRemoteDraftMissing(
      canvasDraftSession.machine.reloadFromRemote(
        canvasDraftSession.machine.createBootstrapping(),
        buildRemoteDraftRecord()
      )
    );

    expect(session.syncState).toBe('missing_remote');
    expect(session.draftRevision).toBeNull();
    expect(session.baseline.record).toBeNull();
  });

  it('preserves last authoritative visible canonical nodes when the persisted draft disappears', () => {
    const session = canvasDraftSession.machine.markRemoteDraftMissing(
      canvasDraftSession.machine.reloadFromRemote(
        canvasDraftSession.machine.createBootstrapping(),
        buildRemoteDraftRecord()
      ),
      {
        node_1: {
          id: 'node_1',
          name: 'orders',
          pluginId: 'dvt',
          kind: 'dvt:source',
          role: 'input',
          status: 'idle',
          tags: [],
        },
      }
    );

    expect(session.syncState).toBe('missing_remote');
    expect(session.localNodeCatalog).toEqual({
      node_1: expect.objectContaining({
        id: 'node_1',
        kind: 'dvt:source',
      }),
    });
  });
});
