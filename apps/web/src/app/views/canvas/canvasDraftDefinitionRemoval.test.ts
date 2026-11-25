import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import type { CanvasAuthoringDraftRecord } from './canvasDraftReadModel';
import { buildCanvasAuthoringDraft } from './canvasDraftAuthoring';
import { buildCurrentDraftPayload } from './canvasDraftLifecycleSnapshot';
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

describe('empty definition removal through the Canvas draft session', () => {
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
