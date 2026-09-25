// @vitest-environment jsdom
import { act, type Dispatch, type SetStateAction } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { DvtSubstraitCompositionStart } from './DvtSubstraitCompositionStart';
import { graphModel, graphSource } from './canvasRelationGraph.test-support';
import { useCompositionStartHarness } from './DvtSubstraitCompositionStartSection.test-support';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';

describe('initial CROSS composition', () => {
  const view = useCompositionStartHarness();
  const choose = () =>
    view.container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-select-operation-cross-join"]'
    )!;
  function render(count: number, disabled = false, mixed = false) {
    const inputs = Array.from({ length: count }, (_, index) => graphSource(`source-${index}`));
    if (mixed) {
      const metadata = inputs[1]!.metadata!;
      const ref = metadata.connectedSourceRef as { connectionRef: { connectionId: string } };
      ref.connectionRef.connectionId = 'another-connection';
    }
    const model = graphModel();
    const onChange = vi.fn<Dispatch<SetStateAction<CanvasInspectorNodeDraft>>>();
    act(() =>
      view.root.render(
        <DvtSubstraitCompositionStart
          disabled={disabled}
          node={model}
          nodes={[...inputs, model]}
          edges={inputs.map((source) => ({
            id: source.id,
            sourceId: source.id,
            targetId: model.id,
            relation: 'lineage',
          }))}
          onChange={onChange}
        />
      )
    );
    return onChange;
  }

  it.each([2, 3])(
    'confirms %i typed inputs into canonical CrossRel without a predicate',
    (count) => {
      const onChange = render(count);
      expect(choose().disabled).toBe(false);
      act(() => fireEvent.click(choose()));
      expect(onChange).not.toHaveBeenCalled();
      const cancel = view.container.querySelector<HTMLButtonElement>(
        '[data-slot="dvt-cancel-relational-operation"]'
      );
      expect(cancel).not.toBeNull();
      act(() => fireEvent.click(cancel!));
      expect(onChange).not.toHaveBeenCalled();
      act(() => fireEvent.click(choose()));
      act(() =>
        fireEvent.click(view.container.querySelector('[data-slot="dvt-confirm-composition"]')!)
      );
      expect(onChange).toHaveBeenCalledOnce();
      const update = onChange.mock.calls[0]![0];
      const next =
        typeof update === 'function'
          ? update({ name: 'Model', description: '', tags: [] })
          : update;
      const draft = next.dvt;
      if (draft?.kind !== 'transform' || draft.mode !== 'substrait')
        throw new Error('Missing canonical draft');
      const { index, schemas } = deriveSubstraitSchemas(draft);
      const relations = [...index.relations.values()];
      expect(relations.filter((entry) => entry.relation.relType.case === 'cross')).toHaveLength(
        count - 1
      );
      expect(relations.filter((entry) => entry.relation.relType.case === 'read')).toHaveLength(
        count
      );
      expect(relations.some((entry) => entry.relation.relType.case === 'join')).toBe(false);
      expect(schemas.get(index.rootId)).toHaveLength(count * 2);
    }
  );

  it.each(['read-only', 'different-connection'])(
    'rejects %s inputs before any mutation',
    (reason) => {
      const onChange = render(2, reason === 'read-only', reason === 'different-connection');
      expect(choose().disabled).toBe(true);
      act(() => fireEvent.click(choose()));
      expect(onChange).not.toHaveBeenCalled();
      expect(view.container.querySelector('[data-slot="dvt-confirm-composition"]')).toBeNull();
    }
  );
});
