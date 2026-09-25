// @vitest-environment jsdom
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { setupWorkbenchTest, root } from './CanvasRelationalTreeWorkbench.test-support';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import { applySelectedRelationFilter } from './canvasSelectedRelationFilter';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import { useCanvasRelationalTreeRemoval } from './useCanvasRelationalTreeRemoval';
import { source } from './canvasRelationalOperator.test-support';

describe('selected unary removal lifetime', () => {
  setupWorkbenchTest();
  it.each(
    ['filter', 'sort', 'fetch'].flatMap((operator) =>
      ['accept', 'unmount', 'read-only'].map((outcome) => ({ operator, outcome }))
    )
  )(
    'publishes $operator removal only while its command remains valid ($outcome)',
    async ({ operator, outcome }) => {
      const session = new CanvasRelationAnalysisSession('model');
      session.receive(
        createCustomerOrdersJoin({
          left: source('records'),
          right: source('related'),
          targetNodeId: 'model',
        })
      );
      const schema = await session.query(session.rootId);
      const request = {
        intent: 'insert' as const,
        relationId: session.rootId,
        expectedRevision: session.revision,
        fieldId: schema.bindings[0]!.fieldId,
        capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
        value: 'active',
      };
      const draft =
        operator === 'filter'
          ? await applySelectedRelationFilter(session, request)
          : await applySelectedRelationSortFetch(session, {
              ...request,
              ...(operator === 'sort'
                ? {
                    operation: 'sort' as const,
                    keys: [
                      {
                        fieldId: request.fieldId,
                        direction: SortField_SortDirection.ASC_NULLS_LAST as const,
                      },
                    ],
                  }
                : { operation: 'fetch' as const, count: 10n }),
            });
      const revision = session.revision;
      const relationId = session.rootId;
      const analysis = { document: draft, session, revision, error: null, refresh: vi.fn() };
      const accept = vi.fn();
      let removal: ReturnType<typeof useCanvasRelationalTreeRemoval>;
      function Host({ enabled }: Readonly<{ enabled: boolean }>): React.JSX.Element | null {
        removal = useCanvasRelationalTreeRemoval({
          enabled,
          analysis,
          active: true,
          draft,
          selectedInputIds: ['records', 'related'],
          seed: null,
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
        expect(accept.mock.calls[0]![0].operation).toBe('inner_join');
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
