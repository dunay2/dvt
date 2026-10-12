// @vitest-environment jsdom
/** The final source occurrence is removable without deleting Output or writing implicitly. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { createSourceDocument } from './canvasSourceDocument';
import { createSourceRelation } from './canvasSourceRelation';
import { dropWorkbenchSource } from './CanvasRelationalTreeWorkbench.gestures.test-support';
import {
  COPY,
  container,
  edge,
  root,
  setupWorkbenchTest,
  sourceNode,
  sourceRef,
  transformNode,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('Canvas relational-tree source removal', () => {
  setupWorkbenchTest();

  it.each(['new', 'saved'] as const)(
    'removes the final instance from a %s model',
    async (state) => {
      const source = sourceNode('customers', 'customers');
      const read = createSourceRelation(
        {
          source: {
            nodeId: source.id,
            schema: 'public',
            table: 'customers',
            sourceRef: sourceRef('customers'),
          },
          fields: ['customers_id'],
        },
        1
      );
      const target =
        state === 'new'
          ? transformNode()
          : applyDvtSubstraitSemanticDocument(
              transformNode(),
              encodeDvtSubstraitSemanticDocument(createSourceDocument([read], read))
            );
      const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
      const handle =
        React.createRef<
          import('./useCanvasRelationalTreeWorkbenchHandle').CanvasRelationalTreeWorkbenchHandle
        >();
      await act(async () =>
        root.render(
          <CanvasRelationalTreeWorkbench
            ref={handle}
            transformNode={target}
            nodes={[source, target]}
            edges={[edge(source.id)]}
            copy={COPY}
            authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
          />
        )
      );
      if (state === 'new') await dropWorkbenchSource(source.id);

      const card = container.querySelector<HTMLElement>('[data-operator="read"]')!;
      await act(async () => card.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true })));
      await act(async () =>
        document
          .querySelector<HTMLElement>('[data-slot="canvas-relational-remove-source"]')!
          .click()
      );
      if (state === 'saved') {
        expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(1);
        expect(handle.current!.hasUnappliedChanges).toBe(false);
        await act(async () =>
          container
            .querySelector<HTMLButtonElement>('[data-slot="canvas-card-removal-confirm"]')!
            .click()
        );
      }
      expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(0);
      expect(container.querySelector('[data-slot="canvas-relational-tree-output"]')).not.toBeNull();
      expect(container.querySelector('[data-slot="canvas-relational-output-edge"]')).toBeNull();
      expect(container.querySelector('[data-slot="canvas-relational-pending-edge"]')).toBeNull();
      expect(handle.current!.hasUnappliedChanges).toBe(state === 'saved');
      expect(apply).not.toHaveBeenCalled();

      await dropWorkbenchSource(source.id);
      await act(async () => handle.current!.cancel());
      expect(handle.current!.hasUnappliedChanges).toBe(false);
      if (state === 'saved')
        expect(
          container.querySelector('[data-operator="read"]')?.getAttribute('data-relation-id')
        ).toBe(read.binding.relationId);
    }
  );
});
