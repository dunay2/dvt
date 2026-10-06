// @vitest-environment jsdom
/**
 * Owned concern: prove Model Output edits through the real Workbench and canonical command.
 * @baseline GH-3596: disconnected final JOIN selection remains visible but permission guarded.
 * @decision Keep the existing gesture harness and prove edit, read-only and rejection boundaries.
 * @consequence Retained selection does not enable general composition or calculation controls.
 * @version 1.1.0
 */
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
  it.each([true, false])(
    'retains final JOIN output controls after disconnection without enabling general edits (%s)',
    async (canEditNode) => {
      const graph = occurrenceGraph();
      const applied = vi.fn();
      function Host(): React.JSX.Element {
        const [node, setNode] = useState(graph.targetNode);
        return (
          <CanvasRelationalTreeWorkbench
            transformNode={node}
            nodes={[graph.source, node]}
            edges={[]}
            copy={COPY}
            authoring={{
              canEditNode,
              onApplyNodeDraft: (_id, draft) => {
                applied(draft);
                setNode(applyCanvasInspectorNodeDraft(node, draft));
                return { outcome: 'no_changes' };
              },
            }}
          />
        );
      }
      await act(async () => root.render(<Host />));
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-output-open"]')!
          .click()
      );
      const toggles = (): HTMLButtonElement[] => [
        ...container.querySelectorAll<HTMLButtonElement>(
          '[data-slot="canvas-model-output-inspector"] [data-slot="relation-output-toggle"]'
        ),
      ];
      expect(toggles()).toHaveLength(4);
      expect(toggles().every((toggle) => toggle.disabled === !canEditNode)).toBe(true);
      expect(container.querySelector('[data-slot="canvas-relational-edit"]')).toBeNull();
      expect(container.querySelector('[data-slot="canvas-derived-output-trigger"]')).toBeNull();
      if (canEditNode) {
        for (const toggle of toggles()) await act(async () => toggle.click());
        expect(toggles().every((toggle) => toggle.dataset.included === 'false')).toBe(true);
        await act(async () => toggles()[0]!.click());
        expect(toggles().filter((toggle) => toggle.dataset.included === 'true')).toHaveLength(1);
        expect(applied).toHaveBeenCalledTimes(5);
      } else {
        await act(async () => toggles()[0]!.click());
        expect(applied).not.toHaveBeenCalled();
      }
    }
  );
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
      const properties = container.querySelector('[data-value="properties"]');
      expect(properties?.querySelector('[data-slot="relation-output-field"]')).toBeNull();
      const outputTab = container.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-operation-output-tab"]'
      );
      expect(outputTab?.textContent).toBe('Output');
      await act(async () =>
        outputTab?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
      );
      const outputPanel = container.querySelector('[data-value="output"]');
      expect(outputPanel?.getAttribute('data-state')).toBe('active');
      expect(outputPanel?.querySelector('[aria-label="Move field up"]')).toBeNull();
      expect(rows()[0]?.querySelector('[data-slot="relation-output-drag-handle"]')).not.toBeNull();
      expect(applied).not.toHaveBeenCalled();
      const move = async (): Promise<void> => {
        const source = rows()[0] as HTMLElement;
        const target = rows()[1] as HTMLElement;
        const data = new Map<string, string>();
        const dataTransfer = {
          effectAllowed: 'move',
          dropEffect: 'move',
          getData: (type: string) => data.get(type) ?? '',
          setData: (type: string, value: string) => data.set(type, value),
        };
        vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
          top: 0,
          height: 20,
        } as DOMRect);
        const dispatch = (element: HTMLElement, event: Event): void => {
          Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
          element.dispatchEvent(event);
        };
        await act(async () => dispatch(source, new Event('dragstart', { bubbles: true })));
        await act(async () =>
          dispatch(
            target,
            new MouseEvent('dragover', { bubbles: true, cancelable: true, clientY: 19 })
          )
        );
        expect(target.getAttribute('data-drop-placement')).toBe('after');
        await act(async () => {
          dispatch(target, new Event('drop', { bubbles: true, cancelable: true }));
          source.dispatchEvent(new Event('dragend', { bubbles: true }));
        });
      };
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
      await act(async () =>
        container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-edit"]')!.click()
      );
      await act(async () => {
        const type = container.querySelector<HTMLSelectElement>(
          '[data-slot="canvas-relational-tree-join-type"]'
        )!;
        type.value = '1';
        type.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')!
          .click()
      );
      expect(handle.current!.hasUnappliedChanges).toBe(false);
      expect(ids()).toEqual([before[1], before[0], ...before.slice(2)]);
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
      const outputTab = container.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-operation-output-tab"]'
      );
      await act(async () =>
        outputTab?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
      );
      expect(container.querySelector('[data-value="output"]')?.getAttribute('data-state')).toBe(
        'active'
      );
      const fields = container.querySelector(
        operator === 'read'
          ? '[data-slot="source-occurrence-outputs"]'
          : '[data-slot="canvas-relation-fields"]'
      );
      expect(fields).not.toBeNull();
      expect(fields!.querySelectorAll('[data-field-id]').length).toBe(operator === 'read' ? 2 : 4);
      expect(fields!.querySelector('input, select')).toBeNull();
      expect(
        Array.from(fields!.querySelectorAll('button')).every((button) => button.disabled)
      ).toBe(true);
      expect(container.querySelector('[data-slot="canvas-relational-edit"]')).toBeNull();
    }
  });
});
