// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { useAuthoringFieldsHarness } from './DvtAuthoringFields.test-support';
import { buildDvtNode } from './DvtAuthoringFields.test-fixtures';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import { createSourceSet } from './canvasSourceSet';
import { source } from './canvasRelationalOperator.test-support';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';

describe.each(['join', 'set'] as const)('Inspector composes over %s results', (kind) => {
  const view = useAuthoringFieldsHarness();
  it('inserts a filter on a selected input without replacing the composition', async () => {
    const document =
      kind === 'join'
        ? createCustomerOrdersJoin({
            left: source('left'),
            right: source('right'),
            targetNodeId: 'model',
          })
        : createSourceSet({ inputs: [source('left'), source('right')], targetNodeId: 'model' });
    const target = document.sidecar.relations.find((entry) => entry.sourceRef != null)!.relationId;
    const node = applyDvtSubstraitSemanticDocument(
      buildDvtNode('dvt:transform'),
      encodeDvtSubstraitSemanticDocument(document)
    );
    await act(async () => view.renderFields(node, undefined, undefined, [node], [], 'columns'));
    await act(async () =>
      fireEvent.change(view.container.querySelector('select')!, { target: { value: target } })
    );
    const chooser = [...view.container.querySelectorAll('select')].find((select) =>
      [...select.options].some((option) => option.value === 'filter')
    )!;
    await act(async () => fireEvent.change(chooser, { target: { value: 'filter' } }));
    await act(async () =>
      fireEvent.input(view.container.ownerDocument.querySelector('[role="dialog"] input')!, {
        target: { value: 'active' },
      })
    );
    await act(async () =>
      fireEvent.submit(view.container.ownerDocument.querySelector('[role="dialog"] form')!)
    );
    const updated = JSON.parse(view.draftJson());
    const indexed = indexSubstraitRelations(updated);
    if (!indexed.ok) throw indexed.error;
    const filter = [...indexed.index.relations.values()].find(
      (entry) => entry.relation.relType.case === 'filter'
    )!;
    expect(filter.inputs).toEqual([target]);
    const root = indexed.index.relations.get(indexed.index.rootId)!;
    expect(root.relation.relType.case).toBe(kind);
    expect(root.inputs).toContain(filter.binding.relationId);
    expect(
      updated.sidecar.relations.filter((entry: { sourceRef?: unknown }) => entry.sourceRef != null)
    ).toHaveLength(2);
  });
});
