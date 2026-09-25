// @vitest-environment jsdom
import React, { act, createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  CanvasRelationalTreeWorkbench,
  type CanvasRelationalTreeWorkbenchHandle,
} from './CanvasRelationalTreeWorkbench';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';
import {
  setupWorkbenchTest,
  COPY,
  root,
  container,
} from './CanvasRelationalTreeWorkbench.test-support';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { querySelectedJoin } from './canvasSelectedJoin';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';

describe('direct output ordering', () => {
  setupWorkbenchTest();
  it.each([false, true])(
    'orders applied fields without editing conditions (initial rejection: %s)',
    async (rejectFirst) => {
      const graph = occurrenceGraph();
      const handle = createRef<CanvasRelationalTreeWorkbenchHandle>();
      let reject = rejectFirst;
      const applied = vi.fn();
      function Host(): React.JSX.Element {
        const [node, setNode] = useState(graph.targetNode);
        return (
          <CanvasRelationalTreeWorkbench
            ref={handle}
            transformNode={node}
            nodes={[graph.source, node]}
            edges={graph.edges}
            copy={COPY}
            authoring={{
              canEditNode: true,
              onApplyNodeDraft: (_id, draft) => {
                applied(draft);
                if (reject) return { outcome: 'rejected', reason: 'invalid_draft' };
                setNode(applyCanvasInspectorNodeDraft(node, draft));
                return { outcome: 'no_changes' };
              },
            }}
          />
        );
      }
      await act(async () => root.render(<Host />));
      await act(async () =>
        container.querySelector<HTMLButtonElement>('[data-operator="join"]')!.click()
      );
      const rows = (): Element[] => [
        ...container.querySelectorAll('[data-slot="relation-output-field"]'),
      ];
      const ids = (): (string | null)[] => rows().map((row) => row.getAttribute('data-field-id'));
      const before = ids();
      expect(before).toHaveLength(4);
      expect(
        container.querySelector('[data-slot="semantic-workbench-join-condition-row"]')
      ).not.toBeNull();
      expect(
        container.querySelector(
          '[data-slot="canvas-relational-tree-inline-editor"] input, [data-slot="canvas-relational-tree-inline-editor"] select'
        )
      ).toBeNull();
      expect(applied).not.toHaveBeenCalled();
      const move = async (): Promise<void> =>
        act(async () =>
          rows()[0]!.querySelector<HTMLButtonElement>('[aria-label="Move field down"]')!.click()
        );
      await move();
      if (rejectFirst) {
        expect(ids()).toEqual(before);
        expect(container.querySelector('[role="alert"]')).not.toBeNull();
        reject = false;
        await move();
      }
      expect(ids()).toEqual([before[1], before[0], ...before.slice(2)]);
      expect(handle.current!.hasUnappliedChanges).toBe(false);
      expect(
        container.querySelector('[data-slot="canvas-relational-tree-block-canvas"]')
      ).toBeNull();
      const draft = applied.mock.calls.at(-1)![0] as CanvasInspectorNodeDraft;
      if (draft.dvt?.kind !== 'transform' || draft.dvt.mode !== 'substrait')
        throw new Error('Expected canonical document');
      const session = new CanvasRelationAnalysisSession('persisted-output');
      session.receive(graph.draft);
      const original = await querySelectedJoin(session, session.rootId, session.revision);
      session.receive({ plan: draft.dvt.plan, sidecar: draft.dvt.sidecar });
      const saved = await querySelectedJoin(session, session.rootId, session.revision);
      expect(saved.conditions).toEqual(original.conditions);
      expect(
        saved.inputs.map(({ relationId, fingerprint, bindings, fields }) => ({
          relationId,
          fingerprint,
          bindings,
          fields,
        }))
      ).toEqual(
        original.inputs.map(({ relationId, fingerprint, bindings, fields }) => ({
          relationId,
          fingerprint,
          bindings,
          fields,
        }))
      );
      expect(saved.output.bindings.map((field) => field.fieldId)).toEqual(ids());
      session.dispose();
    }
  );

  it('shows existing instance output and denies ordering without edit permission', async () => {
    const graph = occurrenceGraph();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
        />
      )
    );
    for (const operator of ['read', 'join']) {
      await act(async () =>
        container.querySelector<HTMLButtonElement>(`[data-operator="${operator}"]`)!.click()
      );
      const fields = container.querySelector('[data-slot="canvas-relation-fields"]');
      expect(fields).not.toBeNull();
      expect(fields!.querySelectorAll('[data-field-id]').length).toBe(operator === 'read' ? 2 : 4);
      expect(fields!.querySelector('button, input, select')).toBeNull();
      expect(container.querySelector('[data-slot="canvas-relational-edit"]')).toBeNull();
    }
  });
});
