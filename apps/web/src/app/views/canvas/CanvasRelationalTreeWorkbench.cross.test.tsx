// @vitest-environment jsdom
/** Owned concern: relational workbench cross behavior. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { createSourceCross } from './canvasSourceCross';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import {
  setupWorkbenchTest,
  COPY,
  sourceRef,
  sourceNode,
  transformNode,
  edge,
  root,
  container,
  dragSourceTo,
} from './CanvasRelationalTreeWorkbench.test-support';
import { openOperationMenu } from './operation-menu/operationMenu.test-support';
import {
  connectWorkbenchOutput,
  instantiateWorkbenchSource,
  connectStagedWorkbenchBinaryOperation,
  stageWorkbenchOperation,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';

describe('Canvas relational-tree Workbench cross', () => {
  setupWorkbenchTest();
  it('authors an explicit CrossRel by drag without opening a predicate editor', async () => {
    const sizes = sourceNode('sizes', 'sizes');
    const colours = sourceNode('colours', 'colours');
    const transform = transformNode();
    const applied: CanvasInspectorNodeDraft[] = [];

    await act(async () => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[sizes, colours, transform]}
          edges={[edge(sizes.id), edge(colours.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: (_nodeId, draft) => {
              applied.push(draft);
              return { outcome: 'no_changes' };
            },
          }}
        />
      );
    });

    const sources = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    );
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-tree-draft-viewport"]'
    )!;
    await act(async () => dragSourceTo(sources[0]!, viewport));
    await act(async () => dragSourceTo(sources[1]!, viewport));
    openOperationMenu(container);
    const cross = document.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-select-operation-cross-join"]'
    );
    expect(cross?.getAttribute('aria-disabled')).toBe('false');
    expect(cross?.draggable).toBe(true);
    await act(async () => dragSourceTo(cross!, viewport));
    await connectStagedWorkbenchBinaryOperation();

    const stagedCross = container.querySelector<HTMLElement>(
      '[data-pending-operation="true"] [data-operator="cross"]'
    );
    expect(stagedCross).not.toBeNull();
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);
    await act(async () => stagedCross!.click());
    expect(
      container.querySelector('[data-slot="dvt-substrait-join-predicate-editors"]')
    ).toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-cross-warning"]')).toBeNull();

    const stagedOutput = stagedCross!.parentElement!.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-output-port"]'
    );
    await connectWorkbenchOutput(container, stagedOutput!);

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')!
        .click()
    );
    expect(applied).toHaveLength(1);
    expect(applied[0]?.relationalAuthoringDraft).toMatchObject({
      version: 'v1',
      operations: [
        {
          operation: 'cross_join',
          inputs: [expect.any(String), expect.any(String)],
        },
      ],
      outputRelationId: stagedCross!.getAttribute('data-relation-id'),
    });
  });

  it('reopens a persisted CROSS and connects another staged CROSS without a predicate editor', async () => {
    const sizes = sourceNode('sizes', 'sizes');
    const colours = sourceNode('colours', 'colours');
    const stores = sourceNode('stores', 'stores');
    const asInput = (node: CanonicalNode): CanvasDvtCompositionInput => ({
      nodeId: node.id,
      schema: 'public',
      table: node.name,
      sourceRef: sourceRef(node.name),
      fields: [
        {
          name: `${node.name}_id`,
          dataType: 'string',
          joinDataType: 'string' as const,
          nullable: true,
        },
      ],
    });
    const transform = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitSemanticDocument(createSourceCross([asInput(sizes), asInput(colours)]))
    );

    await act(async () => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[sizes, colours, stores, transform]}
          edges={[edge(sizes.id), edge(colours.id), edge(stores.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: () => ({ outcome: 'no_changes' }),
          }}
        />
      );
    });

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[data-slot="canvas-relational-tree-node"][data-operator="cross"]'
        )
        ?.click()
    );
    const storesButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((button) => button.textContent?.includes('stores'));
    await instantiateWorkbenchSource(storesButton!);
    await stageWorkbenchOperation('cross-join');

    const staged = Array.from(
      container.querySelectorAll<HTMLElement>('[data-pending-operation="true"]')
    ).find((card) => card.querySelector('[data-operator="cross"]') != null)!;
    const [left, right] = Array.from(
      staged.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-input-port"]')
    );
    const producers = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    );
    const currentCross = producers.find(
      (port) =>
        port.parentElement?.querySelector('[data-operator="cross"]') != null &&
        port.parentElement?.querySelector('[data-pending-operation="true"]') == null
    )!;
    const pendingStore = producers.find(
      (port) =>
        port.parentElement?.querySelector('[data-pending="true"][data-operator="read"]') != null
    )!;
    await act(async () => dragSourceTo(pendingStore, right!));
    await act(async () =>
      container
        .querySelector<SVGElement>('[data-slot="canvas-relational-output-edge-action"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    );
    await act(async () => dragSourceTo(currentCross, left!));

    expect(container.querySelectorAll('[data-operator="cross"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(3);
    expect(
      container.querySelector('[data-slot="dvt-substrait-join-predicate-editors"]')
    ).toBeNull();
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      2
    );
  });
});
