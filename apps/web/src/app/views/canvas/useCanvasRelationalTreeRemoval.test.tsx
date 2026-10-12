// @vitest-environment jsdom
/** Owned concern: prove consent is revision-bound and never deletes dependent cards. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { setupWorkbenchTest, root } from './CanvasRelationalTreeWorkbench.test-support';
import { graphJoin } from './canvasRelationGraph.test-support';
import { useCanvasRelationalTreeRemoval } from './useCanvasRelationalTreeRemoval';
import { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';

describe('card removal consent', () => {
  setupWorkbenchTest();
  it.each(['confirm', 'cancel', 'read-only', 'stale', 'unmount', 'double'] as const)(
    'guards dependent source removal (%s)',
    async (outcome) => {
      const { document, session } = graphJoin();
      const revision = session.revision;
      const target = session.locate(session.rootId, revision).inputs[0]!;
      const analysis = {
        document,
        session,
        revision,
        permissionIdentity: '[[],[]]',
        error: null,
        refresh: vi.fn(),
      };
      const start = vi.fn(() => true);
      const ids = ['left', 'right'];
      let removal!: ReturnType<typeof useCanvasRelationalTreeRemoval>;
      let state!: ReturnType<typeof useCanvasRelationalTreeDraftState>;
      function Host({ enabled }: Readonly<{ enabled: boolean }>): null {
        state = useCanvasRelationalTreeDraftState();
        removal = useCanvasRelationalTreeRemoval({
          enabled,
          analysis,
          sourceNodeIds: ids,
          outputRelationId: session.rootId,
          state,
          start,
        });
        return null;
      }
      await act(async () => root.render(<Host enabled />));
      await act(async () => removal.remove(target));
      expect(removal.pending?.target.id).toBe(target);
      expect(start).not.toHaveBeenCalled();
      expect(state.pendingSources).toEqual([]);
      expect(session.revision).toBe(revision);
      if (outcome === 'read-only') await act(async () => root.render(<Host enabled={false} />));
      if (outcome === 'stale') await act(async () => state.setStagedOperations([]));
      if (outcome === 'unmount') await act(async () => root.render(null));
      await act(async () => (outcome === 'cancel' ? removal.cancel() : removal.confirm()));
      if (outcome === 'double') await act(async () => removal.confirm());
      const accepted = outcome === 'confirm' || outcome === 'double';
      expect(start).toHaveBeenCalledTimes(accepted ? 1 : 0);
      expect(session.revision).toBe(revision);
      expect(session.hasDocument(document)).toBe(true);
      if (accepted) {
        expect(state.pendingSources).toHaveLength(1);
        expect(state.stagedOperations).toHaveLength(1);
        expect(state.stagedOperations[0]).toMatchObject({
          id: session.rootId,
          inputs: [null, session.locate(session.rootId, revision).inputs[1]],
        });
        expect(state.stagedOperations[0]!.semanticDocument).toBeUndefined();
        expect(state.stagedOperations[0]!.configurationDocument).toBeDefined();
      }
      session.dispose();
    }
  );
});
