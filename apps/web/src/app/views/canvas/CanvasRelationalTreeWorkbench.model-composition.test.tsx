// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import {
  container,
  COPY,
  root,
  setupWorkbenchTest,
} from './CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';

describe('Model composition Workbench', () => {
  setupWorkbenchTest();

  it('opens from the Model output and commits a final-field alias through authoring', async () => {
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

    const panel = container.querySelector('[data-slot="canvas-model-composition"]');
    expect(panel).not.toBeNull();
    expect(
      panel?.querySelector('[data-slot="canvas-contextual-workbench-drag-handle"]')
    ).not.toBeNull();

    const alias = panel?.querySelector<HTMLInputElement>(
      '[data-slot="relation-output-field"] input:not([type="checkbox"])'
    );
    expect(alias).not.toBeNull();
    await act(async () => {
      alias!.value = 'order_key';
      alias!.dispatchEvent(new Event('input', { bubbles: true }));
      alias!.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    });

    const draft = applied.mock.calls.at(-1)?.[0] as CanvasInspectorNodeDraft;
    expect(draft.dvt?.kind).toBe('transform');
    if (draft.dvt?.kind !== 'transform' || draft.dvt.mode !== 'substrait') return;
    expect(draft.dvt.sidecar.fields.some((field) => field.displayName === 'order_key')).toBe(true);
  });
});
