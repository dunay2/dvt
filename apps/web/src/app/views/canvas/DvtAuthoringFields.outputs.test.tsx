// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { useAuthoringFieldsHarness } from './DvtAuthoringFields.test-support';
import { buildDvtNode } from './DvtAuthoringFields.test-fixtures';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import { createSourceSet } from './canvasSourceSet';
import { source } from './canvasRelationalOperator.test-support';
import { graphSource } from './canvasRelationGraph.test-support';

const documents = {
  join: () =>
    createCustomerOrdersJoin({
      left: source('left'),
      right: source('right'),
      targetNodeId: 'model',
    }),
  set: () =>
    createSourceSet({
      inputs: [source('left'), source('right'), source('third')],
      targetNodeId: 'model',
    }),
};
describe.each(Object.entries(documents))('%s relation output editor', (_kind, document) => {
  const view = useAuthoringFieldsHarness();
  const producers = ['left', 'right', ...(_kind === 'set' ? ['third'] : [])].map(graphSource);
  const edges = producers.map((producer) => ({
    id: `${producer.id}-model`,
    sourceId: producer.id,
    targetId: 'dvt-transform',
    relation: 'lineage' as const,
  }));
  const outputs = (): HTMLInputElement[] => [
    ...view.container.querySelectorAll<HTMLInputElement>(
      '[data-slot="relation-output-field"] input:not([type="checkbox"])'
    ),
  ];
  const setup = async (): Promise<ReturnType<typeof buildDvtNode>> => {
    const node = applyDvtSubstraitSemanticDocument(
      buildDvtNode('dvt:transform'),
      encodeDvtSubstraitSemanticDocument(document())
    );
    await act(async () =>
      view.renderFields(node, undefined, undefined, [node, ...producers], edges, 'columns')
    );
    return node;
  };

  it('keeps invalid text across inspector remount without changing authority, and can correct it', async () => {
    const node = await setup();
    const before = view.draftJson();
    const invalid = 'x'.repeat(63) + ' ';
    await act(async () => {
      fireEvent.input(outputs()[0]!, { target: { value: invalid } });
      fireEvent.focusOut(outputs()[0]!);
    });
    expect(outputs()[0]!.value).toBe(invalid);
    expect(outputs()[0]!.getAttribute('aria-invalid')).toBe('true');
    expect(view.draftJson()).toBe(before);
    const errorId = outputs()[0]!.getAttribute('aria-describedby');
    expect(documentOf(view.container).getElementById(errorId!)?.textContent).toBeTruthy();

    await act(async () =>
      view.renderFields(node, undefined, undefined, [node, ...producers], edges, 'general')
    );
    await act(async () =>
      view.renderFields(node, undefined, undefined, [node, ...producers], edges, 'columns')
    );
    expect(outputs()[0]!.value).toBe(invalid);
    await act(async () => {
      fireEvent.input(outputs()[0]!, { target: { value: 'key_alias' } });
      fireEvent.focusOut(outputs()[0]!);
    });
    expect(outputs()[0]!.getAttribute('aria-invalid')).toBeNull();
    const draft = JSON.parse(view.draftJson());
    expect(
      draft.sidecar.fields.some(
        (field: { displayName?: string }) => field.displayName === 'key_alias'
      )
    ).toBe(true);
    expect(view.outputNameDraftsJson()).not.toContain('key_alias');
  });

  it('rejects duplicate names and clears discarded edits when excluding an output', async () => {
    await setup();
    const before = view.draftJson();
    const selectedCount = view.container.querySelectorAll(
      '[data-slot="relation-output-field"] input[type="checkbox"]:checked'
    ).length;
    const duplicate = outputs()[1]!.value;
    await act(async () => {
      fireEvent.input(outputs()[0]!, { target: { value: duplicate } });
      fireEvent.focusOut(outputs()[0]!);
    });
    expect(outputs()[0]!.getAttribute('aria-invalid')).toBe('true');
    expect(view.draftJson()).toBe(before);
    await act(async () =>
      fireEvent.click(
        view.container.querySelector<HTMLInputElement>(
          '[data-slot="relation-output-field"] input[type="checkbox"]'
        )!
      )
    );
    expect(view.container.querySelector('[aria-invalid="true"]')).toBeNull();
    expect(view.outputNameDraftsJson()).toBe('{}');
    expect(
      view.container.querySelectorAll(
        '[data-slot="relation-output-field"] input[type="checkbox"]:checked'
      )
    ).toHaveLength(selectedCount - 1);
  });

  it('keeps the activated output control mounted and focused', async () => {
    await setup();
    const checkbox = view.container.querySelector<HTMLInputElement>(
      '[data-slot="relation-output-field"] input[type="checkbox"]'
    )!;
    checkbox.focus();

    await act(async () => fireEvent.click(checkbox));

    expect(checkbox.isConnected).toBe(true);
    expect(documentOf(view.container).activeElement).toBe(checkbox);
  });
});
function documentOf(element: HTMLElement): Document {
  return element.ownerDocument;
}
