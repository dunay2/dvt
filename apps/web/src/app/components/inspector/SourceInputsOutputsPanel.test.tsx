// @vitest-environment jsdom

import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { SourceInputsOutputsPanel } from './SourceInputsOutputsPanel';
import type { NodePropertySection } from './nodePropertiesReadModel';

const sourceNode: CanonicalNode = {
  id: 'source.auth',
  name: 'auth_audit_events',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'local-postgres-proof',
        provider: 'postgres',
      },
      sourceObjectId: 'relation/dvt/auth_audit_events',
    },
  },
};

const section: NodePropertySection = {
  id: 'inputs-outputs',
  label: 'Inputs / Outputs',
  rows: [],
  tableRows: [
    {
      id: 'input:edge-upstream',
      cells: {
        direction: 'Input',
        node: 'seed_events',
        nodeId: 'raw-upstream-id',
        relation: 'lineage',
      },
    },
    {
      id: 'output:edge-model-1',
      cells: {
        direction: 'Output',
        node: 'Model 1',
        nodeId: 'model-1-internal-id',
        relation: 'lineage',
      },
    },
    {
      id: 'output:edge-check',
      cells: {
        direction: 'Output',
        node: 'Audit check',
        nodeId: 'check-internal-id',
        relation: 'validation',
      },
    },
  ],
};

describe('SourceInputsOutputsPanel', () => {
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

  function render(targetSection: NodePropertySection = section): void {
    act(() => root.render(<SourceInputsOutputsPanel node={sourceNode} section={targetSection} />));
  }

  it('groups actual Canvas inputs and outputs without synthesizing the physical Source origin', () => {
    render();

    expect(container.textContent).toContain('Inputs 1');
    expect(container.textContent).toContain('Outputs 2');
    expect(container.querySelectorAll('[data-slot="source-relationship-row"]')).toHaveLength(3);
    expect(container.textContent).not.toContain('local-postgres-proof');
    expect(container.textContent).not.toContain('postgres');
  });

  it('shows useful selected relationship facts but keeps internal node ids out of the normal detail', () => {
    render();

    const firstOutput = container.querySelector<HTMLButtonElement>(
      '[data-relationship-id="output:edge-model-1"]'
    )!;
    act(() => fireEvent.click(firstOutput));

    const detail = container.querySelector('[data-slot="source-relationship-detail"]');
    expect(detail?.textContent).toContain('Model 1');
    expect(detail?.textContent).toContain('Outgoing');
    expect(detail?.textContent).toContain('auth_audit_events');
    expect(detail?.textContent).toContain('lineage');
    expect(detail?.textContent).not.toContain('model-1-internal-id');
  });

  it('uses roving keyboard selection across incoming and outgoing relationships', () => {
    render();

    const upstream = container.querySelector<HTMLButtonElement>(
      '[data-relationship-id="input:edge-upstream"]'
    )!;
    const firstOutput = container.querySelector<HTMLButtonElement>(
      '[data-relationship-id="output:edge-model-1"]'
    )!;
    expect(upstream.getAttribute('aria-selected')).toBe('true');
    expect(upstream.tabIndex).toBe(0);
    expect(firstOutput.tabIndex).toBe(-1);

    act(() => {
      upstream.focus();
      fireEvent.keyDown(upstream, { key: 'ArrowDown' });
    });

    expect(firstOutput.getAttribute('aria-selected')).toBe('true');
    expect(firstOutput.tabIndex).toBe(0);
    expect(document.activeElement).toBe(firstOutput);
  });

  it('renders zero/zero topology coherently instead of inventing an input', () => {
    render({ ...section, tableRows: [] });

    expect(container.textContent).toContain('Inputs 0');
    expect(container.textContent).toContain('Outputs 0');
    expect(container.textContent).toContain('No Canvas connections are recorded for this Source.');
    expect(container.querySelectorAll('[data-slot="source-relationship-row"]')).toHaveLength(0);
  });
});
