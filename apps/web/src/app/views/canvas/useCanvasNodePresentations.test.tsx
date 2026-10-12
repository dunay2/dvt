// @vitest-environment jsdom
import { act, createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withTestQueryClient } from '../../../testing/reactQueryHarness';
import { SOURCE, EDGE, buildCanonicalTransform } from './canvasOutputProjection.test-support';
import { CanvasPresentationAnalysis } from './canvasPresentationAnalysis';
import { useCanvasNodePresentations } from './useCanvasNodePresentations';
import type { CanonicalNode } from '../../types/canonical';
import {
  applyCanvasInspectorNodeDraft,
  createCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import {
  readDvtTransformAuthoringAuthority,
  applyDvtSubstraitSemanticDocument,
} from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

afterEach(() => vi.restoreAllMocks());

describe('Canvas asynchronous presentation ownership', () => {
  it.each(['absent', 'first', 'last'] as const)(
    'keeps native fields ready with configuration %s while changing only materialization',
    async (position) => {
      const initial = buildCanonicalTransform();
      const config = { materialized: 'view' };
      const model = {
        ...initial,
        metadata:
          position === 'absent'
            ? initial.metadata
            : position === 'first'
              ? { config, ...initial.metadata }
              : { ...initial.metadata, config },
      };
      const query = vi.spyOn(CanvasPresentationAnalysis.prototype, 'query');
      let current: CanonicalNode = model;
      const states: (string | undefined)[] = [];
      let values!: ReturnType<typeof useCanvasNodePresentations>;
      function Probe(): null {
        values = useCanvasNodePresentations({ nodes: [SOURCE, current], edges: [EDGE] });
        states.push(values.get(model.id)?.columns.state);
        return null;
      }
      const mounted = await withTestQueryClient(createElement(Probe));
      try {
        expect(values.get(model.id)?.columns.state).toBe('ready');
        const completed = values;
        const calls = query.mock.calls.length;
        const draft = createCanvasInspectorNodeDraft(current);
        if (draft.dvt?.kind !== 'transform') throw new Error('Expected native transform');
        current = applyCanvasInspectorNodeDraft(current, {
          ...draft,
          dvt: { ...draft.dvt, materialized: 'table' },
        });
        states.length = 0;
        await mounted.render(createElement(Probe));
        expect(current.metadata?.config).toMatchObject({ materialized: 'table' });
        expect(states).not.toContain('pending');
        expect(values).toBe(completed);
        expect(query).toHaveBeenCalledTimes(calls);
      } finally {
        await mounted.cleanup();
      }
    }
  );

  it.each(['sql', 'dbt'] as const)(
    'still invalidates %s configuration projections',
    async (kind) => {
      const model = buildCanonicalTransform();
      let current =
        kind === 'dbt'
          ? { ...model, metadata: { ...model.metadata, dbt: { materialized: 'view' } } }
          : model;
      let values!: ReturnType<typeof useCanvasNodePresentations>;
      function Probe(): null {
        values = useCanvasNodePresentations({ nodes: [SOURCE, current], edges: [EDGE] });
        return null;
      }
      const mounted = await withTestQueryClient(createElement(Probe));
      try {
        const completed = values;
        current = {
          ...current,
          metadata: {
            ...current.metadata,
            config: kind === 'sql' ? { sql: 'select 2' } : { materialized: 'table' },
          },
        };
        await mounted.render(createElement(Probe));
        expect(values).not.toBe(completed);
      } finally {
        await mounted.cleanup();
      }
    }
  );

  it('never publishes an old revision after a newer query completes', async () => {
    const model = buildCanonicalTransform();
    const document = decodeDvtSubstraitSemanticDocument(
      readDvtTransformAuthoringAuthority(model)!.semanticDocument
    );
    const root = document.plan.relations[0]!.relType;
    if (root.case !== 'root') throw new Error('Expected root');
    root.value.names[0] = 'renamed_order';
    const output = document.sidecar.fields.find(
      (field) =>
        field.displayName === 'order_id' &&
        field.relationId === document.sidecar.relations.at(-1)?.relationId
    );
    if (output == null) throw new Error('Expected output identity');
    const changed = applyDvtSubstraitSemanticDocument(
      model,
      encodeDvtSubstraitSemanticDocument({
        ...document,
        sidecar: {
          ...document.sidecar,
          fields: document.sidecar.fields.map((field) =>
            field === output ? { ...field, displayName: 'renamed_order' } : field
          ),
        },
      })
    );
    const started = deferred();
    const finishOld = deferred();
    const query = CanvasPresentationAnalysis.prototype.query;
    vi.spyOn(CanvasPresentationAnalysis.prototype, 'query').mockImplementation(async function (
      this: CanvasPresentationAnalysis,
      node,
      signal
    ) {
      const result = await query.call(this, node, signal);
      if (node === model) {
        started.resolve();
        await finishOld.promise;
      }
      return result;
    });
    let current = model;
    let values!: ReturnType<typeof useCanvasNodePresentations>;
    function Probe(): null {
      values = useCanvasNodePresentations({ nodes: [SOURCE, current], edges: [EDGE] });
      return null;
    }
    const mounted = await withTestQueryClient(createElement(Probe));
    try {
      await started.promise;
      expect(values.get(model.id)?.columns.state).toBe('pending');
      current = changed;
      await mounted.render(createElement(Probe));
      expect(values.get(model.id)?.columns.declared[0]?.name).toBe('renamed_order');
      const latest = values;
      await act(async () => {
        finishOld.resolve();
        await finishOld.promise;
      });
      expect(values).toBe(latest);
    } finally {
      finishOld.resolve();
      await mounted.cleanup();
    }
  });

  it('reuses semantic results across equivalent metadata objects', async () => {
    const model = buildCanonicalTransform();
    const query = vi.spyOn(CanvasPresentationAnalysis.prototype, 'query');
    let current = model;
    let values!: ReturnType<typeof useCanvasNodePresentations>;
    function Probe(): null {
      values = useCanvasNodePresentations({ nodes: [SOURCE, current], edges: [EDGE] });
      return null;
    }
    const mounted = await withTestQueryClient(createElement(Probe));
    try {
      expect(values.get(model.id)?.columns.state).toBe('ready');
      const completed = values;
      const calls = query.mock.calls.length;
      current = { ...model, metadata: { ...model.metadata } };
      await mounted.render(createElement(Probe));
      expect(values).toBe(completed);
      expect(query).toHaveBeenCalledTimes(calls);
    } finally {
      await mounted.cleanup();
    }
  });
});
