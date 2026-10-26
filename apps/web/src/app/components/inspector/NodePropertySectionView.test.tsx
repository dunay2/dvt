// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NodePropertySectionView } from './NodePropertySectionView';
import { NODE_PROPERTY_ROW_ID, type NodePropertySection } from './nodePropertiesContracts';
import type { NodePropertyTableProps } from './NodePropertyTable';

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

function renderSection(
  section: NodePropertySection,
  renderTableCell?: NodePropertyTableProps['renderTableCell']
): {
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
        renderTableCell={renderTableCell}
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

  it('collapses column metadata behind a name-first disclosure by default', () => {
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
    expect(container.querySelector('[data-slot="node-property-column-list"]')).not.toBeNull();
    const disclosure = container.querySelector<HTMLDetailsElement>(
      '[data-slot="node-property-column-disclosure"]'
    );
    const trigger = disclosure?.querySelector('summary');

    expect(disclosure?.open).toBe(false);
    expect(trigger?.textContent).toBe('order_id');
    expect(trigger?.textContent).not.toContain('integer');
    expect(container.querySelector('dl')).not.toBeNull();
    expect(container.querySelector('table')).toBeNull();
    expect(disclosure?.textContent).toContain('integer');
    expect(disclosure?.textContent).toContain('not null');
    expect(
      container.querySelector('[data-slot="node-section-columns-description"]')?.textContent
    ).toBe('2 columns inherited from the connected source.');
  });

  it('uses independent native disclosures so pointer and keyboard activation share semantics', () => {
    ({ container, root } = renderSection({
      id: 'columns',
      label: 'Columns',
      rows: [],
      tableRows: [
        { id: 'event_id', cells: { name: 'event_id', type: 'text' } },
        { id: 'event_type', cells: { name: 'event_type', type: 'text' } },
      ],
    }));

    const disclosures = Array.from(
      container.querySelectorAll<HTMLDetailsElement>(
        '[data-slot="node-property-column-disclosure"]'
      )
    );
    const firstTrigger = disclosures[0]?.querySelector<HTMLElement>('summary');

    expect(disclosures).toHaveLength(2);
    expect(disclosures.every((disclosure) => !disclosure.open)).toBe(true);
    expect(firstTrigger?.tagName).toBe('SUMMARY');

    act(() => {
      firstTrigger?.click();
    });

    expect(disclosures[0]?.open).toBe(true);
    expect(disclosures[1]?.open).toBe(false);
  });

  it('summarizes Input and Output relationships with optional connection and no internal node identity', () => {
    ({ container, root } = renderSection({
      id: 'inputs-outputs',
      label: 'Inputs / Outputs',
      rows: [],
      tableRows: [
        {
          id: 'input:source-to-transform',
          cells: {
            direction: 'Input',
            node: 'client',
            nodeId: 'src_postgresql_local_2333_dvt_public_source_1',
            relation: 'Lineage',
            connection: 'local-postgres-proof',
          },
        },
        {
          id: 'output:transform-to-sink',
          cells: {
            direction: 'Output',
            node: 'published_orders',
            nodeId: 'private-sink-id',
            relation: 'Lineage',
          },
        },
      ],
    }));

    const list = container.querySelector('[data-slot="node-property-relationship-list"]');
    const records = [
      ...container.querySelectorAll('[data-slot="node-property-relationship-record"]'),
    ];
    const header = records[0]!.querySelector('[data-slot="node-property-relationship-summary"]')!;

    expect(container.querySelector('table')).toBeNull();
    expect(list?.tagName).toBe('UL');
    expect(records).toHaveLength(2);
    expect(records.every((record) => record.tagName === 'LI')).toBe(true);
    expect([...header.children].map((cell) => cell.textContent)).toEqual([
      'Input',
      'client',
      'Lineage',
    ]);
    expect(
      records[0]!.querySelector('[data-slot="node-property-relationship-connection"]')?.textContent
    ).toBe('local-postgres-proof');
    expect(
      records[1]!.querySelector('[data-slot="node-property-relationship-summary"]')?.textContent
    ).toContain('Output');
    expect(
      records[1]!.querySelector('[data-slot="node-property-relationship-node"]')?.textContent
    ).toBe('published_orders');
    expect(
      records[1]!.querySelector('[data-slot="node-property-relationship-connection"]')
    ).toBeNull();
    expect(list?.querySelector('dl, dt, dd')).toBeNull();
    expect(container.textContent).not.toContain('src_postgresql_local_2333_dvt_public_source_1');
    expect(container.textContent).not.toContain('private-sink-id');
  });

  it.each(['', '   ', 'opaque-node-identity'])(
    'uses the existing empty cell for missing business names (%j)',
    (name) => {
      const section: NodePropertySection = {
        id: 'inputs-outputs',
        label: 'Inputs / Outputs',
        rows: [],
        tableRows: [
          {
            id: 'input:opaque-edge-identity',
            cells: {
              direction: 'Input',
              node: name,
              nodeId: 'opaque-node-identity',
              relation: 'Lineage',
            },
          },
        ],
      };
      const original = structuredClone(section);
      ({ container, root } = renderSection(section));
      expect(
        container.querySelector('[data-slot="node-property-relationship-node"]')?.textContent
      ).toBe('-');
      const accessible = [...container.querySelectorAll('[title], [aria-label]')]
        .flatMap((element) => [element.getAttribute('title'), element.getAttribute('aria-label')])
        .join(' ');
      expect(`${container.textContent} ${accessible}`).not.toContain('opaque-node-identity');
      expect(`${container.textContent} ${accessible}`).not.toContain('opaque-edge-identity');
      expect(section).toEqual(original);
    }
  );

  it('preserves complete long business values and custom cell identity in the compact relationship', () => {
    const name = `business_${'long_name_'.repeat(30)}`;
    const section: NodePropertySection = {
      id: 'inputs-outputs',
      label: 'Inputs / Outputs',
      rows: [],
      tableRows: [
        {
          id: 'output:stable-edge-identity',
          cells: {
            direction: 'Output',
            node: name,
            nodeId: 'private-node-identity',
            relation: 'Lineage',
            connection: 'postgres · local-postgres-proof',
          },
        },
      ],
    };
    const original = structuredClone(section);
    const renderTableCell = vi.fn<NonNullable<NodePropertyTableProps['renderTableCell']>>(
      (context) => (context.columnKey === 'node' ? <em>{context.value}</em> : undefined)
    );
    ({ container, root } = renderSection(section, renderTableCell));
    expect(
      container.querySelector('[data-slot="node-property-relationship-node"] em')?.textContent
    ).toBe(name);
    expect(
      container.querySelector('[data-slot="node-property-relationship-connection"]')?.textContent
    ).toBe('postgres · local-postgres-proof');
    expect(renderTableCell).toHaveBeenCalledWith({
      sectionId: 'inputs-outputs',
      rowId: 'output:stable-edge-identity',
      columnKey: 'node',
      value: name,
    });
    expect(
      container.querySelectorAll('[data-slot="node-property-relationship-node"] em')
    ).toHaveLength(1);
    expect(container.textContent).not.toContain('private-node-identity');
    expect(section).toEqual(original);
  });

  it('preserves complete business column details while keeping canonical references private', () => {
    const section: NodePropertySection = {
      id: 'columns',
      label: 'Columns',
      rows: [],
      columnLabels: { reference: 'Referencia' },
      tableRows: [
        {
          id: 'dvt_fld_private_event_identity',
          cells: {
            name: 'event_identifier_with_a_long_name',
            type: 'text',
            nullable: 'not null',
            source: 'auth_audit_events',
            key: 'Primary key',
            default: "'unknown'",
            description: 'Unique event identifier',
            selected: 'Included',
            reference: 'src_postgres_dvt_raw_auth_audit_events.event_identifier',
          },
        },
      ],
    };
    const original = structuredClone(section);
    ({ container, root } = renderSection(section));

    const record = container.querySelector('[data-slot="node-property-column-record"]');
    const values = Array.from(record?.querySelectorAll('dd') ?? []);
    const disclosure = record?.querySelector<HTMLDetailsElement>('details');
    const trigger = disclosure?.querySelector('summary');

    expect(container.querySelector('table')).toBeNull();
    expect(disclosure?.open).toBe(false);
    expect(trigger?.textContent).toBe('event_identifier_with_a_long_name');
    expect(record?.textContent).not.toContain('Referencia');
    expect(record?.textContent).not.toContain('dvt_fld_private_event_identity');
    expect(record?.textContent).not.toContain(
      'src_postgres_dvt_raw_auth_audit_events.event_identifier'
    );
    expect(values.map((value) => value.textContent)).toEqual([
      'text',
      'not null',
      'auth_audit_events',
      'Primary key',
      "'unknown'",
      'Unique event identifier',
      'Included',
    ]);
    expect(section).toEqual(original);
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
