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
import { createSourceRelation } from './canvasSourceRelation';
import { createSourceDocument } from './canvasSourceDocument';

describe('selected unary removal lifetime', () => {
  setupWorkbenchTest();
  it.each(['confirm', 'cancel', 'stale', 'read-only'] as const)(
    'guards final-source clearing with dependent operations (%s)',
    async (outcome) => {
      const session = new CanvasRelationAnalysisSession('model');
      const read = createSourceRelation({ source: source('records'), fields: ['customer_id'] }, 1);
      session.receive(createSourceDocument([read], read));
      const draft = await applySelectedRelationSortFetch(session, {
        operation: 'fetch',
        relationId: session.rootId,
        expectedRevision: session.revision,
        intent: 'insert',
        count: 10n,
      });
      const analysis = {
        document: draft,
        session,
        revision: session.revision,
        permissionIdentity: '[[],[]]',
        error: null,
        refresh: vi.fn(),
      };
      const clear = vi.fn();
      const accept = vi.fn();
      const hydrate = vi.fn(() => true);
      let removal: ReturnType<typeof useCanvasRelationalTreeRemoval>;
      function Host({ enabled }: Readonly<{ enabled: boolean }>): null {
        removal = useCanvasRelationalTreeRemoval({
          enabled,
          analysis,
          active: false,
          selectedInputIds: [],
          seed: { draft, inputIds: ['records'], operation: 'projection' },
          hydrate,
          accept,
          clear,
        });
        return null;
      }
      await act(async () => root.render(<Host enabled />));
      await act(async () => removal!.remove(read.binding.relationId));
      expect(removal!.pending?.result.operations).toHaveLength(1);
      expect(clear).not.toHaveBeenCalled();
      if (outcome === 'stale')
        await applySelectedRelationSortFetch(session, {
          operation: 'fetch',
          relationId: session.rootId,
          expectedRevision: session.revision,
          intent: 'edit',
          count: 20n,
        });
      if (outcome === 'read-only') await act(async () => root.render(<Host enabled={false} />));
      await act(async () => (outcome === 'cancel' ? removal!.cancel() : removal!.confirm()));
      expect(clear).toHaveBeenCalledTimes(outcome === 'confirm' ? 1 : 0);
      expect(hydrate).toHaveBeenCalledTimes(outcome === 'confirm' ? 1 : 0);
      expect(accept).not.toHaveBeenCalled();
      expect(session.locate(read.binding.relationId, session.revision).relation.relType.case).toBe(
        'read'
      );
      session.dispose();
    }
  );
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
      let draft =
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
      const relationId = session.rootId;
      draft = await applySelectedRelationSortFetch(session, {
        operation: 'fetch',
        relationId,
        expectedRevision: session.revision,
        intent: 'insert',
        count: 77n,
      });
      const consumerId = session.rootId;
      const revision = session.revision;
      const analysis = {
        document: draft,
        session,
        revision,
        permissionIdentity: '[[],[]]',
        error: null,
        refresh: vi.fn(),
      };
      const accept = vi.fn();
      let removal: ReturnType<typeof useCanvasRelationalTreeRemoval>;
      function Host({ enabled }: Readonly<{ enabled: boolean }>): React.JSX.Element | null {
        removal = useCanvasRelationalTreeRemoval({
          enabled,
          analysis,
          active: true,
          selectedInputIds: ['records', 'related'],
          seed: null,
          hydrate: () => true,
          clear: vi.fn(),
          accept,
        });
        return null;
      }
      await act(async () => root.render(<Host enabled />));
      // Hold the consumer's real schema query; retiring a root alone needs no schema work.
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
        expect(() => session.locate(relationId, session.revision)).toThrow();
        expect(session.rootId).toBe(consumerId);
      } else {
        expect(accept).not.toHaveBeenCalled();
        expect(session.rootId).toBe(consumerId);
        expect(session.revision).toBe(revision);
      }
      session.dispose();
    }
  );
});
