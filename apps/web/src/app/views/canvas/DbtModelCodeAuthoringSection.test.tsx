// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { DbtModelCodeAuthoringSection } from './DbtModelCodeAuthoringSection';
import { buildDbtAuthoringModelProjection } from './dbtAuthoringFieldsModel';

const source: CanonicalNode = {
  id: 'source-orders',
  name: 'Raw orders',
  pluginId: 'dbt',
  kind: 'dbt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: { dbt: { sourceName: 'raw', schemaName: 'raw', tableName: 'orders' } },
};

const model: CanonicalNode = {
  id: 'model-orders',
  name: 'Orders model',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: { dbt: { materialized: 'view', selectedSourceId: source.id } },
};

const edge: CanonicalEdge = {
  id: 'source-model',
  sourceId: source.id,
  targetId: model.id,
  relation: 'lineage',
};

function Harness(): JSX.Element {
  const [draft, setDraft] = useState<CanvasInspectorNodeDraft>(() =>
    createCanvasInspectorNodeDraft(model)
  );
  const dbtDraft = draft.dbt!;
  const projection = buildDbtAuthoringModelProjection({
    node: model,
    nodes: [source, model],
    edges: [edge],
    authoringMetadata: dbtDraft,
    kindLabels: { 'dbt:source': 'Source', 'dbt:model': 'Model' },
  });

  return (
    <>
      <DbtModelCodeAuthoringSection
        node={model}
        disabled={false}
        draft={dbtDraft}
        projection={projection}
        onChange={setDraft}
      />
      <output data-slot="model-sql-draft">{dbtDraft.modelSql}</output>
    </>
  );
}

describe('DbtModelCodeAuthoringSection', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows generated SQL with provenance and turns edits into authored draft SQL', () => {
    act(() => root.render(<Harness />));

    const editor = container.querySelector<HTMLTextAreaElement>('textarea[name="dbt-model-sql"]');
    expect(editor?.value).toBe("select *\nfrom {{ source('raw', 'orders') }}");
    expect(
      container.querySelector('[data-slot="dbt-model-code-provenance"]')?.textContent
    ).toContain('models/orders_model.sql');

    act(() => {
      fireEvent.input(editor!, {
        target: { value: "select order_id\nfrom {{ source('raw', 'orders') }}" },
      });
    });

    expect(container.querySelector('[data-slot="model-sql-draft"]')?.textContent).toBe(
      "select order_id\nfrom {{ source('raw', 'orders') }}"
    );
    expect(
      container.querySelector('[data-slot="dbt-model-code-provenance"]')?.textContent
    ).toContain('Authored');
  });

  it('keeps an explicitly cleared editor empty instead of restoring generated SQL', () => {
    act(() => root.render(<Harness />));

    const editor = container.querySelector<HTMLTextAreaElement>('textarea[name="dbt-model-sql"]');
    act(() => {
      fireEvent.input(editor!, { target: { value: '' } });
    });

    expect(editor?.value).toBe('');
    expect(container.querySelector('[data-slot="model-sql-draft"]')?.textContent).toBe('');
  });

  it.each(['Backspace', 'Delete'])('keeps the %s editing key inside the SQL editor', (key) => {
    act(() => root.render(<Harness />));

    const editor = container.querySelector<HTMLTextAreaElement>('textarea[name="dbt-model-sql"]');
    const leakedKeyDown = vi.fn();
    const leakedKeyUp = vi.fn();
    document.addEventListener('keydown', leakedKeyDown);
    document.addEventListener('keyup', leakedKeyUp);

    fireEvent.keyDown(editor!, { key });
    fireEvent.keyUp(editor!, { key });

    expect(leakedKeyDown).not.toHaveBeenCalled();
    expect(leakedKeyUp).not.toHaveBeenCalled();
    document.removeEventListener('keydown', leakedKeyDown);
    document.removeEventListener('keyup', leakedKeyUp);
  });
});
