// @vitest-environment jsdom
/** Owned concern: rejected ordering stays visibly unsupported and never opens a JOIN viewer. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { applyDvtSubstraitSort } from './canvasSortFetch.test-support';
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

describe('unsupported relation inspection', () => {
  setupWorkbenchTest();

  it('opens a rejected Sort with a key without disguising or evaluating it as a JOIN', () => {
    const pilot = createDvtSubstraitPilotDraft({
      sourceNodeId: 'source',
      targetNodeId: 'transform',
    });
    const inspection = inspectDvtSubstraitPilotDraft(pilot);
    if (!inspection.ok) throw new Error('Expected pilot');
    const sorted = applyDvtSubstraitSort(pilot, [
      {
        fieldId: inspection.projection.outputs[0]!.fieldId,
        direction: SortField_SortDirection.ASC_NULLS_LAST,
      },
    ]);
    const relation = sorted.plan.relations[0]?.relType;
    if (relation?.case !== 'root' || relation.value.input?.relType.case !== 'sort')
      throw new Error('Expected Sort');
    relation.value.input.relType.value.sorts[0]!.sortKind = {
      case: 'direction',
      value: SortField_SortDirection.UNSPECIFIED,
    };
    const transform = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitSemanticDocument(sorted)
    );
    act(() =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[transform]}
          edges={[]}
          copy={COPY}
        />
      )
    );
    const card = container.querySelector<HTMLButtonElement>('[data-operator="unsupported"]')!;
    expect(card).not.toBeNull();
    expect(card.textContent).toContain(COPY.operationUnsupportedLabel);
    expect(card.className).toContain('border-rose');
    act(() => card.click());
    const properties = container.querySelector(
      '[data-slot="canvas-relational-tree-inline-editor"]'
    );
    expect(properties?.textContent).toContain(COPY.operationUnsupportedLabel);
    expect(properties?.querySelector('[data-slot="canvas-operation-tree-tab"]')).toBeNull();
    expect(properties?.querySelector('form')).toBeNull();
  });
});
