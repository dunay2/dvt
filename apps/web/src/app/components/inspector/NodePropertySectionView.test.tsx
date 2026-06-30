// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { NodePropertySectionView } from './NodePropertySectionView';
import type { NodePropertySection } from './nodePropertiesReadModel';

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
  });

  it('renders scalar rows and code blocks without involving the tabs coordinator', () => {
    ({ container, root } = renderSection({
      id: 'general',
      label: 'General',
      rows: [{ label: 'Status', value: 'Ready' }],
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
          }}
          slots={{ code: 'node-section-code', sectionPrefix: 'node-section' }}
          surface="workbench"
        />
      );
    });

    expect(container.querySelector('[data-slot="node-section-code"]')?.textContent).toBe(
      'select * from orders'
    );
  });
});
