/** Verify file discovery remains private until one current, authorized Apply. */
import { describe, expect, it, vi } from 'vitest';
import { DbtProjectGraphProjectionSchema } from '@dvt/contracts';
import { dbtModelProjection } from './canvasDbtModelReference.test-fixtures';
import {
  discoverCanvasDbtModels,
  guardDiscoveredDbtCompositionApply,
} from './canvasDbtModelCompositionDiscovery';
import { prepareCanvasDbtModelCompositionReference } from './canvasDbtModelCompositionDiscovery';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { TRANSFORM } from './canvasOutputProjection.test-support';
import type { CanvasInspectorNodeDraftInputChanges } from './canvasInspectorAuthoring.types';

function discoveredChanges(): CanvasInspectorNodeDraftInputChanges {
  const discovery = [...discoverCanvasDbtModels(dbtModelProjection, []).values()][0]!;
  const copy = prepareCanvasDbtModelCompositionReference({
    nodes: [discovery.definition],
    sourceId: discovery.definition.id,
    discovery,
  });
  return {
    inputAdditions: [],
    modelCopies: [
      {
        copy,
        receiverEdge: {
          id: 'linked-edge',
          sourceId: copy.node.id,
          targetId: TRANSFORM.id,
          relation: 'lineage',
        },
      },
    ],
    signal: new AbortController().signal,
  };
}

describe('file-only Model composition discovery', () => {
  it('retains one reference snapshot and revalidates once before the existing Apply', async () => {
    const changes = discoveredChanges();
    const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
    const refresh = vi.fn(async () => dbtModelProjection);
    const guarded = guardDiscoveredDbtCompositionApply(
      { canEditNode: true, onApplyNodeDraft: apply },
      refresh
    )!;
    expect(apply).not.toHaveBeenCalled();
    const draft = createCanvasInspectorNodeDraft(TRANSFORM);
    expect(await guarded.onApplyNodeDraft(TRANSFORM.id, draft, changes)).toEqual({
      outcome: 'no_changes',
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledExactlyOnceWith(TRANSFORM.id, draft, changes);
  });

  it.each(['revision', 'analysis', 'connection', 'authority', 'output'] as const)(
    'rejects changed %s without calling Apply',
    async (kind) => {
      const current = structuredClone(dbtModelProjection);
      if (kind === 'revision')
        current.projectRevision = DbtProjectGraphProjectionSchema.parse({
          ...current,
          projectRevision: { ...current.projectRevision, contentSetSha256: 'c'.repeat(64) },
        }).projectRevision;
      if (kind === 'analysis')
        current.analysisSha256 = DbtProjectGraphProjectionSchema.parse({
          ...current,
          analysisSha256: 'd'.repeat(64),
        }).analysisSha256;
      if (kind === 'connection') current.executionTarget!.connectionRef!.connectionId = 'other';
      if (kind === 'authority') current.authorityBinding.canvasId = 'other';
      if (kind === 'output') current.nodes[0]!.columns[0]!.name = 'changed';
      const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
      const guarded = guardDiscoveredDbtCompositionApply(
        { canEditNode: true, onApplyNodeDraft: apply },
        async () => current
      )!;
      expect(
        await guarded.onApplyNodeDraft(
          TRANSFORM.id,
          createCanvasInspectorNodeDraft(TRANSFORM),
          discoveredChanges()
        )
      ).toMatchObject({ outcome: 'rejected' });
      expect(apply).not.toHaveBeenCalled();
    }
  );

  it('denies permission and cancellation before any discovery read or publication', async () => {
    const refresh = vi.fn(async () => dbtModelProjection);
    const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
    const denied = guardDiscoveredDbtCompositionApply(
      { canEditNode: false, onApplyNodeDraft: apply },
      refresh
    )!;
    expect(
      await denied.onApplyNodeDraft(
        TRANSFORM.id,
        createCanvasInspectorNodeDraft(TRANSFORM),
        discoveredChanges()
      )
    ).toMatchObject({ outcome: 'rejected' });
    const lifetime = new AbortController();
    lifetime.abort();
    const allowed = guardDiscoveredDbtCompositionApply(
      { canEditNode: true, onApplyNodeDraft: apply },
      refresh
    )!;
    await expect(
      Promise.resolve().then(() =>
        allowed.onApplyNodeDraft(TRANSFORM.id, createCanvasInspectorNodeDraft(TRANSFORM), {
          ...discoveredChanges(),
          signal: lifetime.signal,
        })
      )
    ).rejects.toThrow();
    expect(refresh).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });

  it('does not apply after the Model lifetime ends during the current-publication read', async () => {
    const lifetime = new AbortController();
    const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
    const refresh = vi.fn(async () => {
      lifetime.abort();
      return dbtModelProjection;
    });
    const guarded = guardDiscoveredDbtCompositionApply(
      { canEditNode: true, onApplyNodeDraft: apply },
      refresh
    )!;
    await expect(
      guarded.onApplyNodeDraft(TRANSFORM.id, createCanvasInspectorNodeDraft(TRANSFORM), {
        ...discoveredChanges(),
        signal: lifetime.signal,
      })
    ).rejects.toThrow();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(apply).not.toHaveBeenCalled();
  });
});
