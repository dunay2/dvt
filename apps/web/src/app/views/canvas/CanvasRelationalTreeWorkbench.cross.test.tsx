// @vitest-environment jsdom
/** Owned concern: relational workbench cross behavior. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  createDvtSubstraitCrossDraft,
  encodeDvtSubstraitCrossDocument,
} from './canvasDvtSubstraitCrossComposition';
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

describe('Canvas relational-tree Workbench cross', () => {
  setupWorkbenchTest();
  it('authors and appends an explicit CrossRel without opening a predicate editor', () => {
    const sizes = sourceNode('sizes', 'sizes');
    const colours = sourceNode('colours', 'colours');
    const stores = sourceNode('stores', 'stores');
    const transform = transformNode();
    const applied: CanvasInspectorNodeDraft[] = [];

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[sizes, colours, stores, transform]}
          edges={[edge(sizes.id), edge(colours.id), edge(stores.id)]}
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
    act(() => sources[0]!.click());
    act(() => sources[1]!.click());
    openOperationMenu(container);
    const cross = document.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-select-operation-cross-join"]'
    );
    expect(cross?.getAttribute('aria-disabled')).toBe('false');
    expect(cross?.draggable).toBe(true);
    act(() =>
      dragSourceTo(
        cross!,
        container.querySelector<HTMLElement>('[data-slot="canvas-relational-tree-draft-viewport"]')!
      )
    );

    expect(container.querySelectorAll('[data-operator="cross"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);
    expect(
      container.querySelector('[data-slot="dvt-substrait-join-predicate-editors"]')
    ).toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-cross-warning"]')).not.toBeNull();

    act(() => sources[2]!.click());
    expect(container.querySelectorAll('[data-operator="cross"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(3);
    expect(
      container.querySelector('[data-slot="dvt-substrait-join-predicate-editors"]')
    ).toBeNull();

    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')!
        .click()
    );
    expect(applied).toHaveLength(1);
    expect(applied[0]?.dvt).toMatchObject({
      kind: 'transform',
      mode: 'substrait',
      shape: 'cross_join',
    });
  });

  it('reopens a persisted CROSS and appends structurally without a JOIN predicate editor', () => {
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
      encodeDvtSubstraitCrossDocument(
        createDvtSubstraitCrossDraft({ inputs: [asInput(sizes), asInput(colours)] })
      )
    );

    act(() => {
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

    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-node-expand"]')
        ?.click()
    );
    const storesButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((button) => button.textContent?.includes('stores'));
    act(() => storesButton?.click());

    expect(container.querySelectorAll('[data-operator="cross"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(3);
    expect(
      container.querySelector('[data-slot="dvt-substrait-join-predicate-editors"]')
    ).toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-cross-warning"]')).not.toBeNull();
  });
});
