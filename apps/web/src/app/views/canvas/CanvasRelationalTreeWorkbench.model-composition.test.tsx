// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import type { CanvasRelationalTreeWorkbenchHandle } from './CanvasRelationalTreeWorkbench';
import {
  container,
  COPY,
  root,
  setupWorkbenchTest,
} from './CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';

describe('Model composition Workbench', () => {
  setupWorkbenchTest();

  it('opens the Model output in the fixed inspector and commits a final-field alias', async () => {
    const graph = occurrenceGraph();
    const applied = vi.fn();
    function Host(): React.JSX.Element {
      const [node, setNode] = useState(graph.targetNode);
      return (
        <CanvasRelationalTreeWorkbench
          transformNode={node}
          nodes={[graph.source, node]}
          edges={graph.edges}
          copy={COPY}
          authoring={{
            canEditNode: true,
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
    const output = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-output"]'
    );
    expect(output?.tagName).toBe('BUTTON');
    await act(async () => output?.click());

    const panel = container.querySelector('[data-slot="canvas-model-output-inspector"]');
    expect(panel).not.toBeNull();
    expect(container.querySelectorAll('[data-canvas-inspector="true"]')).toHaveLength(1);
    expect(panel?.parentElement?.parentElement?.dataset.slot).toBe(
      'canvas-relational-tree-inspection'
    );
    expect(
      container.querySelector('[data-slot="canvas-contextual-workbench-drag-handle"]')
    ).toBeNull();
    expect(
      panel?.querySelectorAll('[data-slot="canvas-model-composition-steps"] [data-kind="input"]')
    ).toHaveLength(2);
    expect(
      panel?.querySelectorAll(
        '[data-slot="canvas-model-composition-steps"] [data-kind="operation"]'
      )
    ).toHaveLength(1);

    await act(async () => {
      panel
        ?.querySelector<HTMLButtonElement>('[data-slot="canvas-operation-output-tab"]')
        ?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    });

    const alias = panel?.querySelector<HTMLInputElement>(
      '[data-slot="relation-output-field"] input:not([type="checkbox"])'
    );
    expect(alias).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        alias,
        'order_key'
      );
      alias!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      alias!.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });

    const draft = applied.mock.calls.at(-1)?.[0] as CanvasInspectorNodeDraft;
    expect(draft.dvt?.kind).toBe('transform');
    if (draft.dvt?.kind !== 'transform' || draft.dvt.mode !== 'substrait') return;
    expect(draft.dvt.sidecar.fields.some((field) => field.displayName === 'order_key')).toBe(true);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-collapse"]')!
        .click();
    });
    expect(container.querySelector('[data-slot="canvas-model-output-inspector"]')).toBeNull();
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-output"]')!
        .click();
    });
    expect(container.querySelector('[data-slot="canvas-model-output-inspector"]')).not.toBeNull();
  });

  it('keeps exactly one fixed inspector when an operation is selected', async () => {
    const graph = occurrenceGraph();
    const applied = vi.fn(() => ({ outcome: 'no_changes' as const }));
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: applied }}
        />
      )
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-output"]')!
        .click()
    );
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-operator="join"]')!.click()
    );
    expect(container.querySelector('[data-slot="canvas-model-output-inspector"]')).toBeNull();
    expect(container.querySelectorAll('[data-canvas-inspector="true"]')).toHaveLength(1);
    expect(applied).not.toHaveBeenCalled();
  });

  it('includes a pending output alias in the navigation transaction', async () => {
    const graph = occurrenceGraph();
    const applied = vi.fn(() => ({ outcome: 'no_changes' as const }));
    const handle = React.createRef<CanvasRelationalTreeWorkbenchHandle>();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          ref={handle}
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: applied }}
        />
      )
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-output"]')!
        .click()
    );
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[data-slot="canvas-model-output-inspector"] [data-slot="canvas-operation-output-tab"]'
        )!
        .dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    });
    const alias = container.querySelector<HTMLInputElement>(
      '[data-slot="canvas-model-output-inspector"] [data-slot="relation-output-field"] input:not([type="checkbox"])'
    )!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        alias,
        'pending_alias'
      );
      alias.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(applied).not.toHaveBeenCalled();
    expect(handle.current?.hasUnappliedChanges).toBe(true);
    expect(handle.current?.canApply).toBe(false);

    await act(async () => handle.current?.cancel());

    expect(container.querySelector('[data-slot="canvas-model-output-inspector"]')).toBeNull();
    expect(handle.current?.hasUnappliedChanges).toBe(false);
    expect(applied).not.toHaveBeenCalled();
  });
});
