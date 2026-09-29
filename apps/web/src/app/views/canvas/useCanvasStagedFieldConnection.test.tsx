// @vitest-environment jsdom
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { setupWorkbenchTest, root } from './CanvasRelationalTreeWorkbench.test-support';
import { useCanvasStagedFieldConnection } from './useCanvasStagedFieldConnection';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import type { CanvasRelationalFieldReference } from './canvasRelationalTreeDrag';

describe('field connection lifetime', () => {
  setupWorkbenchTest();
  async function mount(): Promise<{
    session: CanvasRelationAnalysisSession;
    schema: Awaited<ReturnType<CanvasRelationAnalysisSession['query']>>;
    reference: CanvasRelationalFieldReference;
    writes: ReturnType<typeof vi.fn>;
    operations: () => readonly CanvasStagedOperation[];
    connect: (signal?: AbortSignal) => Promise<boolean>;
    update: (options: {
      editable?: boolean;
      consumedProducerIds?: readonly string[];
    }) => Promise<void>;
    remove: () => Promise<void>;
    occupy: () => Promise<void>;
    reconfigure: () => Promise<void>;
  }> {
    const document = connectedNamesProjectionDraft();
    const session = new CanvasRelationAnalysisSession('connection-test');
    session.receive(document);
    const schema = await session.query(session.rootId);
    const reference = {
      rootId: session.rootId,
      relationId: session.rootId,
      revision: session.revision,
      fieldId: schema.bindings[1]!.fieldId,
    };
    let operations: readonly CanvasStagedOperation[] = [
      { id: 'pending-operation:one', operation: 'field_transform', inputs: [null] },
    ];
    const writes = vi.fn();
    let options = { editable: true, consumedProducerIds: [] as readonly string[] };
    let connect!: ReturnType<typeof useCanvasStagedFieldConnection>;
    function Host(): null {
      connect = useCanvasStagedFieldConnection(
        {
          ...options,
          start: () => true,
          operations,
          setOperations: (update) => {
            const next = update(operations);
            if (next !== operations) writes(next);
            operations = next;
          },
          selectedId: null,
          setSelectedId: vi.fn(),
          producerIds: [session.rootId],
        },
        { session, document, error: null, revision: session.revision, refresh: vi.fn() }
      );
      return null;
    }
    const render = async (): Promise<void> => {
      await act(async () => {
        root.render(<Host />);
      });
    };
    await render();
    return {
      session,
      schema,
      reference,
      writes,
      operations: () => operations,
      connect: (signal = new AbortController().signal) =>
        connect(reference, 'pending-operation:one', 0, signal),
      update: async (update: Partial<typeof options>) => {
        options = { ...options, ...update };
        await render();
      },
      remove: async () => {
        operations = [];
        await render();
      },
      occupy: async () => {
        operations = [{ ...operations[0]!, inputs: ['other'] }];
        await render();
      },
      reconfigure: async () => {
        operations = [{ ...operations[0]!, operation: 'filter' }];
        await render();
      },
    };
  }

  it('publishes the connection and one-field document together', async () => {
    const state = await mount();
    expect(await state.connect()).toBe(true);
    expect(state.writes).toHaveBeenCalledTimes(1);
    const operation = state.operations()[0]!;
    expect(operation.inputs).toEqual([state.reference.relationId]);
    const reopened = new CanvasRelationAnalysisSession('saved');
    reopened.receive(decodeCanvasStagedOperation(operation));
    expect((await reopened.query(operation.id)).bindings.map((f) => f.displayName)).toEqual([
      'last_name',
    ]);
    reopened.dispose();
    state.session.dispose();
  });

  it.each([
    'readonly',
    'output',
    'removed',
    'occupied',
    'reconfigured',
    'revision',
    'cancelled',
    'unmounted',
  ] as const)(
    'rejects a completion after %s changes without any intermediate publication',
    async (change) => {
      const state = await mount();
      let resume!: () => void;
      vi.spyOn(state.session, 'query').mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resume = () => resolve(state.schema);
          })
      );
      const cancellation = new AbortController();
      const work = state.connect(cancellation.signal);
      expect(state.writes).not.toHaveBeenCalled();
      expect(await state.connect()).toBe(false);
      if (change === 'readonly') await state.update({ editable: false });
      if (change === 'output')
        await state.update({ consumedProducerIds: [state.reference.relationId] });
      if (change === 'removed') await state.remove();
      if (change === 'occupied') await state.occupy();
      if (change === 'reconfigured') await state.reconfigure();
      if (change === 'revision') state.session.receive(connectedNamesProjectionDraft());
      if (change === 'cancelled') cancellation.abort();
      if (change === 'unmounted')
        await act(async () => {
          root.render(null);
        });
      resume();
      expect(await work).toBe(false);
      expect(state.writes).not.toHaveBeenCalled();
      state.session.dispose();
    }
  );
});
