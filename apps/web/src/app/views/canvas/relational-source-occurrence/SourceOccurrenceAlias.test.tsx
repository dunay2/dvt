// @vitest-environment jsdom
/** Owned concern: alias authoring targets a Read occurrence and survives Apply/reopen. */
import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { CanvasRelationalTreeWorkbench } from '../CanvasRelationalTreeWorkbench';
import { applyCanvasInspectorNodeDraft } from '../canvasInspectorAuthoringModel';
import { canvasDraftSession } from '../canvasDraftSession';
import type { CanvasInspectorNodeDraft } from '../canvasInspectorAuthoring.types';
import {
  COPY,
  container,
  root,
  setupWorkbenchTest,
} from '../CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './occurrence.test.fixtures';
import { SourceOccurrencePropertiesForm } from './SourceOccurrencePropertiesForm';
import { CanvasSourceOccurrenceOutputs } from '../CanvasSourceOccurrenceOutputs';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CanvasOperationInspectorTabs } from '../CanvasRelationalTreeEditorFrame';

async function changeAlias(value: string): Promise<void> {
  const input = container.querySelector<HTMLInputElement>('[data-slot="source-occurrence-alias"]')!;
  expect(input).not.toBeNull();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function click(slot: string): Promise<void> {
  await act(async () =>
    container.querySelector<HTMLButtonElement>(`[data-slot="${slot}"]`)!.click()
  );
}

describe('Read properties alias', () => {
  setupWorkbenchTest();
  it('uses one literal Edit action for alias and output presentation without saving', async () => {
    useApplicationLanguageStore.setState({ language: 'es' });
    const save = vi.fn(() => true);
    const change = vi.fn();
    let settle!: () => void;
    function Host({ children }: React.PropsWithChildren): React.JSX.Element {
      const [revision, setRevision] = React.useState(0);
      settle = () => setRevision((current) => current + 1);
      return (
        <CanvasOperationInspectorTabs resetRevision={revision}>
          {children}
        </CanvasOperationInspectorTabs>
      );
    }
    await act(async () =>
      root.render(
        <Host>
          <SourceOccurrencePropertiesForm
            data={{ relationId: 'pending', alias: 'Source', occupied: new Set(), supported: true }}
            actions={{ save, close: vi.fn() }}
            output={(editing: boolean) => (
              <CanvasSourceOccurrenceOutputs
                fields={[
                  { id: 'included', name: 'Visible', included: true, available: true },
                  { id: 'excluded', name: 'Excluded', included: false, available: true },
                ]}
                editing={editing}
                disabled={false}
                onChange={change}
              />
            )}
          />
        </Host>
      )
    );
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).toBeNull();
    expect(container.querySelector('[data-slot="source-occurrence-update"]')).toBeNull();
    expect(container.textContent).not.toContain('Excluded');
    const edit = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-edit"]'
    )!;
    expect(edit?.textContent).toBe('Edit');
    await act(async () => edit.click());
    expect(edit.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).not.toBeNull();
    expect(container.textContent).toContain('Excluded');
    expect(save).not.toHaveBeenCalled();
    const selectedOnly = container.querySelector<HTMLButtonElement>(
      '[role="checkbox"][aria-label="Solo seleccionados"]'
    )!;
    expect(selectedOnly).not.toBeNull();
    expect(selectedOnly.getAttribute('aria-checked')).toBe('false');
    await act(async () => selectedOnly.click());
    expect(container.textContent).toContain('Visible');
    expect(container.textContent).not.toContain('Excluded');
    await act(async () => selectedOnly.click());
    expect(container.textContent).toContain('Excluded');
    expect(change).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    const properties = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-operation-properties-tab"]'
    )!;
    await act(async () => fireEvent.mouseDown(properties, { button: 0, ctrlKey: false }));
    expect(properties.getAttribute('data-state')).toBe('active');
    await act(async () => settle());
    expect(edit.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).toBeNull();
    expect(container.querySelector('[role="checkbox"]')).toBeNull();
    expect(properties.getAttribute('data-state')).toBe('active');
  });
  it('blocks a duplicate alias inline without applying a command', async () => {
    const graph = occurrenceGraph();
    const apply = vi.fn();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
        />
      )
    );
    const reads = graph.draft.sidecar.relations.filter((binding) => binding.sourceRef != null);
    await act(async () =>
      container.querySelectorAll<HTMLButtonElement>('[data-operator="read"]')[1]!.click()
    );
    await click('canvas-relational-edit');
    await changeAlias(`  ${reads[0]!.displayName}  `);
    expect(
      container.querySelector('[data-slot="source-occurrence-alias"]')?.getAttribute('aria-invalid')
    ).toBe('true');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="source-occurrence-update"]')!.disabled
    ).toBe(true);
    expect(apply).not.toHaveBeenCalled();
    await changeAlias('Distinct instance');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="source-occurrence-update"]')!.disabled
    ).toBe(false);
  });

  it('opens on one click, updates only that occurrence, and preserves the alias after Apply/reopen', async () => {
    const graph = occurrenceGraph();
    let target = graph.targetNode;
    const session = canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: graph.nodes.map((node) => node.id),
      canonicalEdges: graph.edges,
    });
    const apply = vi.fn((_id: string, draft: CanvasInspectorNodeDraft) => {
      target = applyCanvasInspectorNodeDraft(target, draft);
      return {
        outcome: 'applied' as const,
        draftSession: canvasDraftSession.workingSet.upsertNode(session, target),
      };
    });
    const render = async (): Promise<void> =>
      await act(async () =>
        root.render(
          <CanvasRelationalTreeWorkbench
            transformNode={target}
            nodes={[graph.source, target]}
            edges={graph.edges}
            copy={COPY}
            authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
          />
        )
      );
    await render();
    const reads = container.querySelectorAll<HTMLButtonElement>('[data-operator="read"]');
    const readId = reads[1]!.getAttribute('data-relation-id');
    await act(async () => reads[1]!.click());
    await click('canvas-relational-edit');
    await changeAlias('Parents');
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(true);
    await click('source-occurrence-update');
    expect(
      container.querySelector(`[data-relation-id="${readId}"][data-operator="read"]`)?.textContent
    ).toContain('Parents');
    expect(container.querySelectorAll('[data-operator="read"]')[0]?.textContent).not.toContain(
      'Parents'
    );
    expect(apply).not.toHaveBeenCalled();
    await click('canvas-relational-tree-apply');
    expect(apply).toHaveBeenCalledTimes(1);
    await render();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(`[data-relation-id="${readId}"][data-operator="read"]`)!
        .click()
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-inline-editor"]')?.textContent
    ).toContain('Parents');
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).toBeNull();
    await click('canvas-relational-edit');
    expect(
      container.querySelector<HTMLInputElement>('[data-slot="source-occurrence-alias"]')?.value
    ).toBe('Parents');
    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-source"]')).toHaveLength(
      1
    );
  });

  it('blocks invalid alias submission and cancels back to the unchanged document', async () => {
    const graph = occurrenceGraph();
    const apply = vi.fn();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
        />
      )
    );
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-operator="read"]')!.click()
    );
    await click('canvas-relational-edit');
    await changeAlias('');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="source-occurrence-update"]')?.disabled
    ).toBe(true);
    await click('canvas-relational-tree-cancel');
    expect(apply).not.toHaveBeenCalled();
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-operator="read"]')!.click()
    );
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).toBeNull();
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-inline-editor"]')?.textContent
    ).toContain('places');
  });
});
