// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NodePropertySectionView } from './NodePropertySectionView';
import { NODE_PROPERTY_ROW_ID, type NodePropertySection } from './nodePropertiesReadModel';

vi.mock('../monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: ({
    language,
    path,
    value,
  }: {
    language: string;
    path?: string;
    value: string;
  }) => (
    <div data-language={language} data-path={path} data-testid="monaco-code-viewer">
      {value}
    </div>
  ),
}));

function renderSection(section: NodePropertySection): {
  container: HTMLDivElement;
  root: Root;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  act(() => {
    root.render(
      <NodePropertySectionView
        section={section}
        slots={{ code: 'node-section-code', sectionPrefix: 'node-section' }}
        surface="workbench"
      />
    );
  });

  return { container, root };
}

describe('NodePropertySectionView', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = null;
    root = null;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (root != null) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
  });

  it('renders table metadata from the section read model', () => {
    ({ container, root } = renderSection({
      id: 'columns',
      label: 'Columns',
      description: '2 columns inherited from the connected source.',
      rows: [],
      tableRows: [
        {
          id: 'order_id',
          cells: { name: 'order_id', type: 'integer', nullable: 'not null' },
        },
      ],
    }));

    expect(container.querySelector('[data-slot="node-section-columns-section"]')).not.toBeNull();
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.textContent).toContain('order_id');
    expect(container.textContent).toContain('integer');
    expect(container.textContent).toContain('not null');
    expect(
      container.querySelector('[data-slot="node-section-columns-description"]')?.textContent
    ).toBe('2 columns inherited from the connected source.');
  });

  it('keeps long relationship values inside their assigned workbench columns', () => {
    ({ container, root } = renderSection({
      id: 'inputs-outputs',
      label: 'Inputs / Outputs',
      rows: [],
      tableRows: [
        {
          id: 'source-to-transform',
          cells: {
            direction: 'Input',
            node: 'source_1',
            nodeId: 'src_postgresql_local_2333_dvt_public_source_1',
            relation: 'Lineage',
          },
        },
      ],
    }));

    const table = container.querySelector('table');
    const longValueCell = Array.from(container.querySelectorAll('td')).find(
      (cell) => cell.textContent === 'src_postgresql_local_2333_dvt_public_source_1'
    );

    expect(table?.className).toContain('table-fixed');
    expect(longValueCell?.className).toContain('break-words');
    expect(container.textContent).toContain('Lineage');
  });

  it('renders scalar rows and code through shared Monaco without involving the tabs coordinator', () => {
    ({ container, root } = renderSection({
      id: 'general',
      label: 'General',
      rows: [{ id: NODE_PROPERTY_ROW_ID.status, label: 'Status', value: 'Ready' }],
      tableRows: [],
    }));

    expect(container.querySelector('dl')?.textContent).toContain('Status');
    expect(container.textContent).toContain('Ready');

    act(() => {
      root?.render(
        <NodePropertySectionView
          section={{
            id: 'code',
            label: 'Code',
            rows: [],
            tableRows: [],
            code: 'select * from orders',
            codeLanguage: 'sql',
            codePath: 'models/orders.sql',
          }}
          slots={{ code: 'node-section-code', sectionPrefix: 'node-section' }}
          surface="workbench"
        />
      );
    });

    const codeViewer = container.querySelector<HTMLElement>('[data-testid="monaco-code-viewer"]');
    expect(codeViewer?.textContent).toBe('select * from orders');
    expect(codeViewer?.dataset.language).toBe('sql');
    expect(codeViewer?.dataset.path).toBe('models/orders.sql');
    expect(container.querySelector('pre')).toBeNull();
  });

  it('renders compact metric values as accessible evidence hotspots', () => {
    ({ container, root } = renderSection({
      id: 'general',
      label: 'General',
      rows: [
        {
          id: NODE_PROPERTY_ROW_ID.size,
          label: 'Size',
          value: 'Estimated 99.6 KB',
          tone: 'estimated',
          detail: '102,000 B (99.6 KB). Estimated using schema width. Confidence: low.',
        },
      ],
      tableRows: [],
    }));

    const hotspot = container.querySelector('[data-slot="node-property-metric-evidence"]');
    expect(hotspot?.textContent).toBe('Estimated 99.6 KB');
    expect(hotspot?.getAttribute('data-tone')).toBe('estimated');
    expect(hotspot?.getAttribute('aria-label')).toContain('Estimated using schema width');
  });

  it('places contextual contributions on their declared side of the passive body', () => {
    const section: NodePropertySection = {
      id: 'general',
      label: 'General',
      rows: [{ id: NODE_PROPERTY_ROW_ID.status, label: 'Status', value: 'Ready' }],
      tableRows: [],
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <NodePropertySectionView
          section={section}
          slots={{ code: 'node-section-code', sectionPrefix: 'node-section' }}
          surface="workbench"
          beforeBody={<div data-slot="before-contribution">Before</div>}
          afterBody={<div data-slot="after-contribution">After</div>}
        />
      );
    });

    const before = container.querySelector('[data-slot="before-contribution"]')!;
    const body = container.querySelector('dl')!;
    const after = container.querySelector('[data-slot="after-contribution"]')!;

    expect(before.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(body.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('does not render a passive empty state when contextual content owns the section body', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <NodePropertySectionView
          section={{ id: 'code', label: 'Code', rows: [], tableRows: [] }}
          slots={{ code: 'node-section-code', sectionPrefix: 'node-section' }}
          surface="workbench"
          afterBody={<textarea aria-label="Model SQL" />}
        />
      );
    });

    expect(container.textContent).not.toContain('No properties are recorded for this section.');
    expect(container.querySelector('textarea[aria-label="Model SQL"]')).not.toBeNull();
  });

  it('does not repeat the active Code tab as an inner workbench heading', () => {
    ({ container, root } = renderSection({
      id: 'code',
      label: 'Code',
      rows: [],
      tableRows: [],
      code: 'select 1',
    }));

    expect(container.querySelector('h3')).toBeNull();
    expect(container.querySelector('[data-slot="node-section-code"]')).not.toBeNull();
  });

  it('does not repeat the active General tab as an inner workbench heading', () => {
    ({ container, root } = renderSection({
      id: 'general',
      label: 'General',
      rows: [{ id: NODE_PROPERTY_ROW_ID.status, label: 'Status', value: 'Ready' }],
      tableRows: [],
    }));

    expect(container.querySelector('h3')).toBeNull();
    expect(container.querySelector('dl')?.textContent).toContain('Status');
  });
});
