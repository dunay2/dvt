// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { DvtAuthoringFields } from './DvtAuthoringFields';

vi.mock('../../components/monaco/MonacoCodeEditor', () => ({
  MonacoCodeEditor: ({ value }: { value: string }) => (
    <textarea data-testid="dvt-transform-sql-editor" readOnly value={value} />
  ),
}));

function sourceNode(type = 'string'): CanonicalNode {
  return {
    id: 'source-customers',
    name: 'customers',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['authoring'],
    metadata: {
      columns: [
        { name: 'name', type },
        { name: 'email', type: 'string' },
        { name: 'country', type: 'string' },
      ],
    },
  };
}

function transformNode(sql = ''): CanonicalNode {
  return {
    id: 'transform-customers',
    name: 'Customers',
    pluginId: 'dvt',
    kind: 'dvt:sql_transform',
    role: 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata: sql.length === 0 ? {} : { sql, config: { sql } },
  };
}

function Harness({
  source,
  transform,
}: {
  source: CanonicalNode;
  transform: CanonicalNode;
}): JSX.Element {
  const [draft, setDraft] = useState(() => createCanvasInspectorNodeDraft(transform));
  const edges: readonly CanonicalEdge[] = [
    { id: 'source-transform', sourceId: source.id, targetId: transform.id, relation: 'lineage' },
  ];
  return (
    <>
      <DvtAuthoringFields
        node={transform}
        nodes={[source, transform]}
        edges={edges}
        disabled={false}
        draft={draft}
        errors={validateCanvasInspectorNodeDraft(draft)}
        section="code"
        onChange={setDraft}
      />
      <output data-slot="dvt-draft-json">{JSON.stringify(draft.dvt)}</output>
    </>
  );
}

describe('Substrait pilot entry through ConfigureCanvasDvtNode', () => {
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

  it('lets an empty SQL transform enter the exact connected customers fixture and edit before Apply', () => {
    const source = sourceNode();
    const transform = transformNode();
    act(() => root.render(<Harness source={source} transform={transform} />));

    const entry = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-start-substrait-pilot"]'
    );
    expect(entry).not.toBeNull();

    act(() => {
      fireEvent.click(entry!);
    });

    const draft = container.querySelector('[data-slot="dvt-draft-json"]')?.textContent ?? '';
    expect(draft).toContain('"mode":"substrait"');
    expect(draft).toContain('field:transform-customers:name');
    expect(draft).not.toContain('"sql"');
    expect(container.querySelector('[data-slot="dvt-substrait-pilot-authoring"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="dvt-transform-sql-editor"]')).toBeNull();
  });

  it('chooses a grain field and count output through the same Substrait draft', () => {
    const source = sourceNode();
    const transform = transformNode();
    act(() => root.render(<Harness source={source} transform={transform} />));

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-start-substrait-pilot"]')!
      );
    });
    const grain = container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-substrait-grain-field"]'
    );
    const countName = container.querySelector<HTMLInputElement>(
      '[data-slot="dvt-substrait-count-output-name"]'
    );
    const summarize = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-substrait-apply-aggregation"]'
    );
    expect(grain).not.toBeNull();
    expect(countName?.value).toBe('row_count');
    expect(summarize).not.toBeNull();

    act(() => {
      fireEvent.change(grain!, { target: { value: 'field:transform-customers:country' } });
      fireEvent.input(countName!, { target: { value: 'customer_count' } });
      fireEvent.click(summarize!);
    });

    const draft = container.querySelector('[data-slot="dvt-draft-json"]')?.textContent ?? '';
    expect(draft).toContain('"case":"aggregate"');
    expect(draft).toContain('"names":["country","customer_count"]');
    expect(draft).toContain('field:transform-customers:count');
    expect(
      container.querySelector('[data-slot="dvt-substrait-aggregation-authoring"]')
    ).not.toBeNull();

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-substrait-remove-aggregation"]'
        )!
      );
    });
    const restored = container.querySelector('[data-slot="dvt-draft-json"]')?.textContent ?? '';
    expect(restored).toContain('"case":"project"');
    expect(restored).not.toContain('"fieldId":"field:transform-customers:count"');
  });

  it('does not offer the pilot for a non-string fixture or when SQL already has authority', () => {
    act(() =>
      root.render(
        <Harness key="non-string" source={sourceNode('number')} transform={transformNode()} />
      )
    );
    expect(container.querySelector('[data-slot="dvt-start-substrait-pilot"]')).toBeNull();

    act(() =>
      root.render(
        <Harness key="sql-authority" source={sourceNode()} transform={transformNode('select 1')} />
      )
    );
    expect(container.querySelector('[data-slot="dvt-start-substrait-pilot"]')).toBeNull();
  });
});
