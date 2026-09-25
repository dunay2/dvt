import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
// @vitest-environment jsdom
/** Owned concern: rejected ordering stays visibly unsupported and never opens a JOIN viewer. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { applyDvtSubstraitSort } from './canvasSortFetch.test-support';
import { projectionScenario } from './canvasProjectionScenario.test-support';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import {
  setupWorkbenchTest,
  COPY,
  transformNode,
  root,
  container,
  sourceNode,
  sourceRef,
  edge,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('unsupported relation inspection', () => {
  setupWorkbenchTest();

  it.each([
    [false, SortField_SortDirection.UNSPECIFIED],
    [true, SortField_SortDirection.UNSPECIFIED],
    [false, SortField_SortDirection.CLUSTERED],
    [true, SortField_SortDirection.CLUSTERED],
  ] as const)(
    'inspects rejected Sort without authoring (editable=%s, direction=%s)',
    async (editable, direction) => {
      const pilot = projectionScenario({
        sourceNodeId: 'source',
        targetNodeId: 'transform',
      });
      const { index } = deriveSubstraitSchemas(pilot);
      const outputs = index.relations.get(index.rootId)!.fields;
      pilot.sidecar.relations[0]!.sourceRef = sourceRef('customers');
      const sorted = applyDvtSubstraitSort(pilot, [
        {
          fieldId: outputs[0]!.fieldId,
          direction: SortField_SortDirection.ASC_NULLS_LAST,
        },
      ]);
      const relation = sorted.plan.relations[0]?.relType;
      if (relation?.case !== 'root' || relation.value.input?.relType.case !== 'sort')
        throw new Error('Expected Sort');
      relation.value.input.relType.value.sorts[0]!.sortKind = {
        case: 'direction',
        value: direction,
      };
      const transform = applyDvtSubstraitSemanticDocument(
        transformNode(),
        encodeDvtSubstraitSemanticDocument(sorted)
      );
      const before = structuredClone(transform);
      const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' as const }));
      const source = sourceNode('source', 'customers');
      await act(async () =>
        root.render(
          <CanvasRelationalTreeWorkbench
            transformNode={transform}
            nodes={[source, transform]}
            edges={[edge(source.id)]}
            copy={COPY}
            authoring={{ canEditNode: editable, onApplyNodeDraft }}
          />
        )
      );
      const card = container.querySelector<HTMLButtonElement>('[data-operator="unsupported"]')!;
      expect(card).not.toBeNull();
      expect(card.textContent).toContain(COPY.operationUnsupportedLabel);
      const relationId = card.dataset.relationId;
      await act(async () => card.click());
      const properties = container.querySelector(
        '[data-slot="canvas-relational-tree-inline-editor"]:not([hidden])'
      );
      expect(properties?.getAttribute('aria-label')).toBe(COPY.operationUnsupportedLabel);
      expect(properties?.getAttribute('data-relation-id')).toBe(relationId);
      expect(properties?.querySelector('[data-slot="canvas-operation-tree-tab"]')).toBeNull();
      expect(properties?.querySelector('form')).toBeNull();
      expect(
        container.querySelector('[data-slot="canvas-relational-tree-block-canvas"]')
      ).toBeNull();
      expect(onApplyNodeDraft).not.toHaveBeenCalled();
      expect(transform).toEqual(before);
    }
  );
});
