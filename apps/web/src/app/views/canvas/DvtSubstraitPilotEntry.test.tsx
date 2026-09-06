// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { DvtAuthoringFields } from './DvtAuthoringFields';

const DVT_FIELD_ID = /dvt_fld_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

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

function transformNode(): CanonicalNode {
  return {
    id: 'transform-customers',
    name: 'Customers',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata: {},
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

  it('lets an empty Transform enter the exact connected customers fixture and edit before Apply', () => {
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
    expect(draft).toMatch(DVT_FIELD_ID);
    expect(draft).not.toContain('field:transform-customers:');
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
    const countryOption = Array.from(grain?.options ?? []).find(
      (option) => option.textContent?.trim() === 'country'
    );
    expect(countryOption).not.toBeUndefined();

    act(() => {
      fireEvent.change(grain!, { target: { value: countryOption!.value } });
      fireEvent.input(countName!, { target: { value: 'customer_count' } });
      fireEvent.click(summarize!);
    });

    const draft = container.querySelector('[data-slot="dvt-draft-json"]')?.textContent ?? '';
    expect(draft).toContain('"case":"aggregate"');
    expect(draft).toContain('"names":["country","customer_count"]');
    expect(draft).toMatch(DVT_FIELD_ID);
    expect(draft).not.toContain('field:transform-customers:');
    expect(
      container.querySelector('[data-slot="dvt-substrait-aggregation-authoring"]')
    ).not.toBeNull();

    const rankName = container.querySelector<HTMLInputElement>(
      '[data-slot="dvt-substrait-aggregate-window-output-name"]'
    );
    const rank = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-substrait-apply-aggregate-window"]'
    );
    expect(rankName?.value).toBe('count_rank');
    expect(rank).not.toBeNull();

    act(() => {
      fireEvent.keyDown(rank!, { key: 'Enter' });
    });
    const composed = container.querySelector('[data-slot="dvt-draft-json"]')?.textContent ?? '';
    expect(composed).toContain('"names":["country","customer_count","count_rank"]');
    expect(composed).toMatch(DVT_FIELD_ID);
    expect(composed).not.toContain('field:transform-customers:');
    expect(
      container.querySelector('[data-slot="dvt-substrait-aggregate-window-authoring"]')
    ).not.toBeNull();

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-substrait-remove-aggregate-window"]'
        )!
      );
    });
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
    expect(restored).not.toContain('customer_count');
    expect(restored).not.toContain('count_rank');
  });

  it('does not offer the pilot for a non-string fixture', () => {
    act(() =>
      root.render(
        <Harness key="non-string" source={sourceNode('number')} transform={transformNode()} />
      )
    );
    expect(container.querySelector('[data-slot="dvt-start-substrait-pilot"]')).toBeNull();
  });
});
