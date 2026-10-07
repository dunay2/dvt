// @vitest-environment jsdom
/**
 * Owned concern: prove output edits retain their canonical command authority across React refreshes.
 * @baseline GH-3578: an equivalent save acknowledgement must not cancel an accepted output intent.
 * @decision Exercise the real session and output command with one deferred call-through query.
 * @consequence Authority changes cancel publication; wrapper and equal-permission refreshes do not.
 * @version 1.0.0
 */
import { fireEvent } from '@testing-library/dom';
import { act, useState, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { clone } from '@bufbuild/protobuf';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import { createSourceSet } from './canvasSourceSet';
import { source } from './canvasRelationalOperator.test-support';
import { setupWorkbenchTest, root, container } from './CanvasRelationalTreeWorkbench.test-support';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { CanvasRelationOutputs } from './CanvasRelationOutputs';

const documents = {
  join: () =>
    createCustomerOrdersJoin({
      left: source('left'),
      right: source('right'),
      targetNodeId: 'model',
    }),
  set: () =>
    createSourceSet({
      inputs: [source('left'), source('right'), source('third')],
      targetNodeId: 'model',
    }),
};

describe.each(Object.entries(documents))(
  '%s selected relation outputs',
  (_kind, createDocument) => {
    setupWorkbenchTest();
    const outputs = (): HTMLInputElement[] => [
      ...container.querySelectorAll<HTMLInputElement>('[data-slot="relation-output-field"] input'),
    ];
    const setup = async (): Promise<ReturnType<typeof vi.fn>> => {
      const initial = createDocument();
      const onChange = vi.fn();
      function Host(): ReactElement {
        const [draft, setDraft] = useState(initial);
        const analysis = useCanvasRelationAnalysisSession(draft, 'model');
        return (
          <CanvasRelationAnalysisContext.Provider value={analysis}>
            {analysis?.error == null && analysis?.document != null ? (
              <CanvasRelationOutputs
                relationId={analysis.session.rootId}
                disabled={false}
                onChange={(next) => {
                  onChange(next);
                  setDraft(next);
                }}
              />
            ) : null}
          </CanvasRelationAnalysisContext.Provider>
        );
      }
      await act(async () => root.render(<Host />));
      return onChange;
    };

    it('keeps invalid text local, reports it accessibly and accepts a corrected alias', async () => {
      const onChange = await setup();
      for (const invalid of ['x'.repeat(63) + ' ', 'invalid\0identifier']) {
        await act(async () => {
          fireEvent.input(outputs()[0]!, { target: { value: invalid } });
          fireEvent.focusOut(outputs()[0]!);
        });
        expect(outputs()[0]!.value).toBe(invalid);
        expect(outputs()[0]!.getAttribute('aria-invalid')).toBe('true');
        const errorId = outputs()[0]!.getAttribute('aria-describedby');
        expect(document.getElementById(errorId!)?.textContent).toBeTruthy();
        expect(onChange).not.toHaveBeenCalled();
      }
      await act(async () => {
        fireEvent.input(outputs()[0]!, { target: { value: 'key_alias' } });
        fireEvent.focusOut(outputs()[0]!);
      });
      expect(outputs()[0]!.getAttribute('aria-invalid')).toBeNull();
      expect(onChange).toHaveBeenCalledOnce();
      expect(onChange.mock.calls[0]![0].sidecar.fields).toEqual(
        expect.arrayContaining([expect.objectContaining({ displayName: 'key_alias' })])
      );
    });

    it('rejects duplicate aliases and excludes an output without applying its invalid name', async () => {
      const onChange = await setup();
      const count = container.querySelectorAll('[data-included="true"]').length;
      await act(async () => {
        fireEvent.input(outputs()[0]!, { target: { value: outputs()[1]!.value } });
        fireEvent.focusOut(outputs()[0]!);
      });
      expect(outputs()[0]!.getAttribute('aria-invalid')).toBe('true');
      expect(onChange).not.toHaveBeenCalled();
      await act(async () =>
        fireEvent.click(container.querySelector('[data-slot="relation-output-toggle"]')!)
      );
      expect(onChange).toHaveBeenCalledOnce();
      expect(container.querySelector('[aria-invalid="true"]')).toBeNull();
      expect(container.querySelectorAll('[data-included="true"]')).toHaveLength(count - 1);
    });

    it('keeps the activated output control mounted and focused', async () => {
      await setup();
      const toggle = container.querySelector<HTMLButtonElement>(
        '[data-slot="relation-output-toggle"]'
      )!;
      toggle.focus();
      await act(async () => fireEvent.click(toggle));
      expect(toggle.isConnected).toBe(true);
      expect(document.activeElement).toBe(toggle);
    });
  }
);

describe('output command authority during acknowledgement', () => {
  setupWorkbenchTest();

  it.each([
    'equivalent acknowledgement',
    'equal permission sets',
    'session',
    'revision',
    'selection',
    'denied input',
    'disconnected input',
    'unmount',
  ] as const)('preserves or cancels the pending intent for %s', async (change) => {
    const initial = documents.join();
    const input = initial.sidecar.relations.find((entry) => entry.sourceRef != null)!;
    const inputFields = initial.sidecar.fields
      .filter((field) => field.relationId === input.relationId)
      .map((field) => field.fieldId);
    let denied = new Set(change === 'equal permission sets' ? inputFields : []);
    let disconnected = new Set(denied);
    let scope = 'output-command';
    let selected: string | undefined;
    let receive!: (document: SubstraitDocument) => void;
    let analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    const onChange = vi.fn();
    function Host(): ReactElement {
      const [draft, setDraft] = useState(initial);
      receive = setDraft;
      analysis = useCanvasRelationAnalysisSession(draft, scope, undefined, denied, disconnected);
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          {analysis?.document != null && analysis.error == null ? (
            <CanvasRelationOutputs
              relationId={selected ?? analysis.session.rootId}
              disabled={false}
              onChange={(next) => {
                onChange(next);
                setDraft(next);
              }}
            />
          ) : null}
        </CanvasRelationAnalysisContext.Provider>
      );
    }
    await act(async () => root.render(<Host />));
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="relation-output-toggle"][data-field-name="customer_id"]'
    )!;
    await act(async () => fireEvent.click(toggle));
    expect(toggle.getAttribute('data-included')).toBe('false');
    expect(onChange).toHaveBeenCalledOnce();
    const excluded: SubstraitDocument = onChange.mock.calls[0]![0];
    onChange.mockClear();
    const session = analysis!.session;
    const revision = session.revision;
    const acceptedRoot = session.locate(session.rootId, revision).relation;
    const query = session.query.bind(session);
    let signal: AbortSignal | undefined;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const deferred = vi.spyOn(session, 'query').mockImplementationOnce(async (...args) => {
      signal = args[1];
      await gate;
      return query(...args);
    });
    const preserved = change === 'equivalent acknowledgement' || change === 'equal permission sets';
    let currentRevision = revision;
    try {
      await act(async () => fireEvent.click(toggle));
      expect(signal).toBeDefined();
      expect(toggle.getAttribute('aria-disabled')).toBe('true');
      const acknowledged = {
        plan: clone(PlanSchema, excluded.plan),
        sidecar: { ...excluded.sidecar },
      };
      if (change === 'equal permission sets') {
        denied = new Set([...denied].reverse());
        disconnected = new Set([...disconnected].reverse());
      }
      if (change === 'session') scope = 'another-output-command';
      if (change === 'selection') selected = input.relationId;
      if (change === 'denied input') denied = new Set([inputFields[0]!]);
      if (change === 'disconnected input') disconnected = new Set([inputFields[0]!]);
      if (change === 'revision')
        acknowledged.sidecar.relations = excluded.sidecar.relations.map((entry) =>
          entry.relationId === session.rootId ? { ...entry, displayName: 'Changed model' } : entry
        );
      await act(async () => {
        if (change === 'unmount') root.render(null);
        else {
          receive(acknowledged);
          root.render(<Host />);
        }
      });
      currentRevision = analysis!.session.revision;
      expect.soft(signal!.aborted).toBe(!preserved);
      if (preserved) {
        expect(analysis!.session).toBe(session);
        expect(currentRevision).toBe(revision);
        expect.soft(session.locate(session.rootId, revision).relation).toBe(acceptedRoot);
        expect(toggle.isConnected).toBe(true);
        expect.soft(toggle.getAttribute('aria-disabled')).toBe('true');
      }
    } finally {
      await act(async () => {
        release();
        await gate;
      });
      deferred.mockRestore();
    }
    if (preserved) {
      expect(onChange).toHaveBeenCalledOnce();
      expect(toggle.getAttribute('data-included')).toBe('true');
      expect(toggle.getAttribute('aria-disabled')).toBeNull();
      expect(session.revision).toBe(revision + 1);
    } else {
      expect(onChange).not.toHaveBeenCalled();
      expect(analysis!.session.revision).toBe(currentRevision);
    }
  });
});
