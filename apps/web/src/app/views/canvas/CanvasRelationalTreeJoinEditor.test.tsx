// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { resolveCanvasDvtJoinDataType } from './canvasDvtJoinTypeAdmission';
import {
  createCanvasDvtInitialJoinDraft,
  resolveCanvasDvtInitialJoinPairForInputs,
} from './canvasDvtInitialJoinModel';
import {
  inspectDvtSubstraitJoinPredicateContext,
  type DvtSubstraitInnerJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import type { CanonicalNode } from '../../types/canonical';

function sourceInput(
  table: string,
  columns: readonly (readonly [string, string])[]
): CanvasDvtCompositionInput {
  return {
    nodeId: table,
    schema: 'raw',
    table,
    sourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        provider: 'postgres',
        connectionId: 'warehouse',
      },
      sourceObjectId: `raw.${table}`,
    },
    fields: columns.map(([name, dataType]) => ({
      name,
      dataType,
      joinDataType: resolveCanvasDvtJoinDataType(dataType),
    })),
  };
}

const client = sourceInput('client', [
  ['client_id', 'string'],
  ['name', 'string'],
]);
const orders = sourceInput('orders', [
  ['client_id', 'string'],
  ['order_id', 'i64'],
]);
const details = sourceInput('order_details', [
  ['line_id', 'i64'],
  ['order_id', 'i64'],
]);
const textDetails = sourceInput('text_details', [
  ['description', 'string'],
  ['client_id', 'string'],
]);
const transform: CanonicalNode = {
  id: 'model',
  name: 'Model',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {},
};

function makeDraft(left = client, right = orders): DvtSubstraitInnerJoinDraft {
  const pair = resolveCanvasDvtInitialJoinPairForInputs(left, right);
  expect(pair).not.toBeNull();
  const draft = createCanvasDvtInitialJoinDraft([left, right], pair!, transform.id);
  expect(draft).not.toBeNull();
  return draft!;
}

const baselineDraft = makeDraft();

describe('JOIN append field defaults', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onAppend = vi.fn();
  const onChange = vi.fn();
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    onAppend.mockClear();
    onChange.mockClear();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function renderEditor(
    appendInput: CanvasDvtCompositionInput | null,
    draft = baselineDraft
  ): void {
    act(() =>
      root.render(
        <CanvasRelationalTreeJoinEditor
          appendInput={appendInput}
          draft={draft}
          copy={resolveCanvasViewCopy('en')}
          onAppend={onAppend}
          onChange={onChange}
          selectedRelationId={null}
          transformNode={transform}
        />
      )
    );
  }

  function changeField(slot: 'existing' | 'connected', text: string): void {
    const select = container.querySelector<HTMLSelectElement>(
      `[data-slot="canvas-relational-tree-${slot}-field"]`
    )!;
    const option = Array.from(select.options).find((item) => item.textContent === text);
    expect(option).toBeDefined();
    act(() => {
      select.value = option!.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function expectPair(left: string, right: string): void {
    const existing = container.querySelector<HTMLSelectElement>(
      '[data-slot="canvas-relational-tree-existing-field"]'
    )!;
    const connected = container.querySelector<HTMLSelectElement>(
      '[data-slot="canvas-relational-tree-connected-field"]'
    )!;
    expect(existing.selectedOptions[0]?.textContent).toBe(left);
    expect(connected.selectedOptions[0]?.textContent).toBe(right);
    expect(
      container.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-relational-tree-append-input"]'
      )!.disabled
    ).toBe(false);
  }

  it('finds matching fields across all existing inputs when the first output is incompatible', () => {
    renderEditor(details);
    expectPair('orders.order_id', 'order_details.order_id');
    expect(onAppend).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-append-input"]')!
        .click()
    );
    const outputs =
      inspectDvtSubstraitJoinPredicateContext(baselineDraft)!.inspection.projection.outputs;
    expect(onAppend).toHaveBeenCalledWith({
      leftSourceFieldId: outputs.find((output) => output.source.name === 'order_id')!.source
        .fieldId,
      rightFieldName: 'order_id',
    });
  });

  it('chooses a same-name pair ahead of the first compatible right field', () => {
    renderEditor(textDetails);
    expectPair('client.client_id', 'text_details.client_id');
  });

  it('initializes when an append input arrives after the predicate editor was already mounted', () => {
    renderEditor(null);
    renderEditor(details);
    expectPair('orders.order_id', 'order_details.order_id');
  });

  it('retains explicit manual choices through parent rerenders and same-schema refreshes', () => {
    renderEditor(textDetails);
    changeField('existing', 'client.name');
    changeField('connected', 'text_details.client_id');
    renderEditor({ ...textDetails, fields: [...textDetails.fields] });
    expectPair('client.name', 'text_details.client_id');
    expect(onAppend).not.toHaveBeenCalled();
  });

  it('prefers the matching right field when the user changes the existing field', () => {
    const input = sourceInput('names', [
      ['description', 'string'],
      ['name', 'string'],
      ['client_id', 'string'],
    ]);
    renderEditor(input);
    changeField('existing', 'client.name');
    expectPair('client.name', 'names.name');
  });

  it('resets suggestions for a different append input and after closing and reopening', () => {
    renderEditor(textDetails);
    changeField('existing', 'client.name');
    renderEditor(details);
    expectPair('orders.order_id', 'order_details.order_id');
    renderEditor(textDetails);
    expectPair('client.client_id', 'text_details.client_id');
    changeField('existing', 'client.name');
    renderEditor(null);
    renderEditor(textDetails);
    expectPair('client.client_id', 'text_details.client_id');
  });

  it('reconciles a selected field removed from the canonical draft', () => {
    renderEditor(details);
    const replacement = sourceInput('replacements', [
      ['client_id', 'string'],
      ['order_id', 'i64'],
    ]);
    renderEditor(details, makeDraft(client, replacement));
    expectPair('replacements.order_id', 'order_details.order_id');
  });

  it('keeps an incompatible manual left field visible but explains and blocks the append', () => {
    renderEditor(details);
    changeField('existing', 'client.name');
    const connected = container.querySelector<HTMLSelectElement>(
      '[data-slot="canvas-relational-tree-connected-field"]'
    )!;
    expect(connected.value).toBe('');
    expect(connected.selectedOptions[0]?.textContent).toContain('No compatible fields');
    expect(
      container.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-relational-tree-append-input"]'
      )!.disabled
    ).toBe(true);
    act(() => {
      container
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onAppend).not.toHaveBeenCalled();
  });

  it.each([
    { columns: [] },
    { columns: [['unknown', 'integer']] },
    { columns: [['timestamp', 'precisionTimestampTz']] },
  ] as const)('does not invent a pair for unavailable field metadata: $columns', ({ columns }) => {
    renderEditor(sourceInput('unavailable', columns));
    expect(
      container.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-relational-tree-append-input"]'
      )!.disabled
    ).toBe(true);
    act(() => {
      container
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onAppend).not.toHaveBeenCalled();
  });

  it('prefers matching names for the initial JOIN but honors an explicit pair', () => {
    const left = sourceInput('left', [
      ['description', 'string'],
      ['order_id', 'i64'],
    ]);
    const right = sourceInput('right', [
      ['notes', 'string'],
      ['order_id', 'i64'],
    ]);
    expect(resolveCanvasDvtInitialJoinPairForInputs(left, right)).toMatchObject({
      leftFieldName: 'order_id',
      rightFieldName: 'order_id',
    });
    expect(
      resolveCanvasDvtInitialJoinPairForInputs(left, right, {
        leftFieldName: 'description',
        rightFieldName: 'notes',
      })
    ).toMatchObject({ leftFieldName: 'description', rightFieldName: 'notes' });
  });
});
