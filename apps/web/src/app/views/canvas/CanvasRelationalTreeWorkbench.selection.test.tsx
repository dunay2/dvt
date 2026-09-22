// @vitest-environment jsdom
/** Owned concern: retain a selected nested relation across applied semantic revisions. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { applyDvtSubstraitFetch, applyDvtSubstraitSort } from './canvasDvtSubstraitSortFetch';
import {
  createDvtSubstraitPilotDraft,
  inspectDvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import {
  setupWorkbenchTest,
  COPY,
  transformNode,
  root,
  container,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('applied relation selection', () => {
  setupWorkbenchTest();

  it.each(['revision', 'removed', 'different-model'] as const)(
    'reconciles %s by stable relation identity',
    (transition) => {
      const pilot = createDvtSubstraitPilotDraft({
        sourceNodeId: 'source',
        targetNodeId: 'transform',
      });
      const inspection = inspectDvtSubstraitPilotDraft(pilot);
      if (!inspection.ok) throw new Error('Expected pilot');
      const key = {
        fieldId: inspection.projection.outputs[0]!.fieldId,
        direction: SortField_SortDirection.ASC_NULLS_LAST as const,
      };
      const sorted = applyDvtSubstraitSort(pilot, [key]);
      const fetched = applyDvtSubstraitFetch(sorted, { count: 20n });
      const render = (draft: typeof fetched, id = 'transform'): void => {
        const node = applyDvtSubstraitSemanticDocument(
          { ...transformNode(), id },
          encodeDvtSubstraitSemanticDocument(draft)
        );
        act(() =>
          root.render(
            <CanvasRelationalTreeWorkbench
              transformNode={node}
              nodes={[node]}
              edges={[]}
              copy={COPY}
            />
          )
        );
      };
      render(fetched);
      const card = container.querySelector<HTMLButtonElement>('[data-operator="sort"]')!;
      const relationId = card.dataset.relationId!;
      const previousLocator = card.dataset.locator;
      act(() => card.click());
      expect(card.getAttribute('aria-selected')).toBe('true');
      const updated = applyDvtSubstraitSort(
        fetched,
        [{ ...key, direction: SortField_SortDirection.DESC_NULLS_LAST }],
        relationId
      );
      render(
        transition === 'removed' ? pilot : updated,
        transition === 'different-model' ? 'other' : 'transform'
      );
      const selected = container.querySelector(
        '[data-slot="canvas-relational-tree-node"][aria-selected="true"]'
      )!;
      if (transition === 'revision') {
        expect(selected.getAttribute('data-relation-id')).toBe(relationId);
        expect(selected.getAttribute('data-locator')).not.toBe(previousLocator);
        expect(
          container.querySelector('[data-slot="canvas-relational-tree-inline-editor"]')?.textContent
        ).toContain('DESC NULLS LAST');
      } else {
        expect(selected.getAttribute('data-operator')).toBe(
          transition === 'removed' ? 'project' : 'fetch'
        );
      }
    }
  );
});
