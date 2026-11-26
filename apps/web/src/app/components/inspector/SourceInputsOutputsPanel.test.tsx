// @vitest-environment jsdom

import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import { SourceInputsOutputsPanel } from './SourceInputsOutputsPanel';
import type { NodePropertySection } from './nodePropertiesContracts';

const source = { id: 'source.audit' };
const workspace = 'tenant::project::dev';
const modelOutput = 'output:edge-model';
const checkOutput = 'output:edge-check';
const section: NodePropertySection = {
  id: 'inputs-outputs',
  label: 'Outputs',
  rows: [],
  emptyState: 'This source has no outgoing connections in the Canvas.',
  tableRows: [
    {
      id: 'input:edge-upstream',
      cells: { node: 'seed_events', relation: 'lineage' },
    },
    {
      id: modelOutput,
      cells: { node: 'Monthly audited order totals by customer', relation: 'lineage' },
    },
    {
      id: checkOutput,
      cells: { node: 'Audit check', relation: 'validation' },
    },
  ],
};

describe('SourceInputsOutputsPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    useCanvasInteractionStore.setState({ _hasHydrated: true, canvasLayouts: {} });
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

  function render(targetSection: NodePropertySection = section, canReorder = false): void {
    act(() =>
      root.render(
        <SourceInputsOutputsPanel
          node={source}
          section={targetSection}
          canReorder={canReorder}
          workspaceLayoutKey={workspace}
        />
      )
    );
  }

  function outputRows(): HTMLLIElement[] {
    return Array.from(container.querySelectorAll<HTMLLIElement>('ul[aria-label="Outputs"] > li'));
  }

  function projectedOrder(): (string | undefined)[] {
    return outputRows().map((row) => row.dataset.relationshipId);
  }

  it('lists each downstream business name and relation once, omitting inbound records', () => {
    render({
      ...section,
      tableRows: [
        ...section.tableRows,
        { id: 'output:empty', cells: { node: '   ' } },
        { id: 'invalid:identity', cells: { node: 'Unknown relation' } },
      ],
    });

    expect(outputRows().map((row) => [...row.children].map((cell) => cell.textContent))).toEqual([
      ['Monthly audited order totals by customer', 'lineage'],
      ['Audit check', 'validation'],
    ]);
    expect(container.textContent).not.toContain('seed_events');
    expect(container.querySelector('button, [role="listbox"], [aria-selected]')).toBeNull();
  });

  it('reorders outputs by pointer and keyboard while keeping focus and persisting layout order', () => {
    render(section, true);
    const [model, check] = outputRows() as [HTMLLIElement, HTMLLIElement];
    vi.spyOn(check, 'getBoundingClientRect').mockReturnValue({ top: 0, height: 40 } as DOMRect);
    const dataTransfer = { effectAllowed: 'none', dropEffect: 'none', setData: vi.fn() };

    act(() => {
      fireEvent.dragStart(model, { dataTransfer });
      fireEvent.dragOver(check, { clientY: 36, dataTransfer });
    });
    expect(check.dataset.dropPlacement).toBe('after');
    expect(check.querySelector('[data-slot="source-relationship-drop-indicator"]')).not.toBeNull();
    act(() => {
      fireEvent.drop(check, { clientY: 36, dataTransfer });
    });

    expect(projectedOrder()).toEqual([checkOutput, modelOutput]);
    expect(document.activeElement).toBe(model);

    act(() => {
      check.focus();
      fireEvent.keyDown(check, { key: 'ArrowDown', altKey: true });
    });

    expect(document.activeElement).toBe(check);
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Moved Audit check.');
    expect(projectedOrder()).toEqual([modelOutput, checkOutput]);
    expect(
      useCanvasInteractionStore.getState().canvasLayouts[workspace]?.inspectorListOrdersByNode?.[
        source.id
      ]?.outputs
    ).toEqual([modelOutput, checkOutput]);
    expect(section.tableRows.map((row) => row.id)).toEqual([
      'input:edge-upstream',
      modelOutput,
      checkOutput,
    ]);
  });

  it.each([
    { writable: false, rows: section.tableRows },
    { writable: true, rows: section.tableRows.filter((row) => row.id === modelOutput) },
  ])(
    'omits sorting affordances when writing is disabled or only one row exists',
    ({ writable, rows }) => {
      render({ ...section, tableRows: rows }, writable);
      expect(container.querySelector('[data-slot="source-relationship-drag-handle"]')).toBeNull();
      expect(outputRows().every((row) => !row.draggable && !row.hasAttribute('tabindex'))).toBe(
        true
      );
    }
  );

  it('shows a useful empty message when the source is not used by another node', () => {
    render({ ...section, tableRows: [] });
    expect(container.textContent).toBe(section.emptyState);
    expect(container.querySelector('ul')).toBeNull();
  });
});
