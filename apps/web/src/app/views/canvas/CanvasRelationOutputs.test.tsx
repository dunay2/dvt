// @vitest-environment jsdom
/**
 * Owned concern: prove output edits retain their canonical command authority across React refreshes.
 * @baseline GH-3578: an equivalent save acknowledgement must not cancel an accepted output intent.
 * @decision Exercise rejected publication and one deferred call-through query on the real session.
 * @consequence Rollback retains eligibility and feedback; changed authority cancels obsolete intents.
 * @version 1.1.0
 */
import { fireEvent } from '@testing-library/dom';
import { act, useState, type ReactElement } from 'react';
import { flushSync } from 'react-dom';
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
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import { CanvasModelOutputInspector } from './CanvasModelOutputInspector';
import { CanvasTransformInspector } from './CanvasTransformInspector';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';
import { projectCanvasRelationalTree } from './canvasRelationalTreeProjection';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { COPY } from './CanvasRelationalTreeWorkbench.test-support';

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

  it('shares the inspector Edit gate without publishing or exposing excluded outputs in inspection', async () => {
    const initial = documents.join();
    const onChange = vi.fn();
    let inspect!: () => void;
    function Host(): ReactElement {
      const [editing, setEditing] = useState(false);
      inspect = () => setEditing(false);
      const [draft, setDraft] = useState(initial);
      const analysis = useCanvasRelationAnalysisSession(draft, 'output-edit-gate');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <CanvasRelationalTreeEditorFrame
            operation="projection"
            onClose={() => {}}
            editing={editing}
            onEdit={() => setEditing(true)}
            output={
              analysis?.document == null ? null : (
                <CanvasRelationOutputs
                  relationId={analysis.session.rootId}
                  disabled={false}
                  onChange={(next) => {
                    onChange(next);
                    setDraft(next);
                  }}
                />
              )
            }
          >
            {null}
          </CanvasRelationalTreeEditorFrame>
        </CanvasRelationAnalysisContext.Provider>
      );
    }
    await act(async () => root.render(<Host />));
    const initialRows = container.querySelectorAll('[data-slot="relation-output-field"]').length;
    expect(initialRows).toBeGreaterThan(0);
    expect(container.querySelector('[data-slot="relation-output-toggle"]')).toBeNull();
    expect(container.querySelector('[data-slot="relation-output-field"] input')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-derived-output-trigger"]')).toBeNull();
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-relational-edit"]')!)
    );
    expect(onChange).not.toHaveBeenCalled();
    const editRows = container.querySelectorAll('[data-slot="relation-output-field"]').length;
    expect(editRows).toBeGreaterThan(initialRows);
    const toggle = container.querySelector('[data-slot="relation-output-toggle"]')!;
    await act(async () => fireEvent.click(toggle));
    expect(onChange).toHaveBeenCalledOnce();
    expect(container.querySelectorAll('[data-slot="relation-output-field"]')).toHaveLength(
      editRows
    );
    await act(async () => inspect());
    expect(container.querySelectorAll('[data-slot="relation-output-field"]')).toHaveLength(
      initialRows - 1
    );
    expect(container.querySelector('[data-slot="relation-output-toggle"]')).toBeNull();
  });

  it.each(['model', 'transform'] as const)(
    'opens direct %s output editing through the shared header without writing',
    async (kind) => {
      const graph = occurrenceGraph();
      const projection = projectCanvasRelationalTree({
        node: graph.targetNode,
        nodes: graph.nodes,
        edges: graph.edges,
      });
      if (!projection.ok) throw new Error('Expected Model projection.');
      const projectedRoot = projection.projection.root;
      const initial = kind === 'transform' ? connectedNamesProjectionDraft() : graph.draft;
      const onChange = vi.fn();
      function Host(): ReactElement {
        const analysis = useCanvasRelationAnalysisSession(initial, `direct-${kind}`);
        return (
          <CanvasRelationAnalysisContext.Provider value={analysis}>
            {analysis?.document == null ? null : kind === 'model' ? (
              <CanvasModelOutputInspector
                modelName="Model"
                root={projectedRoot}
                copy={COPY}
                editable
                onOutputChange={onChange}
                onPendingOutputChange={() => {}}
                onClose={() => {}}
              />
            ) : (
              <CanvasTransformInspector
                relationId={analysis.session.rootId}
                transformNode={graph.targetNode}
                onChange={onChange}
                onClose={() => {}}
              />
            )}
          </CanvasRelationAnalysisContext.Provider>
        );
      }
      await act(async () => root.render(<Host />));
      expect(container.querySelector('[data-slot="relation-output-field"]')).not.toBeNull();
      expect(container.querySelector('[data-slot="relation-output-toggle"]')).toBeNull();
      expect(container.querySelector('[data-slot="relation-output-field"] input')).toBeNull();
      expect(container.querySelector('[data-slot="canvas-derived-output-trigger"]')).toBeNull();
      const edit = container.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-relational-edit"]'
      )!;
      expect(edit.textContent).toBe('Edit');
      await act(async () => fireEvent.click(edit));
      expect(edit.getAttribute('aria-pressed')).toBe('true');
      expect(container.querySelector('[data-slot="relation-output-toggle"]')).not.toBeNull();
      expect(container.querySelector('[data-slot="relation-output-field"] input')).not.toBeNull();
      if (kind === 'transform')
        expect(
          container.querySelector('[data-slot="canvas-derived-output-trigger"]')
        ).not.toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    }
  );

  it('preserves eligibility and rejection feedback through rollback without reviving stale errors', async () => {
    const initial = documents.join();
    const input = initial.sidecar.relations.find((entry) => entry.sourceRef != null)!;
    const denied = new Set(
      initial.sidecar.fields
        .filter((field) => field.relationId === input.relationId)
        .map((field) => field.fieldId)
    );
    const disconnected = new Set(denied);
    let draft = initial;
    let selected: string | undefined;
    let analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    const reject = vi.fn(() => false);
    function Host(): ReactElement {
      analysis = useCanvasRelationAnalysisSession(
        draft,
        'rejected-output',
        undefined,
        denied,
        disconnected
      );
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          {analysis?.document != null && analysis.error == null ? (
            <CanvasRelationOutputs
              relationId={selected ?? analysis.session.rootId}
              disabled={false}
              onChange={reject}
            />
          ) : null}
        </CanvasRelationAnalysisContext.Provider>
      );
    }
    await act(async () => root.render(<Host />));
    const session = analysis!.session;
    const field = (await session.query(input.relationId)).fields[0]!;
    expect(session.allowsInputSchema(field)).toBe(false);
    expect(session.canEditRetainedJoinOutput(session.rootId)).toBe(true);
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="relation-output-toggle"][data-field-name="customer_id"]'
    )!;
    await act(async () => fireEvent.click(toggle));
    expect(reject).toHaveBeenCalledOnce();
    expect(session.hasDocument(initial)).toBe(true);
    expect(toggle.getAttribute('data-included')).toBe('true');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect({
      inputAllowed: session.allowsInputSchema(field),
      retainedEditable: session.canEditRetainedJoinOutput(session.rootId),
    }).toEqual({ inputAllowed: false, retainedEditable: true });
    draft = { plan: clone(PlanSchema, initial.plan), sidecar: { ...initial.sidecar } };
    await act(async () => root.render(<Host />));
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    selected = input.relationId;
    await act(async () => root.render(<Host />));
    expect(container.querySelector('[role="alert"]')).toBeNull();
    selected = undefined;
    await act(async () => root.render(<Host />));
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(reject).toHaveBeenCalledOnce();
  });

  it.each([
    'equivalent acknowledgement',
    'equivalent acknowledgement after apply',
    'changed acknowledgement after apply',
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
    const publication: string[] = [];
    const onChange = vi.fn<(document: SubstraitDocument) => void>(() => {
      publication.push('published');
    });
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
    publication.length = 0;
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
    const changedAcknowledgementAfterApply = change === 'changed acknowledgement after apply';
    const acknowledgementAfterApply =
      change === 'equivalent acknowledgement after apply' || changedAcknowledgementAfterApply;
    const preserved =
      change === 'equivalent acknowledgement' ||
      change === 'equivalent acknowledgement after apply' ||
      change === 'equal permission sets';
    const acknowledged = {
      plan: clone(PlanSchema, excluded.plan),
      sidecar: { ...excluded.sidecar },
    };
    const apply = session.apply.bind(session);
    const interleaved = acknowledgementAfterApply
      ? vi.spyOn(session, 'apply').mockImplementationOnce((delta) => {
          const next = apply(delta);
          publication.push('applied');
          queueMicrotask(() => {
            publication.push('acknowledged');
            flushSync(() => receive(acknowledged));
          });
          return next;
        })
      : null;
    let currentRevision = revision;
    try {
      await act(async () => {
        if (acknowledgementAfterApply) toggle.focus();
        fireEvent.click(toggle);
      });
      expect(signal).toBeDefined();
      expect(toggle.getAttribute('aria-disabled')).toBe('true');
      if (change === 'equal permission sets') {
        denied = new Set([...denied].reverse());
        disconnected = new Set([...disconnected].reverse());
      }
      if (change === 'session') scope = 'another-output-command';
      if (change === 'selection') selected = input.relationId;
      if (change === 'denied input') denied = new Set([inputFields[0]!]);
      if (change === 'disconnected input') disconnected = new Set([inputFields[0]!]);
      if (change === 'revision' || changedAcknowledgementAfterApply)
        acknowledged.sidecar.relations = excluded.sidecar.relations.map((entry) =>
          entry.relationId === session.rootId ? { ...entry, displayName: 'Changed model' } : entry
        );
      await act(async () => {
        if (change === 'unmount') root.render(null);
        else if (!acknowledgementAfterApply) {
          receive(acknowledged);
          root.render(<Host />);
        }
      });
      currentRevision = analysis!.session.revision;
      expect.soft(signal!.aborted).toBe(!preserved && !acknowledgementAfterApply);
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
      interleaved?.mockRestore();
    }
    if (acknowledgementAfterApply) {
      expect
        .soft(publication)
        .toEqual(
          preserved ? ['applied', 'acknowledged', 'published'] : ['applied', 'acknowledged']
        );
      if (preserved) {
        expect.soft(toggle.isConnected).toBe(true);
        expect.soft(document.activeElement).toBe(toggle);
      }
    }
    if (preserved) {
      expect(onChange).toHaveBeenCalledOnce();
      expect(toggle.getAttribute('data-included')).toBe('true');
      expect(toggle.getAttribute('aria-disabled')).toBeNull();
      expect(session.revision).toBe(revision + 1);
    } else {
      expect(onChange).not.toHaveBeenCalled();
      if (changedAcknowledgementAfterApply) {
        expect(signal!.aborted).toBe(true);
        expect(analysis!.session).toBe(session);
        expect(session.hasDocument(excluded)).toBe(false);
        expect(session.hasDocument(acknowledged)).toBe(true);
        expect(session.locate(session.rootId, session.revision).binding.displayName).toBe(
          'Changed model'
        );
        expect(session.revision).toBeGreaterThan(currentRevision);
      } else expect(analysis!.session.revision).toBe(currentRevision);
    }
  });
});
