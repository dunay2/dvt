import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import type { CanvasAuthoringDraftRecord } from './canvasDraftReadModel';
import { buildCanvasAuthoringDraft } from './canvasDraftAuthoring';
import {
  buildCurrentDraftPayload,
  isCurrentDraftProjectable,
} from './canvasDraftLifecycleSnapshot';
import { removeEmptyCanvasModelDefinition } from './canvasDraftDefinitionRemoval';

function model(id: string): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: { typeLabel: 'Model' },
  };
}

function fixture(visible = false): Readonly<{
  nodes: CanonicalNode[];
  record: CanvasAuthoringDraftRecord;
  session: CanvasDraftSession;
}> {
  const nodes = [model('target'), model('neighbor')];
  const draft = buildCanvasAuthoringDraft({
    canvas: { id: 'main', kind: 'transformation', title: 'Main' },
    nodeIds: visible ? ['target'] : [],
    nodePositions: visible ? { target: { x: 0, y: 0 } } : {},
    visibleEdges: [],
    canonicalNodes: nodes,
    canonicalEdges: [],
  });
  const record = { revision: 'rev-1', savedAt: '2026-11-25T00:00:00Z', draft };
  return {
    nodes,
    record,
    session: canvasDraftSession.machine.bootstrap({
      remoteDraft: record,
      canonicalNodeIds: nodes.map((node) => node.id),
      canonicalEdges: [],
    }),
  };
}

function referenceFixture(): ReturnType<typeof fixture> {
  const reference: CanonicalNode = {
    id: 'target-ref',
    definitionId: 'target',
    name: 'target 2',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
  };
  const nodes = [...fixture().nodes, reference];
  const draft = buildCanvasAuthoringDraft({
    canvas: { id: 'main', kind: 'transformation', title: 'Main' },
    nodeIds: ['target', reference.id],
    nodePositions: { target: { x: 0, y: 0 }, [reference.id]: { x: 200, y: 0 } },
    visibleEdges: [],
    canonicalNodes: nodes,
    canonicalEdges: [],
  });
  const record = { revision: 'rev-1', savedAt: '2026-11-25T00:00:00Z', draft };
  return {
    nodes,
    record,
    session: canvasDraftSession.machine.bootstrap({
      remoteDraft: record,
      canonicalNodeIds: nodes.map((node) => node.id),
      canonicalEdges: [],
    }),
  };
}

function saveAndReopenRemoval(
  session: CanvasDraftSession,
  nodes: CanonicalNode[]
): Readonly<{
  payload: CanvasAuthoringDraftRecord['draft'];
  acknowledged: CanvasDraftSession;
  reopened: CanvasDraftSession;
}> {
  const record = session.baseline.record!;
  const payload = buildCurrentDraftPayload(
    record.draft.nodePositions,
    session,
    { canvas: record.draft.canvas, baseline: record.draft },
    { canonicalNodes: nodes, canonicalEdges: [] }
  );
  const saved = { ...record, revision: 'rev-2', draft: payload };
  const acknowledged = canvasDraftSession.machine.applySaveSuccess(
    canvasDraftSession.machine.markSaving(session),
    saved
  );
  const reopened = canvasDraftSession.machine.bootstrap({
    remoteDraft: saved,
    canonicalNodeIds: payload.nodes.map((node) => node.id),
    canonicalEdges: [],
  });
  return { payload, acknowledged, reopened };
}

describe('empty definition removal through the Canvas draft session', () => {
  it('keeps the directly placed original when a reference is removed before and after Save', () => {
    const { nodes, session } = referenceFixture();
    const removed = canvasDraftSession.workingSet.removeNode(session, 'target-ref');
    expect(removed.workingSet.visibleNodeIds).toEqual(['target']);
    expect(removed.removedDefinitionIds).toBeUndefined();
    const saved = saveAndReopenRemoval(removed, nodes);
    expect(isCurrentDraftProjectable(saved.payload, removed)).toBe(true);
    expect(saved.payload.nodeIds).toEqual(['target']);
    expect(saved.payload.nodes.map((node) => node.id)).toEqual(['target', 'neighbor']);
    expect(saved.acknowledged.workingSet.visibleNodeIds).toEqual(['target']);
    expect(saved.reopened.workingSet.visibleNodeIds).toEqual(['target']);
    expect(saved.reopened.baseline.record?.draft.nodes.some((node) => node.id === 'target')).toBe(
      true
    );
  });

  it('keeps the shared definition when its original placement is removed and a reference remains', () => {
    const { nodes, session } = referenceFixture();
    const removed = canvasDraftSession.workingSet.removeNode(session, 'target');
    expect(removed.workingSet.visibleNodeIds).toEqual(['target-ref']);
    expect(removed.removedDefinitionIds).toBeUndefined();
    const saved = saveAndReopenRemoval(removed, nodes);
    expect(isCurrentDraftProjectable(saved.payload, removed)).toBe(true);
    expect(saved.payload.nodeIds).toEqual(['target-ref']);
    expect(saved.payload.nodes.find((node) => node.id === 'target')).toBeDefined();
    expect(saved.payload.nodes.find((node) => node.id === 'target-ref')?.definitionId).toBe(
      'target'
    );
    expect(saved.reopened.workingSet.visibleNodeIds).toEqual(['target-ref']);
  });

  it('retires the empty definition when the last reference is removed without an original placement', () => {
    const { nodes, session } = referenceFixture();
    const withoutOriginal = canvasDraftSession.workingSet.removeNode(session, 'target');
    const removed = canvasDraftSession.workingSet.removeNode(withoutOriginal, 'target-ref');
    expect(removed.workingSet.visibleNodeIds).toEqual([]);
    expect(removed.removedDefinitionIds).toEqual(['target']);
    const saved = saveAndReopenRemoval(removed, nodes);
    expect(isCurrentDraftProjectable(saved.payload, removed)).toBe(true);
    expect(saved.payload.nodeIds).toEqual([]);
    expect(saved.payload.nodes.map((node) => node.id)).toEqual(['neighbor']);
    expect(saved.acknowledged.removedDefinitionIds).toBeUndefined();
    expect(saved.reopened.workingSet.visibleNodeIds).toEqual([]);
    expect(saved.reopened.baseline.record?.draft.nodes.map((node) => node.id)).toEqual([
      'neighbor',
    ]);
  });

  it('removes an orphan from the actual save payload while keeping the baseline immutable', () => {
    const { nodes, record, session } = fixture();
    const removed = removeEmptyCanvasModelDefinition(session, 'target');
    expect(removed.removedDefinitionIds).toEqual(['target']);
    expect(removed.baseline.record).toBe(record);
    const payload = buildCurrentDraftPayload(
      {},
      removed,
      { canvas: record.draft.canvas, baseline: record.draft },
      { canonicalNodes: nodes, canonicalEdges: [] }
    );
    expect(payload.nodes.map((node) => node.id)).toEqual(['neighbor']);
    expect(payload.canvases?.[0]?.nodes.map((node) => node.id)).toEqual(['neighbor']);
    const saved = { ...record, revision: 'rev-2', draft: payload };
    const ack = canvasDraftSession.machine.applySaveSuccess(
      canvasDraftSession.machine.markSaving(removed),
      saved
    );
    expect(ack.removedDefinitionIds).toBeUndefined();
    const reopened = canvasDraftSession.machine.bootstrap({
      remoteDraft: saved,
      canonicalNodeIds: ['neighbor'],
      canonicalEdges: [],
    });
    expect(reopened.baseline.record?.draft.nodes.map((node) => node.id)).toEqual(['neighbor']);
  });

  it('removes an unused empty definition when its last card is removed', () => {
    const { session } = fixture(true);
    const removed = canvasDraftSession.workingSet.removeNode(session, 'target');
    expect(removed.workingSet.visibleNodeIds).toEqual([]);
    expect(removed.removedDefinitionIds).toEqual(['target']);
  });

  it('preserves an authored definition when its card is removed', () => {
    const { session } = fixture(true);
    const authored = {
      ...session,
      localNodeCatalog: {
        target: { ...model('target'), metadata: { config: { materialized: 'table' } } },
      },
    };
    const removed = canvasDraftSession.workingSet.removeNode(authored, 'target');
    expect(removed.workingSet.visibleNodeIds).toEqual([]);
    expect(removed.removedDefinitionIds).toBeUndefined();
    expect(removed.localNodeCatalog?.target).toBe(authored.localNodeCatalog.target);
  });

  it('keeps a later orphan removal pending after an earlier save acknowledgement', () => {
    const { record, session } = fixture();
    const first = canvasDraftSession.machine.markSaving(
      removeEmptyCanvasModelDefinition(session, 'target')
    );
    const second = removeEmptyCanvasModelDefinition(first, 'neighbor');
    const earlierSaved = {
      ...record,
      revision: 'rev-2',
      draft: { ...record.draft, nodes: record.draft.nodes.filter((node) => node.id !== 'target') },
    };
    const ack = canvasDraftSession.machine.applySaveSuccess(second, earlierSaved);
    expect(ack.removedDefinitionIds).toEqual(['neighbor']);
    expect(
      buildCurrentDraftPayload(
        {},
        ack,
        { canvas: record.draft.canvas, baseline: earlierSaved.draft },
        { canonicalNodes: [model('neighbor')], canonicalEdges: [] }
      ).nodes
    ).toEqual([]);
  });

  it('cancels deletion on conflict and keeps the current remote definition', () => {
    const { record, session } = fixture();
    const remote = { ...record, revision: 'rev-2' };
    const conflict = canvasDraftSession.machine.applyConflict(
      removeEmptyCanvasModelDefinition(session, 'target'),
      remote
    );
    expect(conflict.removedDefinitionIds).toBeUndefined();
    expect(conflict.baseline.record).toBe(remote);
  });

  it('retains an intention on same-revision hydration and cancels it on a changed remote revision', () => {
    const { record, session } = fixture();
    const removed = removeEmptyCanvasModelDefinition(session, 'target');
    const hydrated = canvasDraftSession.machine.reloadFromRemote(removed, record);
    expect(hydrated.removedDefinitionIds).toEqual(['target']);
    const revised = { ...record, revision: 'rev-2' };
    const rebased = canvasDraftSession.machine.reloadFromRemote(hydrated, revised);
    expect(rebased.removedDefinitionIds).toBeUndefined();
    expect(rebased.baseline.record).toBe(revised);
  });

  it('does not erase a legitimate replacement using a previously removed local id', () => {
    const { session } = fixture();
    const removed = removeEmptyCanvasModelDefinition(session, 'target');
    const replaced = canvasDraftSession.workingSet.upsertNode(removed, {
      ...model('target'),
      name: 'Replacement',
    });
    expect(replaced.removedDefinitionIds).toBeUndefined();
    expect(replaced.localNodeCatalog?.target?.name).toBe('Replacement');
  });
});
