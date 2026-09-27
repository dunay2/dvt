// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { fireEvent, waitFor } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import {
  container,
  COPY,
  dragSourceTo,
  root,
  setupWorkbenchTest,
} from './CanvasRelationalTreeWorkbench.test-support';
import {
  occurrenceGraph,
  occurrenceInput,
} from './relational-source-occurrence/occurrence.test.fixtures';
import { createSourceJoin } from './canvasSourceJoin';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import {
  connectWorkbenchOutput,
  disconnectWorkbenchOutput,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';

describe('Transform card in the production Workbench', () => {
  setupWorkbenchTest();

  it('stages Transform independently and connects its Input without prior selection', async () => {
    const graph = occurrenceGraph();
    const input = { ...occurrenceInput, fieldTypes: ['string', 'string'] as const };
    const initial = applyDvtSubstraitSemanticDocument(
      graph.targetNode,
      encodeDvtSubstraitSemanticDocument(
        createSourceJoin({
          left: input,
          right: input,
          leftFieldName: 'parent_id',
          rightFieldName: 'id',
          targetNodeId: graph.targetNode.id,
        })
      )
    );
    const source = {
      ...graph.source,
      metadata: {
        ...graph.source.metadata,
        columns: input.fields.map((name) => ({ name, type: 'text' })),
      },
    };
    const applied = vi.fn();
    function Host(): React.JSX.Element {
      const [node, setNode] = useState(initial);
      return (
        <CanvasRelationalTreeWorkbench
          transformNode={node}
          nodes={[source, node]}
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
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-operation-menu-trigger"]')!
        .click()
    );
    await waitFor(() =>
      expect(
        document.querySelector('[data-operation="field_transform"][aria-disabled="false"]')
      ).not.toBeNull()
    );
    await act(async () =>
      fireEvent.click(document.querySelector('[data-operation="field_transform"]')!)
    );
    const staged = container.querySelector<HTMLElement>('[data-pending-operation="true"]')!;
    const producer = container
      .querySelector<HTMLElement>('[data-operator="join"]')!
      .closest('li')!
      .querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!;
    const inputPort = staged.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-input-port"]'
    )!;
    await disconnectWorkbenchOutput(container);
    await act(async () => dragSourceTo(producer, inputPort));
    expect(inputPort.getAttribute('data-connected')).toBe('true');
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
    await waitFor(() =>
      expect(container.querySelector('[data-slot="canvas-transform-inspector"]')).not.toBeNull()
    );
    const inspector = container.querySelector('[data-slot="canvas-transform-inspector"]')!;
    expect(inspector.parentElement?.classList.contains('canvas-operation-workspace')).toBe(true);
    await waitFor(() =>
      expect(inspector.querySelectorAll('input[type="checkbox"]')).toHaveLength(4)
    );
    const checkbox = inspector.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    const label = checkbox.getAttribute('aria-label')!;
    checkbox.focus();
    await act(async () => fireEvent.click(checkbox));
    await waitFor(() => expect(checkbox.checked).toBe(false));
    expect(document.activeElement).toBe(checkbox);
    await connectWorkbenchOutput(
      container,
      staged.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!
    );
    expect(applied).not.toHaveBeenCalled();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')!
        .click()
    );
    await waitFor(() => expect(applied).toHaveBeenCalledOnce());
    const saved = applied.mock.calls[0]![0];
    expect(saved.dvt).toMatchObject({ mode: 'substrait', shape: 'projection' });
    expect(saved.relationalAuthoringDraft).toMatchObject({ sources: [], operations: [] });
    expect(container.querySelectorAll('[data-pending-operation="true"]')).toHaveLength(0);
    await act(async () => fireEvent.click(container.querySelector('[data-operator="project"]')!));
    await waitFor(() => {
      const restored = container.querySelector<HTMLInputElement>(
        `[data-slot="canvas-transform-inspector"] input[type="checkbox"][aria-label="${label}"]`
      );
      expect(restored).not.toBeNull();
      expect(restored!.checked).toBe(false);
    });
  });

  it('denies Transform insertion in a read-only Model', async () => {
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
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-operation-menu-trigger"]')!
        .click()
    );
    await waitFor(() =>
      expect(
        document.querySelector('[data-operation="field_transform"][aria-disabled="true"]')
      ).not.toBeNull()
    );
  });
});
