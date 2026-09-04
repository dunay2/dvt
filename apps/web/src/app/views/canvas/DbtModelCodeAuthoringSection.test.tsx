// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { DbtModelCodeAuthoringSection } from './DbtModelCodeAuthoringSection';
import { buildDbtAuthoringModelProjection } from './dbtAuthoringFieldsModel';

vi.mock('../../components/monaco/MonacoCodeEditor', () => ({
  MonacoCodeEditor: ({
    ariaLabel,
    language,
    path,
    value,
  }: {
    ariaLabel: string;
    language: string;
    path?: string;
    value: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      data-language={language}
      data-path={path}
      data-testid="dbt-model-sql-editor"
      value={value}
      readOnly
    />
  ),
}));

vi.mock('../../components/monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: ({
    ariaLabel,
    language,
    path,
    value,
  }: {
    ariaLabel: string;
    language: string;
    path?: string;
    value: string;
  }) => (
    <pre
      aria-label={ariaLabel}
      data-language={language}
      data-path={path}
      data-testid="dbt-model-sql-viewer"
    >
      {value}
    </pre>
  ),
}));

const source: CanonicalNode = {
  id: 'source-orders',
  name: 'Raw orders',
  pluginId: 'dbt',
  kind: 'dbt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    dbt: { sourceName: 'raw', schemaName: 'raw', tableName: 'orders' },
    columns: [
      { name: 'order_id', type: 'bigint' },
      { name: 'customer', type: 'text' },
    ],
  },
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
  const projection = buildDbtAuthoringModelProjection({
    node: model,
    nodes: [source, model],
    edges: [edge],
    authoringMetadata: {
      packageName: 'analytics',
      sourceName: 'orders_model',
      schemaName: 'raw',
      tableName: 'orders_model',
      materialized: 'view',
      selectedSourceId: source.id,
      projectionColumns: null,
    },
    kindLabels: { 'dbt:source': 'Source', 'dbt:model': 'Model' },
  });

  return <DbtModelCodeAuthoringSection node={model} projection={projection} />;
}

function UnconnectedHarness(): JSX.Element {
  return (
    <DbtModelCodeAuthoringSection
      node={model}
      projection={{
        originOptions: [],
        selectedOriginId: '',
        modelArtifact: null,
        projectionError: null,
      }}
    />
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

  it('shows generated SQL only as a read-only projection', () => {
    act(() => root.render(<Harness />));

    const viewer = container.querySelector<HTMLElement>('[data-testid="dbt-model-sql-viewer"]');
    expect(viewer?.textContent).toBe(
      'select\n  origin."order_id" as "order_id",\n  origin."customer" as "customer"\nfrom {{ source(\'raw\', \'orders\') }} as origin'
    );
    expect(viewer?.dataset.language).toBe('sql');
    expect(viewer?.dataset.path).toBe('models/orders_model.sql');
    expect(container.querySelector('[data-testid="dbt-model-sql-editor"]')).toBeNull();
    expect(
      container.querySelector('[data-slot="dbt-model-code-provenance"]')?.textContent
    ).toContain('read-only projection');
  });

  it('shows an empty read-only projection when no artifact is available', () => {
    act(() => root.render(<UnconnectedHarness />));

    expect(container.querySelector('label')?.textContent).toBe('Generated SQL projection');
    const viewer = container.querySelector<HTMLElement>('[data-testid="dbt-model-sql-viewer"]');
    expect(viewer).not.toBeNull();
    expect(viewer?.dataset.language).toBe('sql');
    expect(viewer?.dataset.path).toBe('models/orders_model.sql');
    expect(viewer?.textContent).toBe('');
    expect(container.querySelector('[data-slot="dbt-model-code-provenance"]')).toBeNull();
    expect(container.querySelector('[data-testid="dbt-model-sql-editor"]')).toBeNull();
  });
});
