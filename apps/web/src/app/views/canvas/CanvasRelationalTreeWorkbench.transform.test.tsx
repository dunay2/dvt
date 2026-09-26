// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { fireEvent, waitFor } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import {
  container,
  COPY,
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

describe('Transform card in the production Workbench', () => {
  setupWorkbenchTest();

  it('inserts Transform on a selected dataset and authors fields only in its fixed inspector', async () => {
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
      container.querySelector<HTMLButtonElement>('[data-operator="read"]')!.click()
    );
    expect(container.querySelector('[data-slot="canvas-derived-output-trigger"]')).toBeNull();
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
    await waitFor(() => expect(applied).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(container.querySelector('[data-slot="canvas-transform-inspector"]')).not.toBeNull()
    );
    expect(container.querySelectorAll('[data-canvas-inspector="true"]')).toHaveLength(1);
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
    expect(container.querySelector('form[data-slot="canvas-derived-output-form"]')).toBeNull();
    for (const alias of ['normalized_key', 'second_key']) {
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>('[data-slot="canvas-derived-output-trigger"]')!
          .click()
      );
      await act(async () =>
        fireEvent.change(container.querySelector('input[name="alias"]')!, {
          target: { value: alias },
        })
      );
      await act(async () =>
        fireEvent.submit(container.querySelector('form[data-slot="canvas-derived-output-form"]')!)
      );
      await waitFor(() =>
        expect(container.querySelector('form[data-slot="canvas-derived-output-form"]')).toBeNull()
      );
    }
    expect(container.querySelectorAll('[data-operator="project"]')).toHaveLength(1);
    const draft = applied.mock.calls.at(-1)![0];
    expect(
      draft.dvt.sidecar.fields.filter((field: { displayName?: string }) =>
        ['normalized_key', 'second_key'].includes(field.displayName ?? '')
      )
    ).toHaveLength(2);
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-operator="join"]')!.click()
    );
    expect(container.querySelector('[data-slot="canvas-transform-inspector"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-derived-output-trigger"]')).toBeNull();
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
