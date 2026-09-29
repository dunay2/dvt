// @vitest-environment jsdom
/** Owned concern: inspect applied ordering and limits without routing them to JOIN predicates. */
import React, { act } from 'react';
import { fireEvent, getByLabelText, waitFor } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import {
  encodeDvtSubstraitSemanticDocument,
  decodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import {
  applyDvtSubstraitSort,
  applyDvtSubstraitFetch,
  resolveDvtSubstraitSortFetchInputFields,
} from './canvasSortFetch.test-support';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  applyDvtTransformAuthoringMetadata,
  createDvtTransformAuthoringMetadata,
} from './canvasDvtTransformAuthoring';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';
import {
  instantiateWorkbenchSource,
  connectStagedWorkbenchUnaryOperation,
  connectWorkbenchOutput,
  disconnectWorkbenchOutput,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  setupWorkbenchTest,
  COPY,
  sourceRef,
  sourceNode,
  transformNode,
  edge,
  root,
  container,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('applied Sort/Fetch inspection', () => {
  setupWorkbenchTest();

  it('retains a pending Fetch form and its LIMIT while reporting unsaved changes', async () => {
    const graph = occurrenceGraph();
    const applied = vi.fn<CanvasRelationalTreeAuthoringContract['onApplyNodeDraft']>(() => ({
      outcome: 'no_changes' as const,
    }));
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
    await instantiateWorkbenchSource(
      container.querySelector('[data-slot="canvas-relational-tree-source"]')!
    );
    await disconnectWorkbenchOutput(container);
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-operation-menu-trigger"]')!)
    );
    await act(async () => fireEvent.click(document.querySelector('[data-operation="fetch"]')!));
    const operation = await connectStagedWorkbenchUnaryOperation();
    await waitFor(() => expect(getByLabelText(container, 'LIMIT')).toBeTruthy());
    const input = getByLabelText(container, 'LIMIT') as HTMLInputElement;
    input.focus();
    await act(async () => fireEvent.change(input, { target: { value: '7' } }));
    expect(getByLabelText(container, 'LIMIT')).toBe(input);
    expect(input.value).toBe('7');
    expect(document.activeElement).toBe(input);
    await act(async () => fireEvent.change(input, { target: { value: '73' } }));
    expect(getByLabelText(container, 'LIMIT')).toBe(input);
    await act(async () => fireEvent.submit(input.closest('form')!));
    await connectWorkbenchOutput(
      container,
      operation.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!
    );
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-relational-tree-apply"]')!)
    );
    await waitFor(() => expect(applied).toHaveBeenCalledOnce());
    const saved = applyCanvasInspectorNodeDraft(graph.targetNode, applied.mock.calls[0]![1]);
    const authority = readDvtTransformAuthoringAuthority(saved);
    if (authority == null) throw new Error('Expected canonical output');
    const fetch = decodeDvtSubstraitSemanticDocument(authority.semanticDocument).plan.relations[0]!
      .relType;
    expect(fetch.case === 'root' && fetch.value.input?.relType).toMatchObject({
      case: 'fetch',
      value: {
        countExpr: {
          rexType: { case: 'literal', value: { literalType: { case: 'i64', value: 73n } } },
        },
      },
    });
  });

  it.each(
    (['sort', 'fetch'] as const).flatMap((operation) =>
      [false, true].map((editable) => ({ operation, editable }))
    )
  )(
    'opens $operation properties without a predicate tree (editable: $editable)',
    async ({ operation, editable }) => {
      const clients = sourceNode('clients', 'clients');
      const orders = sourceNode('orders', 'orders');
      const joined = createCustomerOrdersJoin({
        left: {
          nodeId: clients.id,
          schema: 'public',
          table: 'clients',
          sourceRef: sourceRef('clients'),
        },
        right: {
          nodeId: orders.id,
          schema: 'public',
          table: 'orders',
          sourceRef: sourceRef('orders'),
        },
        targetNodeId: 'transform',
      });
      const field = resolveDvtSubstraitSortFetchInputFields(joined)[0]!;
      const sorted = applyDvtSubstraitSort(joined, [
        { fieldId: field.fieldId, direction: SortField_SortDirection.DESC_NULLS_LAST },
      ]);
      const fetched = applyDvtSubstraitFetch(sorted, {
        count: 100n,
        offset: 2n,
      });
      const base = applyDvtSubstraitSemanticDocument(
        transformNode(),
        encodeDvtSubstraitSemanticDocument(joined)
      );
      const metadata = createDvtTransformAuthoringMetadata(base);
      if (metadata.mode === 'uninitialized') throw new Error('Expected canonical JOIN');
      const transform = applyDvtTransformAuthoringMetadata(base, {
        ...metadata,
        plan: fetched.plan,
        sidecar: fetched.sidecar,
      });
      const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' as const }));

      await act(async () => {
        root.render(
          <CanvasRelationalTreeWorkbench
            transformNode={transform}
            nodes={[clients, orders, transform]}
            edges={[edge(clients.id), edge(orders.id)]}
            copy={COPY}
            authoring={editable ? { canEditNode: true, onApplyNodeDraft } : undefined}
          />
        );
      });
      await act(async () => {
        container
          .querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-node-expand"]')
          .forEach((button) => button.click());
      });
      for (const card of container.querySelectorAll('[data-slot="canvas-relational-tree-node"]')) {
        const detail = card
          .closest('li')!
          .querySelector('[data-slot="canvas-relational-card-detail"]');
        expect(detail, `Missing detail for ${card.getAttribute('data-operator')}`).not.toBeNull();
        expect(
          detail!.querySelectorAll('[data-slot="canvas-relational-expression-node"]').length
        ).toBeGreaterThan(0);
      }
      expect(onApplyNodeDraft).not.toHaveBeenCalled();
      await act(async () => {
        container
          .querySelector<HTMLButtonElement>(
            `[data-slot="canvas-relational-tree-node"][data-operator="${operation}"]`
          )!
          .click();
      });

      const properties = container.querySelector(
        '[data-slot="canvas-relational-tree-inline-editor"]'
      );
      expect(properties).not.toBeNull();
      expect(properties!.textContent).toContain(
        operation === 'sort' ? `${field.name} DESC NULLS LAST` : 'LIMIT 100 · OFFSET 2'
      );
      expect(
        properties!
          .querySelector('[data-slot="canvas-operation-properties-tab"]')
          ?.getAttribute('data-state')
      ).toBe('active');
      expect(properties!.querySelector('[data-slot="canvas-operation-tree-tab"]')).toBeNull();
      expect(
        properties!.querySelector('[data-slot="canvas-relational-expression-tree"]')
      ).toBeNull();
      expect(properties!.querySelector('form')).toBeNull();
      const edit = properties!.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-relational-edit"]'
      );
      expect(edit != null).toBe(editable);
      if (editable) {
        await act(async () => edit!.click());
        expect(
          container.querySelector('[data-slot="canvas-relational-tree-inline-editor"] form')
        ).not.toBeNull();
      }
    }
  );
});
