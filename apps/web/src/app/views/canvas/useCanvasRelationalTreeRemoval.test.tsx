// @vitest-environment jsdom
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { setupWorkbenchTest, root } from './CanvasRelationalTreeWorkbench.test-support';
import { createDvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationFilter } from './canvasSelectedRelationFilter';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import { useCanvasRelationalTreeRemoval } from './useCanvasRelationalTreeRemoval';
import { source } from './canvasRelationalOperator.test-support';

describe('selected Filter removal lifetime', () => {
  setupWorkbenchTest();
  it.each(['accept', 'unmount', 'read-only'] as const)(
    'publishes a Filter removal only while its command remains valid (%s)',
    async (outcome) => {
      const session = new CanvasRelationAnalysisSession('model');
      session.receive(
        createDvtSubstraitJoinDraft({
          left: source('records'),
          right: source('related'),
          targetNodeId: 'model',
        })
      );
      const schema = await session.query(session.rootId);
      const draft = await applySelectedRelationFilter(session, {
        intent: 'insert',
        relationId: session.rootId,
        expectedRevision: session.revision,
        fieldId: schema.bindings[0]!.fieldId,
        capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
        value: 'active',
      });
      const revision = session.revision;
      const relationId = session.rootId;
      const analysis = { document: draft, session, revision, error: null };
      const accept = vi.fn();
      let removal: ReturnType<typeof useCanvasRelationalTreeRemoval>;
      function Host({ enabled }: Readonly<{ enabled: boolean }>): React.JSX.Element | null {
        removal = useCanvasRelationalTreeRemoval({
          enabled,
          analysis,
          operation: 'inner_join',
          active: true,
          draft,
          selectedInputIds: ['source'],
          seed: null,
          targetNodeId: 'model',
          hydrate: () => true,
          accept,
        });
        return null;
      }
      await act(async () => root.render(<Host enabled />));
      // Hold the real schema query at its asynchronous boundary; release it after invalidation.
      const query = session.query.bind(session);
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      vi.spyOn(session, 'query').mockImplementation(async (...args) => {
        await gate;
        return query(...args);
      });
      await act(async () => removal!.remove(relationId));
      if (outcome === 'unmount') await act(async () => root.render(null));
      if (outcome === 'read-only') await act(async () => root.render(<Host enabled={false} />));
      await act(async () => {
        release();
        await gate;
      });
      if (outcome === 'accept') {
        expect(accept).toHaveBeenCalledOnce();
        expect(session.rootId).not.toBe(relationId);
      } else {
        expect(accept).not.toHaveBeenCalled();
        expect(session.rootId).toBe(relationId);
        expect(session.revision).toBe(revision);
      }
      session.dispose();
    }
  );
});
